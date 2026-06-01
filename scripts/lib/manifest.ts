import { z } from "zod";

export const StyleSchema = z.enum(["normal", "italic"]);

export const InstanceSchema = z.object({
  /** CSS `font-weight` value, e.g. 300 / 400 / 500. */
  weight: z.number(),
  style: StyleSchema,
  /** Font file path relative to the resolved source root. */
  file: z.string(),
});

export const FamilySchema = z.object({
  /** Immutable package slug under `packages/` — also the npm package name and the stable jsDelivr path. */
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be kebab-case"),
  displayName: z.string(),
  /** The `font-family` string emitted into `@font-face`. */
  cssFamily: z.string(),
  fontDisplay: z.enum(["auto", "block", "swap", "fallback", "optional"]).default("swap"),
  /** npm package description; a sensible default is derived when omitted. */
  description: z.string().optional(),
  /** Extra npm keywords merged with the defaults. */
  keywords: z.array(z.string()).default([]),
  /** npm package version — independent SemVer. Bump on any change to the (font source + pipeline) tuple. */
  version: z.string(),
  license: z.object({
    id: z.string(),
    reservedFontName: z.boolean().default(false),
    /** License file name written into the package directory. */
    file: z.string().default("OFL.txt"),
  }),
  upstream: z.object({
    repo: z.string(),
    version: z.string(),
    homepage: z.string(),
    sourceMode: z.enum(["local", "release"]).default("local"),
    /** Local clone path (sourceMode `local`); a leading `~` is expanded. */
    localPath: z.string().optional(),
    /** Release tarball URL (sourceMode `release`). */
    releaseUrl: z.string().optional(),
    /** License file path within the source root. */
    licensePath: z.string().default("OFL.txt"),
  }),
  instances: z.array(InstanceSchema).min(1),
});

export const ManifestSchema = z.object({
  /** Workspace directory holding the publishable packages. */
  outRoot: z.string().default("packages"),
  npm: z.object({
    /** npm org scope, e.g. `@daihaus`. Package name is `<scope>/<slug>`. */
    scope: z.string().regex(/^@[a-z0-9][a-z0-9-]*$/, "scope must look like @org"),
    /** Repository URL written into each package.json. */
    repository: z.string(),
  }),
  generator: z.object({
    tool: z.literal("cn-font-split"),
    /** npm wrapper version. */
    version: z.string(),
    /** Rust core (binary) release version. */
    core: z.string(),
  }),
  families: z.array(FamilySchema).min(1),
});

export type ManifestInput = z.input<typeof ManifestSchema>;
export type Manifest = z.output<typeof ManifestSchema>;
export type Family = z.output<typeof FamilySchema>;
export type Instance = z.output<typeof InstanceSchema>;

export function parseManifest(raw: unknown): Manifest {
  return ManifestSchema.parse(raw);
}
