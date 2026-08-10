// The injectable SDK boundary (spec 036 §8). Everything above this interface is pure logic that
// unit tests drive with a synthetic fake — no Firebase SDK, no network, no import-time side effect.

/**
 * The ONLY thing the ports learn about a signed-in user. No uid, no email, no token, no `User`
 * instance: an identifier that never enters the port cannot leak out of it.
 */
export interface AdminFacadeUser {
  readonly isAnonymous: boolean;
}

export interface AdminReadObjectRequest {
  readonly objectPath: string;
  readonly maxDownloadSizeBytes: number;
}

export interface AdminFirebaseFacade {
  /** Must reject (never silently no-op) when local persistence cannot be established. */
  setPersistenceLocal(): Promise<void>;
  /**
   * Registers the auth observer and returns its unsubscribe.
   *
   * `onError` is not optional in spirit: without it an SDK/init failure would leave the port stuck
   * in `initializing` forever (and a factory rejection would surface as an unhandled rejection).
   * Implementations must report BOTH observer errors and adapter-construction failures through it.
   */
  onAuthStateChanged(
    listener: (user: AdminFacadeUser | null) => void,
    onError: (error: unknown) => void,
  ): () => void;
  signInWithEmailPassword(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Reads a fixed object. The port always passes the module constants (never caller input). */
  readObjectBytes(request: AdminReadObjectRequest): Promise<Uint8Array>;
}
