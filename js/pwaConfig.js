export const APP_VERSION = "0.59.0";

export const ESSENTIAL_APP_PATHS = Object.freeze([
  "./",
  "index.html",
  "css/style.css",
  "css/base.css",
  "css/structured-articles.css",
  "css/favorites.css",
  "css/pwa.css",
  "css/criteria.css",
  "css/focused.css",
  "js/app.js",
  "js/config.js",
  "js/criterionLinks.js",
  "js/criteria.js",
  "js/criteriaEngine.js",
  "js/dom.js",
  "js/favorites.js",
  "js/html.js",
  "js/imageViewer.js",
  "js/pwa.js",
  "js/pwaConfig.js",
  "js/pwaPolicy.js",
  "js/renderers.js",
  "js/router.js",
  "js/search.js",
  "js/searchCore.js",
  "js/store.js",
  "js/views.js",
  "manifest.json",
  "data/vik.json",
  "data/uzk.json",
  "data/pvk.json",
  "data/rk.json",
  "data/vibration.json",
  "data/criteria.json"
]);

const PVK_INDICATION_IMAGE_SLUGS = Object.freeze([
  "linear-crack",
  "branched-crack",
  "microcrack-cluster",
  "fatigue-concentrator",
  "grinding-thermal-crack",
  "surface-incomplete-penetration",
  "surface-lack-of-fusion",
  "open-pore",
  "pore-cluster",
  "pinhole",
  "overlay-boundary",
  "scratch",
  "roughness",
  "geometric-edge",
  "thread-groove-hole",
  "loose-joint",
  "scale",
  "contamination",
  "coating-residue",
  "porous-surface",
  "weld-spatter",
  "insufficient-cleaning",
  "excess-penetrant",
  "overcleaning",
  "thick-developer",
  "uneven-developer",
  "short-dwell",
  "overdrying",
  "lint",
  "incompatible-materials",
  "insufficient-lighting"
]);

const VIBRATION_FAULT_IMAGE_SLUGS = Object.freeze([
  "unbalance", "parallel-misalignment", "angular-misalignment", "bent-shaft",
  "mechanical-looseness", "loose-bearing-housing", "bearing-clearance", "soft-foot",
  "uneven-supports", "inclined-foundation", "casing-deformation", "pipe-strain",
  "rub", "resonance", "cavitation", "surge", "gears", "motor-electrical",
  "rotor-cage", "lubrication", "bearing-outer-race", "bearing-inner-race",
  "bearing-rolling-elements", "bearing-cage", "rotor-precession", "oil-whirl",
  "babbitt", "oil-coking", "journal-bearing-misalignment"
]);

const VIBRATION_SPECTRUM_IMAGE_SLUGS = Object.freeze([
  "1x", "2x", "1x-2x", "harmonic-series", "half", "third", "oil-whirl",
  "broadband-noise", "blade-pass", "gear-mesh", "sidebands", "bpfo", "bpfi",
  "bsf", "ftf", "resonance", "clipping", "impulse", "modulated", "cavitation"
]);

const VIBRATION_FAULT_WAVEFORM_SLUGS = Object.freeze([
  "unbalance", "parallel-misalignment", "angular-misalignment", "bent-shaft",
  "mechanical-looseness", "loose-bearing-housing", "bearing-clearance", "rub",
  "cavitation", "gears", "rotor-cage", "lubrication", "bearing-outer-race",
  "bearing-inner-race", "bearing-rolling-elements", "bearing-cage", "oil-whirl",
  "journal-bearing-misalignment"
]);

const VIK_BASE_METAL_IMAGE_SLUGS = Object.freeze([
  "corrosion", "service-cracks", "lamination"
]);

const VIK_FRACTOGRAPHY_IMAGE_SLUGS = Object.freeze([
  "ductile", "brittle", "fatigue", "intergranular", "stress-corrosion", "overload"
]);

const RK_ATLAS_IMAGE_SLUGS = Object.freeze([
  "shrinkage-cavity", "lack-of-fusion", "burn-through",
  "excess-penetration", "root-concavity", "undercut", "misalignment",
  "incompletely-filled-groove", "image-artifacts"
]);

const UZK_ECHO_ATLAS_IMAGE_SLUGS = Object.freeze([
  "backwall", "entry-dead-zone", "geometric", "multiple", "isolated", "planar",
  "volumetric", "cluster", "backwall-loss", "poor-contact", "mode-conversion", "electrical-noise"
]);

export const OPTIONAL_APP_PATHS = Object.freeze([
  "images/pvk-atlas/true-indications-cover.jpg",
  "images/pvk-atlas/nonrelevant-indications-cover.jpg",
  "images/pvk-atlas/process-errors-cover.jpg",
  ...PVK_INDICATION_IMAGE_SLUGS.flatMap(slug => [
    `images/pvk-atlas/indications/${slug}-white.jpg`,
    `images/pvk-atlas/indications/${slug}-uv.jpg`,
    `images/pvk-atlas/indications/${slug}-diagram.jpg`
  ]),
  ...VIBRATION_FAULT_IMAGE_SLUGS.flatMap(slug => [
    `images/vibration-atlas/faults/${slug}-photo.jpg`,
    `images/vibration-atlas/faults/${slug}-mechanism.jpg`,
    `images/vibration-atlas/faults/${slug}-spectrum.svg`,
    `images/vibration-atlas/faults/${slug}-evidence.svg`
  ]),
  ...VIBRATION_SPECTRUM_IMAGE_SLUGS.flatMap(slug => [
    `images/vibration-atlas/spectra/${slug}-spectrum.svg`,
    `images/vibration-atlas/spectra/${slug}-diagram.svg`
  ]),
  ...VIBRATION_FAULT_WAVEFORM_SLUGS.map(slug =>
    `images/vibration-atlas/faults/${slug}-waveform.svg`
  ),
  ...VIK_BASE_METAL_IMAGE_SLUGS.flatMap(slug => [
    `images/vik-atlas/base-metal/${slug}-overview.jpg`,
    `images/vik-atlas/base-metal/${slug}-detail.jpg`,
    `images/vik-atlas/base-metal/${slug}-diagram.svg`
  ]),
  ...VIK_FRACTOGRAPHY_IMAGE_SLUGS.flatMap(slug => [
    `images/vik-atlas/fractography/${slug}-overview.jpg`,
    `images/vik-atlas/fractography/${slug}-detail.jpg`,
    `images/vik-atlas/fractography/${slug}-diagram.svg`
  ]),
  "images/rk-atlas/covers/atlas.svg",
  "images/rk-atlas/covers/volumetric.svg",
  "images/rk-atlas/covers/planar.svg",
  "images/rk-atlas/covers/shape.svg",
  "images/rk-atlas/covers/artifacts.svg",
  ...["single-pore", "cluster-porosity", "uniform-porosity", "linear-porosity",
    "elongated-cavity", "slag-inclusion", "incomplete-penetration", "crack"].map(slug =>
    `images/rk-atlas/${slug}-user.jpg`
  ),
  ...RK_ATLAS_IMAGE_SLUGS.flatMap(slug => [
    `images/rk-atlas/${slug}-radiograph.svg`,
    `images/rk-atlas/${slug}-section.svg`
  ]),
  "images/uzk-echo-atlas/cover-reference.svg",
  "images/uzk-echo-atlas/cover-relevant.svg",
  "images/uzk-echo-atlas/cover-technical.svg",
  ...UZK_ECHO_ATLAS_IMAGE_SLUGS.flatMap(slug => [
    `images/uzk-echo-atlas/${slug}-ascan.svg`,
    `images/uzk-echo-atlas/${slug}-scheme.svg`
  ]),
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "images/defects/undercut.jpg",
  "images/defects/porosity.webp",
  "images/defects/cracks.webp",
  "images/defects/lack-of-fusion.webp",
  "images/defects/slag-inclusions.webp",
  "images/defects/unfilled-crater.webp",
  "images/defects/burn-through.webp",
  "images/defects/overlap.webp",
  "images/defects/edge-misalignment.webp",
  "images/defects/uneven-reinforcement.webp",
  "images/defects/interpass-depression.webp",
  "images/defects/metal-spatter.webp",
  "images/defects/fistula.webp",
  "images/atlas/cracks-photo.webp",
  "images/atlas/cracks-scheme.webp",
  "images/atlas/edge-misalignment-photo.webp",
  "images/atlas/edge-misalignment-scheme.webp",
  "images/atlas/fistula-photo.webp",
  "images/atlas/fistula-scheme.webp",
  "images/atlas/interpass-depression-photo.webp",
  "images/atlas/interpass-depression-scheme.webp",
  "images/atlas/lack-of-fusion-photo.webp",
  "images/atlas/lack-of-fusion-scheme.webp",
  "images/atlas/metal-spatter-photo.webp",
  "images/atlas/metal-spatter-scheme.webp",
  "images/atlas/porosity-photo.webp",
  "images/atlas/porosity-scheme.webp",
  "images/atlas/slag-inclusions-photo.webp",
  "images/atlas/slag-inclusions-scheme.webp",
  "images/atlas/uneven-reinforcement-photo.webp",
  "images/atlas/uneven-reinforcement-scheme.webp",
  "images/atlas/unfilled-crater-photo.webp",
  "images/atlas/unfilled-crater-scheme.webp"
]);

export const APP_PATHS = Object.freeze([
  ...ESSENTIAL_APP_PATHS,
  ...OPTIONAL_APP_PATHS
]);
