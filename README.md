# Daihaus Webfonts

Static webfont packages for OFL fonts that are useful before they are available
from larger public CDNs such as Google Fonts or Fontsource. Packages are
published to npm under the `@daihaus` scope and can be loaded through jsDelivr.

The first published family is [LXGW Bright](https://github.com/lxgw/LxgwBright),
split with [cn-font-split](https://github.com/KonghaYao/cn-font-split) so it can
be loaded efficiently from jsDelivr.

## LXGW Bright

Available families:

- `LXGW Bright`
- `LXGW Bright GB`
- `LXGW Bright TC`

Available CSS entries for each family:

- `300.css`
- `300-italic.css`
- `400.css`
- `400-italic.css`
- `500.css`
- `500-italic.css`

Example:

```css
@import url("https://cdn.jsdelivr.net/npm/@daihaus/lxgw-bright@0.1.0/fonts/lxgw-bright/400.css");

body {
  font-family: "LXGW Bright", serif;
}
```

For production sites, pin a package version instead of relying on an unversioned
URL.

## Regeneration

The build expects the upstream source checkout next to this repository:

```sh
pnpm install
pnpm run build:lxgw-bright
pnpm run verify:fonts
```

By default, the build reads:

- `../gh.lxgw.lxgwbright`
- `../gh.konghayao.cn-font-split`

Override the source paths when needed:

```sh
LXGW_BRIGHT_SOURCE=/path/to/LxgwBright \
CN_FONT_SPLIT_SOURCE=/path/to/cn-font-split \
pnpm run build:lxgw-bright
```

Source TTF files are not committed. This repository stores the generated CSS,
WOFF2 shards, license files, and provenance metadata.

The generator uses the Rust CLI from `CN_FONT_SPLIT_SOURCE`, so Rust and Cargo
must be available locally.
