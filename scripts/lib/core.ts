import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { repoRoot } from "./util.ts";

/** Rust target triple for the current platform/arch (mirrors cn-font-split's own matcher). */
function rustTarget(): string {
  const table: Partial<Record<NodeJS.Platform, Partial<Record<string, string>>>> = {
    darwin: { x64: "x86_64-apple-darwin", arm64: "aarch64-apple-darwin" },
    linux: { x64: "x86_64-unknown-linux-gnu", arm64: "aarch64-unknown-linux-gnu" },
    win32: { x64: "x86_64-pc-windows-msvc", arm64: "aarch64-pc-windows-msvc" },
  };
  return table[process.platform]?.[process.arch] ?? "wasm32-wasip1";
}

function binExt(target: string): string {
  if (target.includes("windows")) return "dll";
  if (target.includes("darwin")) return "dylib";
  if (target.includes("wasm")) return "wasm";
  return "so";
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function sha256File(p: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(p))
    .digest("hex");
}

/**
 * Ensure the cn-font-split Rust core binary for the current platform is present in a repo-local
 * cache, downloading it from the pinned core release if needed. Returns the absolute binary path,
 * suitable for `process.env.CN_FONT_SPLIT_BIN`. Keeping the binary here (rather than relying on the
 * package's own install step) makes the build self-contained and reproducible.
 */
export async function ensureCoreBinary(
  coreVersion: string,
  checksums: Record<string, string> = {},
): Promise<string> {
  const target = rustTarget();
  const ext = binExt(target);
  const name = `libffi-${target}.${ext}`;
  const dir = join(repoRoot, ".cache", "cn-font-split", coreVersion);
  const dest = join(dir, name);
  const expected = checksums[`${target}.${ext}`];

  // If any checksums are pinned, this platform must be covered — otherwise we'd silently run an
  // unverified native binary (e.g. the wasm/freebsd fallback target). Refuse rather than skip.
  if (Object.keys(checksums).length > 0 && !expected) {
    throw new Error(
      `No pinned core checksum for ${name}; refusing to run an unverified binary (add it to generator.coreChecksums).`,
    );
  }

  // A cache hit must still pass the integrity gate: re-hash the cached file (guards cache tampering
  // and binaries cached before checksums were pinned). A mismatch is treated as a miss → re-download.
  if (await exists(dest)) {
    if (!expected || (await sha256File(dest)) === expected) return dest;
  }

  await mkdir(dir, { recursive: true });
  const host = process.env.CN_FONT_SPLIT_GH_HOST ?? "https://github.com";
  const url = new URL(
    `${host}/KonghaYao/cn-font-split/releases/download/${coreVersion}/${name}`,
  );
  if (url.protocol !== "https:")
    throw new Error(`Refusing non-https core download: ${url.href}`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to download cn-font-split core ${coreVersion} (HTTP ${String(res.status)}): ${url.href}`,
    );
  }
  // Validate the response before persisting it: reject HTML error pages and implausibly small
  // bodies (the core binary is several MB). This guards the network-data-to-file write below.
  if ((res.headers.get("content-type") ?? "").includes("text/html")) {
    throw new Error(`Unexpected HTML response for core download: ${url.href}`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength < 100_000) {
    throw new Error(
      `Downloaded core is implausibly small (${String(bytes.byteLength)} bytes): ${url.href}`,
    );
  }
  // Integrity check on the freshly downloaded bytes (expected is guaranteed set when any checksum is
  // configured; the dlopen'd binary is the build's native trust boundary).
  if (expected) {
    const actual = createHash("sha256").update(bytes).digest("hex");
    if (actual !== expected) {
      throw new Error(
        `Core binary checksum mismatch for ${name}: expected ${expected}, got ${actual}`,
      );
    }
  }

  // Write atomically so an interrupted download never leaves a half-written binary in the cache.
  const tmp = `${dest}.download`;
  await writeFile(tmp, bytes);
  await rename(tmp, dest);
  return dest;
}
