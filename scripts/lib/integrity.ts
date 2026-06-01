import { createHash } from "node:crypto";

/**
 * Verify a consumed source file's bytes against the pinned `upstream.sourceChecksums`. Mirrors the
 * core-binary rule: if any checksums are configured, every consumed file must be covered (no silent
 * gaps), and a mismatch fails closed. This anchors the republished `@daihaus/<font>` output to the
 * exact reviewed source bytes — the local clone and the (non-byte-stable) release tarball both pass
 * only if the file content matches.
 */
export function verifySourceFile(
  relPath: string,
  bytes: Uint8Array,
  checksums: Record<string, string>,
): void {
  const expected = checksums[relPath];
  if (Object.keys(checksums).length > 0 && !expected) {
    throw new Error(
      `No pinned source checksum for ${relPath}; refusing to use an unverified source file (add it to upstream.sourceChecksums).`,
    );
  }
  if (expected) {
    const actual = createHash("sha256").update(bytes).digest("hex");
    if (actual !== expected) {
      throw new Error(
        `Source checksum mismatch for ${relPath}: expected ${expected}, got ${actual}`,
      );
    }
  }
}
