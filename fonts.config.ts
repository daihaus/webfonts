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
  sourceMode: "auto",
  localPath: "~/repos/gh.lxgw.lxgwbright",
  releaseUrl: "https://github.com/lxgw/LxgwBright/archive/refs/tags/v5.528.tar.gz",
  licensePath: "OFL.txt",
  // SHA-256 of each consumed source file (content, not the non-byte-stable GitHub archive tarball).
  // Anchors the republished output to the reviewed source bytes; regenerate when bumping the version.
  sourceChecksums: {
    "LXGWBright/LXGWBright-Light.ttf":
      "445374bc4fca6c03354b91083150395ed4c920d2fa002478eccf11fbde93429e",
    "LXGWBright/LXGWBright-LightItalic.ttf":
      "24732449d7c522906b42a1b67a0207c59c226e3f54484c80655b526feb8a7824",
    "LXGWBright/LXGWBright-Regular.ttf":
      "d8cd796c0c73f82dcaf514f11d7408892890ce3bfea570c1754fb0bed33cd5a7",
    "LXGWBright/LXGWBright-Italic.ttf":
      "ce3db7e68c39a0f3016d71c8169b3e9cd26f7a635f86c8dac84dd0b9ac3a0229",
    "LXGWBright/LXGWBright-Medium.ttf":
      "91edbdde61f0148736decb6cf44e93707477999cacc92e1046ea7c462eec5167",
    "LXGWBright/LXGWBright-MediumItalic.ttf":
      "d17c90f6eaca283bcd9a5d5b67c1de62aed9f35844fd9a1d2cf676dd2bc7d18a",
    "LXGWBrightGB/LXGWBrightGB-Light.ttf":
      "c04a10c4615dccdb4cd6bd557ff40aa0fb2c8b43c2421b301bfa36aebfde8ba6",
    "LXGWBrightGB/LXGWBrightGB-LightItalic.ttf":
      "c2bfc4084d7f5730fb74aa0bb21b40f6c08c7ea76c7f1543efdfffd38202eab2",
    "LXGWBrightGB/LXGWBrightGB-Regular.ttf":
      "cd78eb7d99b2f8cbf2a1bed52ab998ff1e76e18048d9b925ce2799aa6310e72d",
    "LXGWBrightGB/LXGWBrightGB-Italic.ttf":
      "52c8326309e80ec25ba2f1015e670267411ddbc9870e9171109bf87827054508",
    "LXGWBrightGB/LXGWBrightGB-Medium.ttf":
      "6eddb687de7da2db97f905afb801d737821825eac543f381531c6fa71676b2c3",
    "LXGWBrightGB/LXGWBrightGB-MediumItalic.ttf":
      "906ac7ef4281e7816b7e0e6cfa3f1615484778df9cb067d7c04a8518902b2824",
    "LXGWBrightTC/LXGWBrightTC-Light.ttf":
      "8e9c577f7e8012a65f695a5c228dc116a16e1e2cdd5573d414fe3493c72df0a2",
    "LXGWBrightTC/LXGWBrightTC-LightItalic.ttf":
      "d34932f0b883ef9e433d152b23dd43466970c89518e45d27313490755727da8f",
    "LXGWBrightTC/LXGWBrightTC-Regular.ttf":
      "3eabaf8741a44609b19b819d1c420cf8bf0c20c6f44aceaaf60223bc9088a0ba",
    "LXGWBrightTC/LXGWBrightTC-Italic.ttf":
      "23a7007e4c2aa6edda08d8d95dce92741ea3e1d7946c526ec8059f04ca1230f8",
    "LXGWBrightTC/LXGWBrightTC-Medium.ttf":
      "6784f50d17a0c67efba40892cbf37c73e367930c685db39f47ea3850f726e0f8",
    "LXGWBrightTC/LXGWBrightTC-MediumItalic.ttf":
      "97b8d99603dd5150aac5e600b65278f410b5f7c02c333be8f3d6855b8ab1f72b",
    "OFL.txt": "7727876c16ded8d2b2a9cba3c68e25ba7897662bd4a98d2d712015af13a149e1",
  },
} satisfies ManifestInput["families"][number]["upstream"];

const config = {
  outRoot: "packages",
  npm: {
    scope: "@daihaus",
    repository: "git+https://github.com/daihaus/webfonts.git",
  },
  generator: {
    tool: "cn-font-split",
    version: "7.4.2",
    core: "7.6.8",
    // SHA-256 of each cn-font-split core 7.6.8 release binary, verified after download (dlopen'd into
    // the build, so this is the trust boundary). Regenerate with `shasum -a 256` when bumping `core`.
    coreChecksums: {
      "aarch64-apple-darwin.dylib":
        "3a29a76a5f50e2ecffffd7f404e4c4cad80ab56213982f68609064de1fe3b514",
      "x86_64-apple-darwin.dylib":
        "2bd3651db28792c1775a793817f0a55c02a4c255157aa4535e4d6149350b8df4",
      "x86_64-unknown-linux-gnu.so":
        "db4690e3b9c4b04f6dfa5965792585c389914038f6a4c90fbe73baaf16bbf19c",
      "aarch64-unknown-linux-gnu.so":
        "af74ce9689ed0a079a389dd7bff95939d565731a0a2dc3b5136d813b8ff2607c",
      "x86_64-pc-windows-msvc.dll":
        "31784b363f59476abe2034b708a3566f41a9fab80370d18a3613b52b060cdc17",
    },
  },
  families: [
    {
      slug: "lxgw-bright",
      version: "2.0.0",
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
      version: "2.0.0",
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
      version: "2.0.0",
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
