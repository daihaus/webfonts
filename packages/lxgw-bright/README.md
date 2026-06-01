# @daihaus/lxgw-bright

LXGW Bright — a semi-serif Chinese webfont (LXGW WenKai Lite + Ysabeau). Subset to unicode-range woff2.

- **font-family:** `LXGW Bright`
- **weights:** 300, 400, 500 · **styles:** normal, italic
- **license:** OFL-1.1 — generated from [lxgw/LxgwBright@v5.528](https://github.com/lxgw/LxgwBright) with cn-font-split

## Use via jsDelivr (no install)

Whole family, one tag-pinned link (every weight/style, lazy-loaded per `unicode-range`):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@daihaus/lxgw-bright@1.0.0/index.css" />
<style>
  body {
    font-family: "LXGW Bright", serif;
  }
</style>
```

A single weight/style is smaller still:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@daihaus/lxgw-bright@1.0.0/400-normal/result.css" />
```

## Use via npm (bundlers)

```sh
npm install @daihaus/lxgw-bright
```

```js
import "@daihaus/lxgw-bright/index.css"; // or "@daihaus/lxgw-bright/400-normal/result.css"
```

Pin an exact version; the CSS already contains the `@font-face` rules.
