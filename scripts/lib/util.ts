import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Family, Instance, Manifest } from "./manifest.ts";

/** Output sub-directory for an instance, e.g. `400-normal`. The stable public path segment. */
export function dirName(instance: Instance): string {
  return `${String(instance.weight)}-${instance.style}`;
}

/** Sorted unique weights of a family, e.g. [300, 400, 500]. */
export function weightsOf(family: Family): number[] {
  return [...new Set(family.instances.map((i) => i.weight))].sort((a, b) => a - b);
}

/** Unique styles of a family, e.g. ["normal", "italic"]. */
export function stylesOf(family: Family): string[] {
  return [...new Set(family.instances.map((i) => i.style))];
}

/** Full npm package name, e.g. `@daihaus/lxgw-bright`. */
export function packageName(manifest: Manifest, family: Family): string {
  return `${manifest.npm.scope}/${family.slug}`;
}

/** npm package version (independent SemVer; the upstream font version is recorded in metadata.json). */
export function packageVersion(family: Family): string {
  return family.version;
}

/** Expand a leading `~` to the user's home directory. */
export function expandTilde(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

/** Absolute repo root, resolved from this file at `scripts/lib/util.ts`. */
export const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
