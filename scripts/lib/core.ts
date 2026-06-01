import { mkdir, stat, writeFile } from "node:fs/promises";
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

/**
 * Ensure the cn-font-split Rust core binary for the current platform is present in a repo-local
 * cache, downloading it from the pinned core release if needed. Returns the absolute binary path,
 * suitable for `process.env.CN_FONT_SPLIT_BIN`. Keeping the binary here (rather than relying on the
 * package's own install step) makes the build self-contained and reproducible.
 */
export async function ensureCoreBinary(coreVersion: string): Promise<string> {
  const target = rustTarget();
  const name = `libffi-${target}.${binExt(target)}`;
  const dir = join(repoRoot, ".cache", "cn-font-split", coreVersion);
  const dest = join(dir, name);
  if (await exists(dest)) return dest;

  await mkdir(dir, { recursive: true });
  const host = process.env.CN_FONT_SPLIT_GH_HOST ?? "https://github.com";
  const url = `${host}/KonghaYao/cn-font-split/releases/download/${coreVersion}/${name}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to download cn-font-split core ${coreVersion} (HTTP ${String(res.status)}): ${url}`,
    );
  }
  await writeFile(dest, new Uint8Array(await res.arrayBuffer()));
  return dest;
}
