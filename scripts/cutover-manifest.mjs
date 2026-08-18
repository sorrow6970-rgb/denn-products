const EXPECTED = Object.freeze({
  schemaVersion: 1,
  mode: "local-only",
  projectId: "demo-denn-cutover",
  syntheticOperatorUid: "emulator-operator-DO-NOT-DEPLOY",
  storageRules: "storage.transitional.emulator.rules",
  firestoreRules: "firestore.transitional.emulator.rules",
  maxObjectBytesExclusive: 20 * 1024 * 1024,
});

export function validateCutoverManifest(input) {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input)) return false;
    if (input.schemaVersion !== EXPECTED.schemaVersion || input.mode !== EXPECTED.mode)
      return false;
    if (input.projectId !== EXPECTED.projectId || !input.projectId.startsWith("demo-"))
      return false;
    if (input.syntheticOperatorUid !== EXPECTED.syntheticOperatorUid) return false;
    if (input.rules?.storage !== EXPECTED.storageRules) return false;
    if (input.rules?.firestore !== EXPECTED.firestoreRules) return false;
    if (input.canary?.intentionalSaves !== 1 || input.canary?.maxNewObjects !== 1) return false;
    if (input.canary?.maxObjectBytesExclusive !== EXPECTED.maxObjectBytesExclusive) return false;
    if (input.canary?.observer !== "Founder" || input.canary?.immediateReview !== true)
      return false;
    if (input.gates?.productionEnabled !== false) return false;
    if (input.gates?.actualWriteApproved !== false) return false;
    if (input.gates?.legacyCloseApproved !== false) return false;
    if (!Array.isArray(input.deployCommands) || input.deployCommands.length !== 0) return false;
    return true;
  } catch {
    return false;
  }
}
