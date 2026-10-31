# Allmarc Civil & Heavy Engineering Infrastructure

An interactive digital platform and static site generator for **Allmarc Industries** — specializing in Oil & Gas, Renewables, Offshore Steel Fabrication, Formwork, Scaffolding, and Heavy Civil Infrastructure.

---

## Highlights

- **237 Statically Generated Pages**: Ultra-fast, SEO-optimized HTML pages spanning complete product catalogs, engineering competencies, and project case studies.
- **Interactive Three.js 3D Visualizers**: Real-time 3D GLB model viewers for heavy industrial plant setups, onshore/offshore fabrication modules, combustion chambers, and shoring systems.
- **Cinematic Motion & Smooth Scroll**: Integrated [Lenis](https://github.com/darkroomengineering/lenis) smooth scrolling synchronized with [GSAP](https://gsap.com/) and ScrollTrigger.
- **Zero-Dependency Static Dev Server**: Built-in HTTP server with dynamic Brotli/Gzip compression, HTTP 206 partial content streaming for videos, and ETag caching.
- **Comprehensive Search Index**: Instant client-side search across all 237 sections and pages.

---

## Tech Stack

- **Runtime**: Node.js (ES Modules, Node 18+)
- **3D Graphics**: [Three.js](https://threejs.org/) (WebGL / GLTF loader, custom studio lighting, ACESFilmic tone mapping)
- **Animation**: [GSAP](https://gsap.com/) (ScrollTrigger, ticker synchronization)
- **Smooth Scroll**: [Lenis](https://github.com/darkroomengineering/lenis)
- **HTML Processing**: [Cheerio](https://cheerio.js.org/)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or newer recommended)
- `npm`

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/rabari1102/civil.git
cd civil
npm install
```

### Development & Build

- **Build the static site**:
  ```bash
  npm run build
  ```
  Generates all 237 pages and compiles CSS/JS into `dist/`.

- **Start local preview server**:
  ```bash
  npm run serve
  ```
  Starts the static server at `http://localhost:5180`.

- **Build and serve in one step**:
  ```bash
  npm run dev
  # or
  npm start
  ```

---

## Quality & Verification Tools

The project includes built-in verification scripts in `build/tools/`:

- **Verify internal links & assets**:
  ```bash
  npm run check:links
  ```
  Ensures every internal URL, image, video, and 3D model reference exists and resolves properly (0 broken targets).

- **Verify content coverage**:
  ```bash
  npm run check:coverage
  ```
  Compares visible text between crawled source and built output to guarantee full content fidelity (>99.9% coverage).

- **Run all checks**:
  ```bash
  npm test
  ```

---

## Directory Structure

```text
├── build/                # Static generator build scripts & tooling
│   ├── build.mjs         # Core build script (pages, assets, vendor bundling)
│   ├── serve.mjs         # Production-grade local preview server
│   ├── layout.mjs        # Base HTML layout template and metadata
│   ├── transform.mjs     # HTML content transformations and modern block cleaning
│   ├── imgsize.mjs       # Image dimensions and responsive picture handling
│   ├── site.mjs          # Site navigation, mega-menu, and contact data
│   └── tools/            # Verification, link checker, coverage, and render utilities
├── content/
│   ├── data/             # Sitemap URLs and plant 3D annotations
│   └── pages/            # HTML source templates for all routes
├── public/
│   └── remote/           # Mirrored 3D GLB models, media, and optimized assets
├── src/
│   ├── css/              # Modular design system (base, chrome, heroes, 3d, components)
│   ├── fonts/            # Web fonts (Manrope, Archivo, Instrument Serif, JetBrains Mono)
│   ├── js/               # Main client runtime, interaction layer, and Three.js scenes
│   └── static/           # Static icons and assets
└── package.json          # Project configuration & npm scripts
```

---

## License

Private / Allmarc Industries. All rights reserved.
