/** Minimal typings for heic-decode 2.1.0 (libheif compiled to WebAssembly); the package ships none. */
declare module 'heic-decode' {
  interface HeicDecodeInput {
    buffer: Uint8Array;
  }

  /** RGBA pixels with the container's rotation/mirroring (irot/imir) already applied. */
  interface DecodedHeicImage {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  }

  /** A top-level image whose dimensions are known before its pixels are decoded. */
  interface HeicImageHandle {
    width: number;
    height: number;
    decode(): Promise<DecodedHeicImage>;
  }

  interface HeicImageList extends Array<HeicImageHandle> {
    /** Frees the WebAssembly memory held by every handle; call once done. */
    dispose(): void;
  }

  function decode(input: HeicDecodeInput): Promise<DecodedHeicImage>;

  namespace decode {
    function all(input: HeicDecodeInput): Promise<HeicImageList>;
  }

  export = decode;
}
