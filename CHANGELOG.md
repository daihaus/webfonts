# Changelog

Maps each published package version to the upstream font it was generated from. Pin an exact version in
your jsDelivr/npm URL.

## @daihaus/lxgw-bright · @daihaus/lxgw-bright-gb · @daihaus/lxgw-bright-tc — `2.0.0`

_Upstream: LxgwBright v5.528 (unchanged — CSS repackaging only)._

**Breaking: CSS split into a per-weight/per-style grid.** Same fonts, same subsetting; only the CSS
entry points changed, so consumers can load just the cuts they use.

- New entry points at the package root: `index.css` (all weights × styles), `weight-<w>.css` (one
  weight, all styles), `style-<s>.css` (one style, all weights), `<w>-<s>.css` (one cut).
- **Removed** the old per-cut `<weight>-<style>/result.css` — use the root-level `<weight>-<style>.css`
  instead. No compatibility shim.
- Added `package.json` `exports`: `import "@daihaus/<font>"` resolves to the full bundle, and every
  tier (plus its woff2) resolves as a subpath under strict `exports`.
- woff2 chunks are byte-shared across every entry point (no duplication).

## @daihaus/lxgw-bright · @daihaus/lxgw-bright-gb · @daihaus/lxgw-bright-tc — `1.0.0`

_Upstream: LxgwBright v5.528._

Initial release. Build pipeline + first font, split into three sub-family packages.

- **Upstream:** [lxgw/LxgwBright `v5.528`](https://github.com/lxgw/LxgwBright)
- Each package: weights 300 / 400 / 500 × `normal` / `italic` = 6 cuts, `unicode-range` woff2.
- Subset with cn-font-split (wrapper `7.4.2`, core `7.6.8`).
- License: SIL OFL 1.1 — © LXGW, the Klee Project Authors, the Ysabeau Project Authors.
