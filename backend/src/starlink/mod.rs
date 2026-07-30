//! Dynamic Starlink dish client. Like the Go backend, no dish protos are
//! compiled in: service and message descriptors are fetched from the device's
//! gRPC reflection endpoint on every call, so the client keeps working across
//! firmware schema changes.

mod codec;
mod reflection;

use std::collections::{BTreeMap, HashSet};
use std::time::Duration;

use prost_reflect::{
    DescriptorPool, DynamicMessage, FieldDescriptor, Kind, MessageDescriptor, MethodDescriptor,
    SerializeOptions, ServiceDescriptor,
};
use serde::Serialize;
use serde_json::value::RawValue;
use tonic::transport::{Channel, Endpoint};
use tonic::{Request, Status};

use codec::DynamicCodec;

pub const DEVICE_SERVICE: &str = "SpaceX.API.Device.Device";
pub const DEVICE_HANDLE_METHOD: &str = "SpaceX.API.Device.Device.Handle";
const REQUEST_TYPE: &str = "SpaceX.API.Device.Request";

const DEFAULT_CALL_TIMEOUT: Duration = Duration::from_secs(10);
const MAX_DESCRIBE_DEPTH: usize = 6;

#[derive(Debug, thiserror::Error)]
pub enum DishError {
    /// A gRPC status returned by the device (or the transport). The handler
    /// layer classifies these into user-facing HTTP errors.
    #[error("rpc {:?}: {}", .0.code(), .0.message())]
    Rpc(#[from] Status),
    /// A local failure translating between JSON and protobuf, or resolving
    /// descriptors.
    #[error("{0}")]
    Protocol(String),
}

fn protocol(context: &str, err: impl std::fmt::Display) -> DishError {
    DishError::Protocol(format!("{context}: {err}"))
}

#[derive(Debug, Serialize)]
pub struct Schema {
    pub service: String,
    pub methods: Vec<String>,
    pub requests: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageInfo {
    pub name: String,
    pub fields: Vec<FieldInfo>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FieldInfo {
    pub name: String,
    pub number: i32,
    #[serde(rename = "type")]
    pub type_name: String,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub repeated: bool,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub oneof: String,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub enum_values: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<Box<MessageInfo>>,
}

pub struct DishService {
    default_address: String,
}

impl DishService {
    pub fn new(default_address: String) -> Self {
        Self { default_address }
    }

    pub fn default_address(&self) -> &str {
        &self.default_address
    }

    fn resolve<'a>(&'a self, address: &'a str) -> &'a str {
        if address.is_empty() {
            &self.default_address
        } else {
            address
        }
    }

    /// Invoke `Device.Handle` with a request holding a single oneof entry,
    /// e.g. `{"get_status": {}}`. The payload is passed through as raw JSON.
    pub async fn call(
        &self,
        address: &str,
        oneof_key: &str,
        payload: Option<&RawValue>,
    ) -> Result<String, DishError> {
        let body = handle_request_body(oneof_key, payload)?;
        self.invoke_json(address, &body).await
    }

    /// Invoke `Device.Handle` with a caller-supplied request body.
    pub async fn invoke(&self, address: &str, request: &RawValue) -> Result<String, DishError> {
        self.invoke_json(address, request.get()).await
    }

    pub async fn describe(&self, address: &str) -> Result<Schema, DishError> {
        let address = self.resolve(address);
        with_timeout(async {
            let conn = DishConnection::open(address).await?;
            conn.describe()
        })
        .await
    }

    pub async fn describe_request(
        &self,
        address: &str,
        oneof: &str,
    ) -> Result<MessageInfo, DishError> {
        let address = self.resolve(address);
        with_timeout(async {
            let conn = DishConnection::open(address).await?;
            conn.describe_request(oneof)
        })
        .await
    }

    async fn invoke_json(&self, address: &str, req_json: &str) -> Result<String, DishError> {
        let address = self.resolve(address);
        with_timeout(async {
            let conn = DishConnection::open(address).await?;
            conn.invoke(DEVICE_HANDLE_METHOD, req_json).await
        })
        .await
    }
}

fn handle_request_body(oneof_key: &str, payload: Option<&RawValue>) -> Result<String, DishError> {
    let empty;
    let payload = match payload {
        Some(p) => p,
        None => {
            empty = RawValue::from_string("{}".to_string()).expect("static JSON is valid");
            &empty
        }
    };
    serde_json::to_string(&BTreeMap::from([(oneof_key, payload)]))
        .map_err(|e| protocol("encode request", e))
}

/// Apply the Go backend's per-call deadline to connect + reflection + invoke.
async fn with_timeout<T>(
    fut: impl std::future::Future<Output = Result<T, DishError>>,
) -> Result<T, DishError> {
    tokio::time::timeout(DEFAULT_CALL_TIMEOUT, fut)
        .await
        .unwrap_or_else(|_| {
            Err(DishError::Rpc(Status::deadline_exceeded(
                "context deadline exceeded",
            )))
        })
}

/// A connection to one device: a channel plus the descriptors fetched from
/// its reflection service. Descriptors are re-fetched per call (never cached),
/// matching the Go implementation.
struct DishConnection {
    channel: Channel,
    pool: DescriptorPool,
}

impl DishConnection {
    async fn open(address: &str) -> Result<Self, DishError> {
        let endpoint = Endpoint::from_shared(format!("http://{address}"))
            .map_err(|e| protocol(&format!("dial {address:?}"), e))?;
        let channel = endpoint
            .connect()
            .await
            .map_err(|e| Status::unavailable(format!("connection error: {e}")))?;
        let pool = reflection::descriptor_pool_for_symbol(channel.clone(), DEVICE_SERVICE).await?;
        Ok(Self { channel, pool })
    }

    async fn invoke(&self, method: &str, req_json: &str) -> Result<String, DishError> {
        let method = self.find_method(method)?;
        let request = decode_request(method.input(), req_json)?;

        let path = http::uri::PathAndQuery::from_maybe_shared(format!(
            "/{}/{}",
            method.parent_service().full_name(),
            method.name()
        ))
        .map_err(|e| protocol("invoke", e))?;

        let mut grpc = tonic::client::Grpc::new(self.channel.clone());
        grpc.ready()
            .await
            .map_err(|e| Status::unavailable(format!("connection error: {e}")))?;
        let response = grpc
            .unary(
                Request::new(request),
                path,
                DynamicCodec::new(method.output()),
            )
            .await?;

        encode_response(response.into_inner())
    }

    fn describe(&self) -> Result<Schema, DishError> {
        let service = self.find_service(DEVICE_SERVICE)?;
        let methods = service.methods().map(|m| m.name().to_string()).collect();
        let requests = self
            .pool
            .get_message_by_name(REQUEST_TYPE)
            .map(|md| md.fields().map(|f| f.name().to_string()).collect())
            .unwrap_or_default();
        Ok(Schema {
            service: DEVICE_SERVICE.to_string(),
            methods,
            requests,
        })
    }

    fn describe_request(&self, oneof: &str) -> Result<MessageInfo, DishError> {
        let message = self.pool.get_message_by_name(REQUEST_TYPE).ok_or_else(|| {
            DishError::Protocol(format!("find request type: {REQUEST_TYPE:?} not found"))
        })?;
        let field = message
            .get_field_by_name(oneof)
            .ok_or_else(|| DishError::Protocol(format!("unknown request {oneof:?}")))?;
        match field.kind() {
            Kind::Message(inner) => {
                let mut seen = HashSet::from([inner.full_name().to_string()]);
                Ok(describe_message(&inner, 0, &mut seen))
            }
            _ => Ok(MessageInfo {
                name: REQUEST_TYPE.to_string(),
                fields: vec![field_info(&field)],
            }),
        }
    }

    fn find_service(&self, name: &str) -> Result<ServiceDescriptor, DishError> {
        self.pool
            .get_service_by_name(name)
            .ok_or_else(|| DishError::Protocol(format!("find service: symbol {name:?} not found")))
    }

    /// Resolve a fully-qualified method like `SpaceX.API.Device.Device.Handle`
    /// (also accepts a `/` separator before the method name, like grpcurl).
    fn find_method(&self, method: &str) -> Result<MethodDescriptor, DishError> {
        let sep = method
            .rfind(['.', '/'])
            .ok_or_else(|| DishError::Protocol(format!("invalid method name {method:?}")))?;
        let (service_name, method_name) = (&method[..sep], &method[sep + 1..]);
        let service = self.find_service(service_name)?;
        let found = service.methods().find(|m| m.name() == method_name);
        found.ok_or_else(|| {
            DishError::Protocol(format!(
                "service {service_name} has no method {method_name:?}"
            ))
        })
    }
}

fn decode_request(
    descriptor: MessageDescriptor,
    req_json: &str,
) -> Result<DynamicMessage, DishError> {
    let body = req_json.trim();
    if body.is_empty() {
        return Ok(DynamicMessage::new(descriptor));
    }
    let mut de = serde_json::Deserializer::from_str(body);
    let message = DynamicMessage::deserialize(descriptor, &mut de)
        .map_err(|e| protocol("prepare request", e))?;
    de.end().map_err(|e| protocol("prepare request", e))?;
    Ok(message)
}

/// Serialize a response to proto3 JSON with unpopulated fields emitted,
/// matching Go's `protojson.MarshalOptions{EmitUnpopulated: true}`.
fn encode_response(message: DynamicMessage) -> Result<String, DishError> {
    let mut buf = Vec::with_capacity(1024);
    let mut ser = serde_json::Serializer::new(&mut buf);
    message
        .serialize_with_options(
            &mut ser,
            &SerializeOptions::new().skip_default_fields(false),
        )
        .map_err(|e| protocol("format response", e))?;
    String::from_utf8(buf).map_err(|e| protocol("format response", e))
}

fn describe_message(
    descriptor: &MessageDescriptor,
    depth: usize,
    seen: &mut HashSet<String>,
) -> MessageInfo {
    let mut info = MessageInfo {
        name: descriptor.full_name().to_string(),
        fields: Vec::new(),
    };
    for field in descriptor.fields() {
        let mut fi = field_info(&field);
        if let Kind::Message(inner) = field.kind() {
            let name = inner.full_name().to_string();
            if depth < MAX_DESCRIBE_DEPTH && !seen.contains(&name) {
                seen.insert(name.clone());
                fi.message = Some(Box::new(describe_message(&inner, depth + 1, seen)));
                seen.remove(&name);
            }
        }
        info.fields.push(fi);
    }
    info
}

fn field_info(field: &FieldDescriptor) -> FieldInfo {
    let enum_values = match field.kind() {
        Kind::Enum(en) => en.values().map(|v| v.name().to_string()).collect(),
        _ => Vec::new(),
    };
    FieldInfo {
        name: field.name().to_string(),
        number: field.number() as i32,
        type_name: field_type_name(field),
        repeated: field.is_list() || field.is_map(),
        oneof: field
            .containing_oneof()
            .map(|oo| oo.name().to_string())
            .unwrap_or_default(),
        enum_values,
        message: None,
    }
}

fn field_type_name(field: &FieldDescriptor) -> String {
    match field.kind() {
        Kind::Message(m) => m.full_name().to_string(),
        Kind::Enum(e) => e.full_name().to_string(),
        Kind::Double => "double".into(),
        Kind::Float => "float".into(),
        Kind::Int32 => "int32".into(),
        Kind::Int64 => "int64".into(),
        Kind::Uint32 => "uint32".into(),
        Kind::Uint64 => "uint64".into(),
        Kind::Sint32 => "sint32".into(),
        Kind::Sint64 => "sint64".into(),
        Kind::Fixed32 => "fixed32".into(),
        Kind::Fixed64 => "fixed64".into(),
        Kind::Sfixed32 => "sfixed32".into(),
        Kind::Sfixed64 => "sfixed64".into(),
        Kind::Bool => "bool".into(),
        Kind::String => "string".into(),
        Kind::Bytes => "bytes".into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn handle_request_body_wraps_payload() {
        let payload = RawValue::from_string("{\"unstow\":true}".to_string()).unwrap();
        let body = handle_request_body("dish_stow", Some(&payload)).unwrap();
        assert_eq!(body, "{\"dish_stow\":{\"unstow\":true}}");
    }

    #[test]
    fn handle_request_body_defaults_to_empty_object() {
        let body = handle_request_body("get_status", None).unwrap();
        assert_eq!(body, "{\"get_status\":{}}");
    }

    #[test]
    fn rpc_error_display_matches_go_shape() {
        let err = DishError::Rpc(Status::unavailable("boom"));
        assert_eq!(err.to_string(), "rpc Unavailable: boom");
    }
}
