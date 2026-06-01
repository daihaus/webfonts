import type { ManifestInput } from "./scripts/lib/manifest.ts";

type Instances = ManifestInput["families"][number]["instances"];

/** The six static cuts every LXGW Bright sub-family ships, mapped to CSS weight/style. */
function lxgwInstances(dir: string, base: string): Instances {
  return [
    { weight: 300, style: "normal", file: `${dir}/${base}-Light.ttf` },
    { weight: 300, style: "italic", file: `${dir}/${base}-LightItalic.ttf` },
    { weight: 400, style: "normal", file: `${dir}/${base}-Regular.ttf` },
    { weight: 400, style: "italic", file: `${dir}/${base}-Italic.ttf` },
    { weight: 500, style: "normal", file: `${dir}/${base}-Medium.ttf` },
    { weight: 500, style: "italic", file: `${dir}/${base}-MediumItalic.ttf` },
  ];
}

const lxgwBrightUpstream = {
  repo: "lxgw/LxgwBright",
  version: "v5.528",
  homepage: "https://github.com/lxgw/LxgwBright",
  sourceMode: "local",
  localPath: "~/repos/gh.lxgw.lxgwbright",
  releaseUrl: "https://github.com/lxgw/LxgwBright/archive/refs/tags/v5.528.tar.gz",
  licensePath: "OFL.txt",
} satisfies ManifestInput["families"][number]["upstream"];

const config = {
  outRoot: "packages",
  npm: {
    scope: "@daihaus",
    repository: "git+https://github.com/daihaus/webfonts.git",
  },
  generator: { tool: "cn-font-split", version: "7.4.2", core: "7.6.8" },
  families: [
    {
      slug: "lxgw-bright",
      version: "1.0.0",
      displayName: "LXGW Bright",
      cssFamily: "LXGW Bright",
      description:
        "LXGW Bright — a semi-serif Chinese webfont (LXGW WenKai Lite + Ysabeau). Subset to unicode-range woff2.",
      keywords: ["lxgw", "serif", "kai"],
      license: { id: "OFL-1.1", reservedFontName: false },
      upstream: lxgwBrightUpstream,
      instances: lxgwInstances("LXGWBright", "LXGWBright"),
    },
    {
      slug: "lxgw-bright-gb",
      version: "1.0.0",
      displayName: "LXGW Bright GB",
      cssFamily: "LXGW Bright GB",
      description:
        "LXGW Bright GB — the Mainland China (GB) glyph cut of LXGW Bright. Subset to unicode-range woff2.",
      keywords: ["lxgw", "serif", "gb", "simplified"],
      license: { id: "OFL-1.1", reservedFontName: false },
      upstream: lxgwBrightUpstream,
      instances: lxgwInstances("LXGWBrightGB", "LXGWBrightGB"),
    },
    {
      slug: "lxgw-bright-tc",
      version: "1.0.0",
      displayName: "LXGW Bright TC",
      cssFamily: "LXGW Bright TC",
      description:
        "LXGW Bright TC — the Traditional Chinese (TC) glyph cut of LXGW Bright. Subset to unicode-range woff2.",
      keywords: ["lxgw", "serif", "tc", "traditional"],
      license: { id: "OFL-1.1", reservedFontName: false },
      upstream: lxgwBrightUpstream,
      instances: lxgwInstances("LXGWBrightTC", "LXGWBrightTC"),
    },
  ],
} satisfies ManifestInput;

export default config;
