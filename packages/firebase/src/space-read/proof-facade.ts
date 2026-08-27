// Firebase-facing seam for the space V2 proof asset read (spec 079 §1).
//
// The facade returns raw, UNVALIDATED metadata fields on purpose: every check that decides whether
// the bytes may be read lives in `proof-reader.ts`, so a fake facade in a unit test exercises the
// same guards the SDK adapter does.

export interface SpaceV2ProofObjectMetadata {
  readonly fullPath: unknown;
  readonly contentType: unknown;
  readonly size: unknown;
}

export interface SpaceV2ProofReadFirebaseFacade {
  readMetadata(objectPath: string): Promise<SpaceV2ProofObjectMetadata>;
  readBytes(objectPath: string, maxBytes: number): Promise<ArrayBuffer>;
}
