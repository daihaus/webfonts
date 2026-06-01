import { execFile } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import type { Family } from "./manifest.ts";
import { expandTilde, repoRoot } from "./util.ts";

const exec = promisify(execFile);

async function isDir(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Resolve the directory that holds a family's source font files.
 *
 * - `sourceMode: 'local'` reads the configured local clone (default).
 * - `sourceMode: 'release'` downloads the upstream tarball into `.cache/` and extracts it.
 *
 * `override` (from `--source-root`) wins over the manifest when set.
 */
export async function resolveSourceRoot(family: Family, override?: string): Promise<string> {
  if (override) return expandTilde(override);

  const { sourceMode, localPath, releaseUrl, version } = family.upstream;

  if (sourceMode === "local") {
    if (!localPath)
      throw new Error(`${family.slug}: sourceMode "local" requires upstream.localPath`);
    const root = expandTilde(localPath);
    if (!(await isDir(root))) throw new Error(`${family.slug}: localPath not found: ${root}`);
    return root;
  }

  if (!releaseUrl)
    throw new Error(`${family.slug}: sourceMode "release" requires upstream.releaseUrl`);
  const cacheDir = join(repoRoot, ".cache", "sources");
  const dest = join(cacheDir, `${family.slug}-${version}`);
  if (await isDir(dest)) return dest;

  await mkdir(dest, { recursive: true });
  const tarball = join(cacheDir, `${family.slug}-${version}.tar.gz`);
  const res = await fetch(releaseUrl);
  if (!res.ok)
    throw new Error(
      `${family.slug}: download failed (HTTP ${String(res.status)}): ${releaseUrl}`,
    );
  await writeFile(tarball, new Uint8Array(await res.arrayBuffer()));
  // GitHub archive tarballs wrap everything in a top-level dir; strip it.
  await exec("tar", ["xzf", tarball, "-C", dest, "--strip-components=1"]);
  return dest;
}
