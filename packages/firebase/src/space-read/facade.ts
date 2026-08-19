export interface SpaceDocumentSnapshot {
  readonly exists: boolean;
  readonly data?: unknown;
}

export interface SpaceReadFirebaseFacade {
  readDocument(token: string): Promise<SpaceDocumentSnapshot>;
}
