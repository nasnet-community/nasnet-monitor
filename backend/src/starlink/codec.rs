use std::marker::PhantomData;

use prost::Message;
use prost_reflect::{DynamicMessage, MessageDescriptor};
use tonic::codec::{Codec, DecodeBuf, Decoder, EncodeBuf, Encoder};
use tonic::Status;

/// Codec for statically-typed prost messages (used for the reflection RPC).
pub struct ProstCodec<E, D> {
    _marker: PhantomData<(E, D)>,
}

impl<E, D> Default for ProstCodec<E, D> {
    fn default() -> Self {
        Self {
            _marker: PhantomData,
        }
    }
}

impl<E, D> Codec for ProstCodec<E, D>
where
    E: Message + Send + 'static,
    D: Message + Default + Send + 'static,
{
    type Encode = E;
    type Decode = D;
    type Encoder = ProstEncoder<E>;
    type Decoder = ProstDecoder<D>;

    fn encoder(&mut self) -> Self::Encoder {
        ProstEncoder(PhantomData)
    }

    fn decoder(&mut self) -> Self::Decoder {
        ProstDecoder(PhantomData)
    }
}

pub struct ProstEncoder<E>(PhantomData<E>);

impl<E: Message> Encoder for ProstEncoder<E> {
    type Item = E;
    type Error = Status;

    fn encode(&mut self, item: E, dst: &mut EncodeBuf<'_>) -> Result<(), Status> {
        item.encode(dst)
            .map_err(|e| Status::internal(format!("encode request: {e}")))
    }
}

pub struct ProstDecoder<D>(PhantomData<D>);

impl<D: Message + Default> Decoder for ProstDecoder<D> {
    type Item = D;
    type Error = Status;

    fn decode(&mut self, src: &mut DecodeBuf<'_>) -> Result<Option<D>, Status> {
        D::decode(src)
            .map(Some)
            .map_err(|e| Status::internal(format!("decode response: {e}")))
    }
}

/// Codec for dynamic messages resolved at runtime from reflection descriptors.
pub struct DynamicCodec {
    response: MessageDescriptor,
}

impl DynamicCodec {
    pub fn new(response: MessageDescriptor) -> Self {
        Self { response }
    }
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
            response: self.response.clone(),
        }
    }
}

pub struct DynamicEncoder;

impl Encoder for DynamicEncoder {
    type Item = DynamicMessage;
    type Error = Status;

    fn encode(&mut self, item: DynamicMessage, dst: &mut EncodeBuf<'_>) -> Result<(), Status> {
        item.encode(dst)
            .map_err(|e| Status::internal(format!("encode request: {e}")))
    }
}

pub struct DynamicDecoder {
    response: MessageDescriptor,
}

impl Decoder for DynamicDecoder {
    type Item = DynamicMessage;
    type Error = Status;

    fn decode(&mut self, src: &mut DecodeBuf<'_>) -> Result<Option<DynamicMessage>, Status> {
        DynamicMessage::decode(self.response.clone(), src)
            .map(Some)
            .map_err(|e| Status::internal(format!("decode response: {e}")))
    }
}
