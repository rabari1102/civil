// Line icons for data-x-iso slots and small animated process schematics (x-proc).
const P = {
  factory: '<path d="M4 34V18l9 5v-5l9 5v-5l9 5V8h6v26z"/><path d="M4 34h34M10 28h4M18 28h4M26 28h4"/>',
  capacity: '<path d="M6 32a15 15 0 1 1 28 0"/><path d="M20 32l8-11"/><circle cx="20" cy="32" r="2"/><path d="M8 24h3M29 24h3M20 13v3"/>',
  workforce: '<circle cx="14" cy="13" r="4"/><circle cx="27" cy="13" r="4"/><path d="M6 32c0-5 4-9 8-9s8 4 8 9M19 32c0-5 4-9 8-9s8 4 8 9"/>',
  people: '<circle cx="20" cy="12" r="5"/><path d="M9 34c0-7 5-12 11-12s11 5 11 12"/>',
  network: '<circle cx="20" cy="20" r="4"/><circle cx="7" cy="9" r="3"/><circle cx="33" cy="9" r="3"/><circle cx="7" cy="31" r="3"/><circle cx="33" cy="31" r="3"/><path d="M10 11l7 6M30 11l-7 6M10 29l7-6M30 29l-7-6"/>',
  machining: '<path d="M6 34h28M10 34V20h20v14M14 20V10h12v10M20 10V5M17 26h6"/><circle cx="20" cy="27" r="3"/>',
  cranes: '<path d="M4 10h32M8 10v24M32 10v24M18 10v6M18 16h4v4h-4zM20 20v8"/><path d="M14 28h12v6H14z"/>',
  certified: '<circle cx="20" cy="16" r="10"/><path d="M15 16l3 3 6-6M14 25l-3 10 9-4 9 4-3-10"/>',
  quality: '<path d="M20 4l13 5v10c0 8-6 14-13 17C13 33 7 27 7 19V9z"/><path d="M14 19l4 4 8-8"/>',
  beams: '<path d="M6 10h28M6 30h28M20 10v20M10 10v-3M30 10v-3M10 30v3M30 30v3"/>',
  sheds: '<path d="M4 34V18L20 8l16 10v16"/><path d="M4 34h32M12 34V24h16v10"/>',
  containers: '<path d="M5 14h30v18H5zM5 14l5-6h20l5 6M12 14v18M20 14v18M28 14v18"/>',
  flare: '<path d="M18 34V14h4v20M14 34h12"/><path d="M20 12c-4-3-2-6 0-9 2 3 5 5 2 9"/>',
  unit3: '<path d="M4 34V14h32v20M4 34h32M10 20h6v6h-6zM24 20h6v6h-6zM18 34v-8h4v8"/><path d="M16 10h8"/>',
};
const C = (t) => `<circle cx="20" cy="20" r="15"/><text x="20" y="23.5" text-anchor="middle" font-size="${t.length > 4 ? 6.4 : 8}" font-family="JetBrains Mono, monospace" fill="currentColor" stroke="none">${t}</text>`;
Object.assign(P, { c9001: C('9001'), c45001: C('45001'), c1090: C('1090'), c3834: C('3834'), crdso: C('RDSO'), cnhsrcl: C('NHSRCL') });

export function paintIcons(root = document) {
  root.querySelectorAll('[data-x-iso]').forEach((el) => {
    if (el.firstChild) return;
    const k = el.getAttribute('data-x-iso');
    el.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">${P[k] || P.factory}</svg>`;
  });
}

// Process schematics: a beam/plate passes a working head; each type gets its own motion.
const PROC = {
  'laser-12kw': { label: 'Fibre laser · 12 kW', head: 'laser' },
  'tube-laser': { label: 'CNC tube laser', head: 'laser', tube: true },
  'kotec-beam-drill': { label: 'CNC beam drilling', head: 'drill' },
  'end-milling': { label: 'End-face milling', head: 'mill' },
  'beam-line': { label: 'Beam build-up line', head: 'weld' },
  'saw-line': { label: 'Submerged-arc welding', head: 'weld' },
  'manual-mig': { label: 'MIG welding', head: 'weld' },
};
export function paintProcs(root = document) {
  root.querySelectorAll('[data-x-proc]').forEach((el) => {
    if (el.firstChild) return;
    const p = PROC[el.dataset.xProc] || PROC['beam-line'];
    const work = p.tube ? '<rect x="0" y="54" width="160" height="16" rx="8" fill="#a9bcd4"/>' : '<rect x="0" y="52" width="160" height="20" fill="#a9bcd4"/><rect x="0" y="52" width="160" height="3" fill="#7f96b3"/>';
    const head = {
      laser: '<rect x="146" y="10" width="28" height="26" rx="3" fill="#2f4a6e"/><path d="M160 36v16" stroke="#1d7af3" stroke-width="2"><animate attributeName="opacity" values="1;.3;1" dur=".25s" repeatCount="indefinite"/></path><circle cx="160" cy="52" r="4" fill="#ffb23e"><animate attributeName="r" values="3;6;3" dur=".3s" repeatCount="indefinite"/></circle>',
      drill: '<rect x="146" y="6" width="28" height="22" rx="3" fill="#2f4a6e"/><g><rect x="157" y="28" width="6" height="18" fill="#5a6a80"><animateTransform attributeName="transform" type="translate" values="0 0;0 8;0 0" dur="1.2s" repeatCount="indefinite"/></rect></g>',
      mill: '<circle cx="160" cy="40" r="14" fill="none" stroke="#5a6a80" stroke-width="3" stroke-dasharray="6 4"><animateTransform attributeName="transform" type="rotate" from="0 160 40" to="360 160 40" dur="1s" repeatCount="indefinite"/></circle><rect x="146" y="6" width="28" height="18" rx="3" fill="#2f4a6e"/>',
      weld: '<rect x="150" y="12" width="20" height="24" rx="3" fill="#2f4a6e"/><path d="M160 36l-6 14" stroke="#5a6a80" stroke-width="3"/><circle cx="154" cy="52" r="5" fill="#ffb23e"><animate attributeName="opacity" values="1;.2;.9;.4;1" dur=".35s" repeatCount="indefinite"/></circle><circle cx="154" cy="52" r="14" fill="#1d7af3" opacity=".25"><animate attributeName="r" values="10;18;10" dur=".35s" repeatCount="indefinite"/></circle>',
    }[p.head];
    el.innerHTML = `<svg viewBox="0 0 320 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="pg" x1="0" x2="1"><stop offset="0" stop-color="#ff5a12"/><stop offset="1" stop-color="#ffb23e"/></linearGradient></defs>
      <rect width="320" height="100" fill="#eef3fa"/>
      <path d="M0 80h320" stroke="rgba(16,38,74,.16)"/>
      <g>${work}<animateTransform attributeName="transform" type="translate" from="-40 0" to="160 0" dur="4s" repeatCount="indefinite"/></g>
      <path d="M0 72h154" stroke="url(#pg)" stroke-width="2"><animate attributeName="stroke-dasharray" values="0 160;154 0" dur="4s" repeatCount="indefinite"/></path>
      ${head}
      <text x="12" y="20" fill="#5a6a80" font-family="JetBrains Mono, monospace" font-size="9" letter-spacing="1.5">${p.label.toUpperCase()}</text>
    </svg>`;
  });
}
