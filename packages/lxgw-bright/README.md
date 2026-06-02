# @daihaus/lxgw-bright

LXGW Bright — a semi-serif Chinese webfont (LXGW WenKai Lite + Ysabeau). Subset to unicode-range woff2.

- **font-family:** `LXGW Bright`
- **weights:** 300, 400, 500 · **styles:** normal, italic
- **license:** OFL-1.1 — generated from [lxgw/LxgwBright@v5.528](https://github.com/lxgw/LxgwBright) with cn-font-split

## CSS entry points

Every file lazy-loads only the glyph chunks a page actually uses (per `unicode-range`). Import the
narrowest one that covers the weights/styles you use — `.woff2` bytes are shared, so mixing files
never double-downloads a glyph.

| File | Contains |
| --- | --- |
| `index.css` | all weights × all styles |
| `weight-<weight>.css` | one weight, all styles — e.g. `weight-400.css` |
| `style-<style>.css` | one style, all weights — e.g. `style-normal.css` |
| `<weight>-<style>.css` | exactly one cut — e.g. `400-normal.css` |

## Use via jsDelivr (no install)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@daihaus/lxgw-bright@1.0.0/index.css" />
<style>
  body {
    font-family: "LXGW Bright", serif;
  }
</style>
```

Narrower is smaller:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@daihaus/lxgw-bright@1.0.0/weight-400.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@daihaus/lxgw-bright@1.0.0/400-normal.css" />
```

## Use via npm (bundlers)

```sh
npm install @daihaus/lxgw-bright
```

```js
import "@daihaus/lxgw-bright";                // full bundle (index.css)
import "@daihaus/lxgw-bright/weight-400.css"; // one weight, all styles
import "@daihaus/lxgw-bright/style-normal.css";   // one style, all weights
import "@daihaus/lxgw-bright/400-normal.css";      // exactly one cut
```

Pin an exact version; the CSS already contains the `@font-face` rules.

## Install locally (without publishing)

Build the tarball (`npm pack` in this folder, or `pnpm pack:fonts` from the monorepo root), then:

```sh
npm install ./daihaus-lxgw-bright-1.0.0.tgz
```

Or point a dependency straight at the built package folder:

```jsonc
// package.json
{ "dependencies": { "@daihaus/lxgw-bright": "file:../path/to/packages/lxgw-bright" } }
```
