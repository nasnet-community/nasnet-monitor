//! In-process mock Starlink dish: gRPC reflection (v1 + v1alpha) plus a
//! dynamic `SpaceX.API.Device.Device/Handle` service returning a canned
//! `get_status` response. Mirrors the Go backend's mock_test.go fixture.

use std::task::{Context, Poll};

use prost::Message;
use prost_reflect::{DescriptorPool, DynamicMessage, MessageDescriptor, Value};
use prost_types::{
    field_descriptor_proto::{Label, Type},
    DescriptorProto, FieldDescriptorProto, FileDescriptorProto, FileDescriptorSet,
    MethodDescriptorProto, OneofDescriptorProto, ServiceDescriptorProto,
};
use tonic::codec::{Codec, DecodeBuf, Decoder, EncodeBuf, Encoder};
use tonic::server::NamedService;
use tonic::Status;

const DEVICE_PROTO_PATH: &str = "spacex/device_mock.proto";

/// Start the mock on an ephemeral port and return its `host:port`.
pub async fn spawn() -> String {
    let fds = FileDescriptorSet {
        file: vec![device_fdp()],
    };
    let pool = DescriptorPool::from_file_descriptor_set(fds.clone()).expect("valid mock proto");

    let reflection_v1 = tonic_reflection::server::Builder::configure()
        .register_file_descriptor_set(fds.clone())
        .build_v1()
        .expect("reflection v1");
    let reflection_v1alpha = tonic_reflection::server::Builder::configure()
        .register_file_descriptor_set(fds)
        .build_v1alpha()
        .expect("reflection v1alpha");

    let device = MockDevice::new(&pool);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind mock dish");
    let addr = listener.local_addr().expect("mock addr");

    tokio::spawn(async move {
        tonic::transport::Server::builder()
            .add_service(reflection_v1)
            .add_service(reflection_v1alpha)
            .add_service(device)
            .serve_with_incoming(tokio_stream::wrappers::TcpListenerStream::new(listener))
            .await
            .expect("mock dish server");
    });

    format!("127.0.0.1:{}", addr.port())
}

#[derive(Clone)]
struct MockDevice {
    request: MessageDescriptor,
    canned: DynamicMessage,
}

impl MockDevice {
    fn new(pool: &DescriptorPool) -> Self {
        let request = pool
            .get_message_by_name("SpaceX.API.Device.Request")
            .expect("Request descriptor");
        let response = pool
            .get_message_by_name("SpaceX.API.Device.Response")
            .expect("Response descriptor");
        let get_status = pool
            .get_message_by_name("SpaceX.API.Device.GetStatusResponse")
            .expect("GetStatusResponse descriptor");

        let mut status = DynamicMessage::new(get_status);
        status.set_field_by_name("id", Value::String("dishy-test".to_string()));
        status.set_field_by_name("hardware_version", Value::String("rev3_proto3".to_string()));
        let mut canned = DynamicMessage::new(response);
        canned.set_field_by_name("get_status", Value::Message(status));

        Self { request, canned }
    }
}

impl NamedService for MockDevice {
    const NAME: &'static str = "SpaceX.API.Device.Device";
}

impl tower::Service<http::Request<tonic::body::Body>> for MockDevice {
    type Response = http::Response<tonic::body::Body>;
    type Error = std::convert::Infallible;
    type Future = std::pin::Pin<
        Box<dyn std::future::Future<Output = Result<Self::Response, Self::Error>> + Send>,
    >;

    fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, req: http::Request<tonic::body::Body>) -> Self::Future {
        let request = self.request.clone();
        let canned = self.canned.clone();
        Box::pin(async move {
            match req.uri().path() {
                "/SpaceX.API.Device.Device/Handle" => {
                    let mut grpc = tonic::server::Grpc::new(DynamicCodec { request });
                    Ok(grpc.unary(HandleSvc { canned }, req).await)
                }
                path => {
                    let status = Status::unimplemented(format!("unknown method {path}"));
                    Ok(status.into_http())
                }
            }
        })
    }
}

struct HandleSvc {
    canned: DynamicMessage,
}

impl tonic::server::UnaryService<DynamicMessage> for HandleSvc {
    type Response = DynamicMessage;
    type Future = std::future::Ready<Result<tonic::Response<DynamicMessage>, Status>>;

    fn call(&mut self, _request: tonic::Request<DynamicMessage>) -> Self::Future {
        std::future::ready(Ok(tonic::Response::new(self.canned.clone())))
    }
}

/// Server-side codec: decodes requests into dynamic messages of the Request
/// descriptor; encodes any dynamic message response.
struct DynamicCodec {
    request: MessageDescriptor,
}

impl Codec for DynamicCodec {
    type Encode = DynamicMessage;
    type Decode = DynamicMessage;
    type Encoder = DynamicEncoder;
    type Decoder = DynamicDecoder;

    fn encoder(&mut self) -> Self::Encoder {
        DynamicEncoder
    }

    fn decoder(&mut self) -> Self::Decoder {
        DynamicDecoder {
            request: self.request.clone(),
        }
    }
}

struct DynamicEncoder;

impl Encoder for DynamicEncoder {
    type Item = DynamicMessage;
    type Error = Status;

    fn encode(&mut self, item: DynamicMessage, dst: &mut EncodeBuf<'_>) -> Result<(), Status> {
        item.encode(dst)
            .map_err(|e| Status::internal(e.to_string()))
    }
}

struct DynamicDecoder {
    request: MessageDescriptor,
}

impl Decoder for DynamicDecoder {
    type Item = DynamicMessage;
    type Error = Status;

    fn decode(&mut self, src: &mut DecodeBuf<'_>) -> Result<Option<DynamicMessage>, Status> {
        DynamicMessage::decode(self.request.clone(), src)
            .map(Some)
            .map_err(|e| Status::internal(e.to_string()))
    }
}

fn device_fdp() -> FileDescriptorProto {
    let string_field = |name: &str, number: i32| FieldDescriptorProto {
        name: Some(name.to_string()),
        number: Some(number),
        label: Some(Label::Optional as i32),
        r#type: Some(Type::String as i32),
        json_name: Some(json_name(name)),
        ..Default::default()
    };
    let oneof_msg = |name: &str, number: i32, type_name: &str| FieldDescriptorProto {
        name: Some(name.to_string()),
        number: Some(number),
        label: Some(Label::Optional as i32),
        r#type: Some(Type::Message as i32),
        type_name: Some(type_name.to_string()),
        oneof_index: Some(0),
        json_name: Some(json_name(name)),
        ..Default::default()
    };

    FileDescriptorProto {
        name: Some(DEVICE_PROTO_PATH.to_string()),
        package: Some("SpaceX.API.Device".to_string()),
        syntax: Some("proto3".to_string()),
        message_type: vec![
            DescriptorProto {
                name: Some("Request".to_string()),
                field: vec![oneof_msg(
                    "get_status",
                    1004,
                    ".SpaceX.API.Device.GetStatusRequest",
                )],
                oneof_decl: vec![OneofDescriptorProto {
                    name: Some("request".to_string()),
                    ..Default::default()
                }],
                ..Default::default()
            },
            DescriptorProto {
                name: Some("Response".to_string()),
                field: vec![oneof_msg(
                    "get_status",
                    1004,
                    ".SpaceX.API.Device.GetStatusResponse",
                )],
                oneof_decl: vec![OneofDescriptorProto {
                    name: Some("response".to_string()),
                    ..Default::default()
                }],
                ..Default::default()
            },
            DescriptorProto {
                name: Some("GetStatusRequest".to_string()),
                ..Default::default()
            },
            DescriptorProto {
                name: Some("GetStatusResponse".to_string()),
                field: vec![string_field("id", 1), string_field("hardware_version", 2)],
                ..Default::default()
            },
        ],
        service: vec![ServiceDescriptorProto {
            name: Some("Device".to_string()),
            method: vec![MethodDescriptorProto {
                name: Some("Handle".to_string()),
                input_type: Some(".SpaceX.API.Device.Request".to_string()),
                output_type: Some(".SpaceX.API.Device.Response".to_string()),
                ..Default::default()
            }],
            ..Default::default()
        }],
        ..Default::default()
    }
}

fn json_name(name: &str) -> String {
    let mut out = String::new();
    let mut upper_next = false;
    for c in name.chars() {
        if c == '_' {
            upper_next = true;
        } else if upper_next {
            out.extend(c.to_uppercase());
            upper_next = false;
        } else {
            out.push(c);
        }
    }
    out
}
