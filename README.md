# webfonts

Build pipeline for self-hosted **OFL CJK webfonts** that the popular CDNs (Google Fonts, Fontsource)
don't carry yet. Each font is subset and chunked with
[`cn-font-split`](https://github.com/KonghaYao/cn-font-split) into `unicode-range`-gated `.woff2`, then
**published to npm under [`@daihaus`](https://www.npmjs.com/org/daihaus)** and served over jsDelivr:

```
https://cdn.jsdelivr.net/npm/@daihaus/<font>@<version>/...
```

Browsers download only the glyph chunks a page actually uses.

## Available fonts

<!-- FONTS:START -->

| Package                                                                            | `font-family`    | Weights       | Styles         | License | Upstream                                                     | jsDelivr                                                                            |
| ---------------------------------------------------------------------------------- | ---------------- | ------------- | -------------- | ------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [`@daihaus/lxgw-bright`](https://www.npmjs.com/package/@daihaus/lxgw-bright)       | `LXGW Bright`    | 300, 400, 500 | normal, italic | OFL-1.1 | [lxgw/LxgwBright@v5.528](https://github.com/lxgw/LxgwBright) | [`index.css`](https://cdn.jsdelivr.net/npm/@daihaus/lxgw-bright@1.0.0/index.css)    |
| [`@daihaus/lxgw-bright-gb`](https://www.npmjs.com/package/@daihaus/lxgw-bright-gb) | `LXGW Bright GB` | 300, 400, 500 | normal, italic | OFL-1.1 | [lxgw/LxgwBright@v5.528](https://github.com/lxgw/LxgwBright) | [`index.css`](https://cdn.jsdelivr.net/npm/@daihaus/lxgw-bright-gb@1.0.0/index.css) |
| [`@daihaus/lxgw-bright-tc`](https://www.npmjs.com/package/@daihaus/lxgw-bright-tc) | `LXGW Bright TC` | 300, 400, 500 | normal, italic | OFL-1.1 | [lxgw/LxgwBright@v5.528](https://github.com/lxgw/LxgwBright) | [`index.css`](https://cdn.jsdelivr.net/npm/@daihaus/lxgw-bright-tc@1.0.0/index.css) |

_Served from npm via jsDelivr: `https://cdn.jsdelivr.net/npm/@daihaus/<name>@<version>/...` — subset with cn-font-split (wrapper 7.4.2, core 7.6.8). Pin an exact version._

<!-- FONTS:END -->

## Usage

Pick a package from the table above. Each `index.css` bundles every weight & style of that font (all
lazy-loaded per `unicode-range`).

**Via jsDelivr (no install):**

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@daihaus/lxgw-bright@1.0.0/index.css"
/>
<style>
  body {
    font-family: "LXGW Bright", serif;
  }
</style>
```

**Via npm (bundlers):**

```sh
npm install @daihaus/lxgw-bright
```

```js
import "@daihaus/lxgw-bright/index.css"; // or "@daihaus/lxgw-bright/400-normal/result.css"
```

Pin an exact version. The CSS already contains the `@font-face` rules; you never hand-write them.

## Why npm instead of committing fonts to this repo

Git history is append-only, so committing the generated `.woff2` would bloat the repo **permanently**
with every font update. Publishing to npm keeps this repo small (tooling + per-package manifests only),
and jsDelivr serves npm packages with the same immutable version pinning. The generated `.woff2` is
gitignored and ships only inside the published package (via each `package.json` `files` allowlist).

> Keep packages lean and versions infrequent. Flooding npm with large, many-versioned font packages is
> the abuse pattern that got accounts [blocked from jsDelivr in Dec 2025](https://www.endorlabs.com/learn/how-fake-font-packages-abused-npm-as-a-cdn) —
> a handful of real, rarely-updated subset fonts (the Fontsource model) is exactly what this is.

## Layout

```
packages/<font>/                 = one npm package, @daihaus/<font>
├── package.json                 name, version, files allowlist (generated)
├── README.md                    per-package usage (generated)
├── OFL.txt                      license
├── metadata.json                provenance
├── index.css                    whole font: every weight/style inlined
└── <weight>-<style>/            e.g. 400-normal, 500-italic
    ├── result.css               @font-face → ./<hash>.woff2
    └── <hash>.woff2 (×N)        gitignored; shipped in the npm package
```

Each package uses independent SemVer (starting `1.0.0`); the upstream font version is recorded in
`metadata.json`, the package README, and the [CHANGELOG](CHANGELOG.md). Bump the package `version` in
[`fonts.config.ts`](fonts.config.ts) on any change to the (font source + pipeline) tuple.

## Adding or updating a font

1. Make the source reachable — set `upstream.releaseUrl` (a tagged tarball URL) and/or keep a local
   clone at `upstream.localPath`. `sourceMode: "auto"` (default) uses the clone if present, else the
   release tarball, so CI builds from a clean checkout.
2. Add/adjust an entry in [`fonts.config.ts`](fonts.config.ts): `slug` (= npm name + jsDelivr path —
   choose it once), `cssFamily`, `license`, `upstream`, `instances`, and an independent SemVer
   `version`. Bump `version` whenever the font source or pipeline changes.
3. Locally: `pnpm build:fonts` → `pnpm verify:fonts` (then `pnpm format`). Commit, PR, merge.
4. Note the upstream↔package version mapping in [`CHANGELOG.md`](CHANGELOG.md).

## Publishing

Merging a `version` bump to `main` triggers
[`.github/workflows/publish.yml`](.github/workflows/publish.yml), which publishes any package whose
`version` isn't on npm yet (`scripts/ci-publish.ts` queries the registry; unchanged packages are
skipped). `@daihaus/*` is scoped, so all publishes use `--access public`.

- **New package** (not yet on npm) → first publish with the **`NPM_TOKEN`** secret — OIDC can't
  bootstrap a package that doesn't exist yet.
- **Existing package**, new version → **OIDC trusted publishing** (no token, automatic provenance).

One-time setup:

1. Create a **granular** npm token — scope **`@daihaus`**, **Read and write** to packages, ≤90-day
   expiry (the Dec 2025 cap; set a rotation reminder). Add it as the repo secret **`NPM_TOKEN`**
   (Settings → Secrets and variables → Actions). Required before the first publish.
2. After a package's first (token) publish, add a **Trusted Publisher** in its npmjs.com settings →
   repository `daihaus/webfonts`, workflow `publish.yml`. Subsequent bumps then publish via OIDC
   without the token.

Manual alternative (local): `npm login`, then `pnpm release` — builds with `--clean`, verifies, and
runs `pnpm -r publish --access public`.

## Development

```sh
pnpm install
pnpm build:fonts      # generate packages/**
pnpm verify:fonts     # structural checks
pnpm catalog          # regenerate this README's table only
pnpm lint             # eslint + prettier
```

## License

Each font keeps its upstream license (see each `packages/<font>/OFL.txt` and the catalog above). Fonts
are redistributed under the SIL Open Font License 1.1 with attribution to their original authors. The
build tooling in this repo is provided as-is.
