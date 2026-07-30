//! Minimal gRPC server-reflection client (v1 with v1alpha fallback), mirroring
//! the Go backend's grpcreflect.NewClientAuto behaviour. Descriptors are
//! fetched per call, never cached, matching the Go implementation.

use std::collections::{HashMap, HashSet};

use prost::Message;
use prost_reflect::DescriptorPool;
use prost_types::FileDescriptorProto;
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;
use tonic::transport::Channel;
use tonic::{Code, Request, Status};

use super::codec::ProstCodec;

// Hand-rolled subset of grpc/reflection/v1/reflection.proto — identical wire
// shape in v1 and v1alpha, so one set of types serves both.
#[derive(Clone, PartialEq, Message)]
pub struct ServerReflectionRequest {
    #[prost(string, tag = "1")]
    pub host: String,
    #[prost(oneof = "reflection_request::MessageRequest", tags = "3, 4")]
    pub message_request: Option<reflection_request::MessageRequest>,
}

pub mod reflection_request {
    #[derive(Clone, PartialEq, prost::Oneof)]
    pub enum MessageRequest {
        #[prost(string, tag = "3")]
        FileByFilename(String),
        #[prost(string, tag = "4")]
        FileContainingSymbol(String),
    }
}

#[derive(Clone, PartialEq, Message)]
pub struct ServerReflectionResponse {
    #[prost(oneof = "reflection_response::MessageResponse", tags = "4, 7")]
    pub message_response: Option<reflection_response::MessageResponse>,
}

pub mod reflection_response {
    #[derive(Clone, PartialEq, prost::Oneof)]
    pub enum MessageResponse {
        #[prost(message, tag = "4")]
        FileDescriptorResponse(super::FileDescriptorResponse),
        #[prost(message, tag = "7")]
        ErrorResponse(super::ErrorResponse),
    }
}

#[derive(Clone, PartialEq, Message)]
pub struct FileDescriptorResponse {
    #[prost(bytes = "vec", repeated, tag = "1")]
    pub file_descriptor_proto: Vec<Vec<u8>>,
}

#[derive(Clone, PartialEq, Message)]
pub struct ErrorResponse {
    #[prost(int32, tag = "1")]
    pub error_code: i32,
    #[prost(string, tag = "2")]
    pub error_message: String,
}

const V1_METHOD: &str = "/grpc.reflection.v1.ServerReflection/ServerReflectionInfo";
const V1ALPHA_METHOD: &str = "/grpc.reflection.v1alpha.ServerReflection/ServerReflectionInfo";

/// Fetch the descriptor pool containing `symbol` (and the transitive closure
/// of its file's dependencies) from the server's reflection service.
pub async fn descriptor_pool_for_symbol(
    channel: Channel,
    symbol: &str,
) -> Result<DescriptorPool, Status> {
    match fetch(channel.clone(), V1_METHOD, symbol).await {
        Err(st) if st.code() == Code::Unimplemented => fetch(channel, V1ALPHA_METHOD, symbol).await,
        other => other,
    }
}

async fn fetch(
    channel: Channel,
    method: &'static str,
    symbol: &str,
) -> Result<DescriptorPool, Status> {
    let mut grpc = tonic::client::Grpc::new(channel);
    grpc.ready()
        .await
        .map_err(|e| Status::unavailable(format!("reflection service not ready: {e}")))?;

    let (tx, rx) = tokio::sync::mpsc::channel::<ServerReflectionRequest>(16);
    let path = http::uri::PathAndQuery::from_static(method);
    let codec = ProstCodec::<ServerReflectionRequest, ServerReflectionResponse>::default();

    let mut pending = 0usize;
    let mut requested: HashSet<String> = HashSet::new();

    tx.send(ServerReflectionRequest {
        host: String::new(),
        message_request: Some(reflection_request::MessageRequest::FileContainingSymbol(
            symbol.to_string(),
        )),
    })
    .await
    .map_err(|e| Status::internal(format!("send reflection request: {e}")))?;
    pending += 1;

    let response = grpc
        .streaming(Request::new(ReceiverStream::new(rx)), path, codec)
        .await?;
    let mut stream = response.into_inner();

    let mut files: HashMap<String, FileDescriptorProto> = HashMap::new();

    while pending > 0 {
        let msg = match stream.next().await {
            Some(Ok(msg)) => msg,
            Some(Err(st)) => return Err(st),
            None => {
                return Err(Status::internal(
                    "reflection stream closed before all responses arrived",
                ))
            }
        };
        pending -= 1;

        match msg.message_response {
            Some(reflection_response::MessageResponse::FileDescriptorResponse(fdr)) => {
                for raw in fdr.file_descriptor_proto {
                    let fd = FileDescriptorProto::decode(raw.as_slice())
                        .map_err(|e| Status::internal(format!("decode file descriptor: {e}")))?;
                    if let Some(name) = fd.name.clone() {
                        files.insert(name, fd);
                    }
                }
                // Request any dependencies we haven't seen yet.
                let missing: Vec<String> = files
                    .values()
                    .flat_map(|fd| fd.dependency.iter())
                    .filter(|dep| !files.contains_key(*dep) && !requested.contains(*dep))
                    .cloned()
                    .collect();
                for dep in missing {
                    requested.insert(dep.clone());
                    tx.send(ServerReflectionRequest {
                        host: String::new(),
                        message_request: Some(reflection_request::MessageRequest::FileByFilename(
                            dep,
                        )),
                    })
                    .await
                    .map_err(|e| Status::internal(format!("send reflection request: {e}")))?;
                    pending += 1;
                }
            }
            Some(reflection_response::MessageResponse::ErrorResponse(err)) => {
                return Err(Status::new(
                    Code::from_i32(err.error_code),
                    err.error_message,
                ));
            }
            None => {
                return Err(Status::internal("unexpected reflection response type"));
            }
        }
    }
    drop(tx);

    build_pool(files)
}

/// Add files to a pool in dependency order (reflection responses arrive in
/// arbitrary order).
fn build_pool(files: HashMap<String, FileDescriptorProto>) -> Result<DescriptorPool, Status> {
    let mut pool = DescriptorPool::new();
    let mut remaining: Vec<FileDescriptorProto> = files.into_values().collect();

    while !remaining.is_empty() {
        let mut progressed = false;
        let mut deferred = Vec::new();
        for fd in remaining {
            let ready = fd
                .dependency
                .iter()
                .all(|dep| pool.get_file_by_name(dep).is_some());
            if ready {
                pool.add_file_descriptor_proto(fd)
                    .map_err(|e| Status::internal(format!("build descriptors: {e}")))?;
                progressed = true;
            } else {
                deferred.push(fd);
            }
        }
        if !progressed {
            return Err(Status::internal(
                "reflection response has unresolvable dependencies",
            ));
        }
        remaining = deferred;
    }
    Ok(pool)
}
