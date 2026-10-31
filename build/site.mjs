// Site-wide data: navigation, footer, contact details. Pulled from the original
// allmarcindia.com header, mega menu and footer so every section stays reachable.

export const ORIGIN = 'https://allmarcindia.com';

export const CONTACT = {
  phones: ['+91 72029 66648', '+91 99986 56402', '+91 73593 27999'],
  emails: ['sales@allmarcindia.com', 'info@allmarcindia.com'],
  factory: 'S/N 587, Kanbha-Kuha Rd, Kanbha Gam, Ahmedabad, Gujarat 382430',
  office: '601, Meadows, Sahar Plaza, Andheri (E), Mumbai, Maharashtra',
  social: [
    ['LinkedIn', 'https://www.linkedin.com/company/allmarc-industries/'],
    ['YouTube', 'https://www.youtube.com/channel/UC2voTEOvln8phJ0MgIf5Ddg'],
    ['Instagram', 'https://instagram.com/allmarcindustries/'],
    ['Facebook', 'https://www.facebook.com/allmarcindia'],
    ['X', 'https://x.com/allmarcgroup'],
  ],
};

// Mega menu. Each panel: intro, link columns, feature card.
export const NAV = [
  {
    label: 'Oil & Gas', href: '/oil-and-gas', blurb: 'Flare systems, vessels, process and offshore steel, fabricated to licensor drawings and shipped worldwide.',
    feature: { img: '/models/renders/egf-combustion-chamber.webp', title: 'The whole plant in 3D', href: '/oil-and-gas#plant-3d' },
    cols: [
      ['Flare & combustion', [
        ['EGF Combustion Chambers', '/oil-and-gas/enclosed-ground-flare-combustion-chambers'],
        ['Elevated Flare Stacks', '/oil-and-gas/elevated-flare-stacks'],
        ['Flare Support Derricks', '/oil-and-gas/flare-support-derricks'],
        ['Wind Fences & Enclosures', '/oil-and-gas/wind-fences-and-enclosures'],
        ['Liquid Seal Drums', '/oil-and-gas/liquid-seal-drums'],
        ['Knock-Out Drums', '/oil-and-gas/knock-out-drums'],
        ['Stacks, Silencers & Ducting', '/oil-and-gas/stacks-silencers-and-ducting'],
      ]],
      ['Process & marine', [
        ['Process Skids & Modules', '/oil-and-gas/process-skids-and-modules'],
        ['Pipe Racks & Access Platforms', '/oil-and-gas/pipe-racks-and-access-platforms'],
        ['Marine Loading Platforms', '/oil-and-gas/marine-loading-platforms'],
        ['Hydraulic Jacking Units', '/oil-and-gas/hydraulic-jacking-units'],
        ['Jack-Up Barges', '/oil-and-gas/jack-up-barges'],
        ['Pile Manipulators', '/oil-and-gas/pile-manipulators'],
        ['Spud Barges, Spuds & Wells', '/oil-and-gas/spud-barges-spuds-and-spud-wells'],
      ]],
      ['HSE & access', [
        ['Anti-Slip Grating', '/oil-and-gas/anti-slip-grating'],
        ['Caged Ladders & Railings', '/oil-and-gas/caged-ladders-and-railings'],
        ['Stair Towers & Platforms', '/oil-and-gas/stair-towers-and-platforms'],
        ['Multi-level Access Platforms', '/oil-and-gas/multi-level-access-platforms'],
        ['Fall-Protection Anchors', '/oil-and-gas/fall-protection-anchor-structures'],
        ['Wind Shields for Walkways', '/oil-and-gas/wind-shields-for-walkways'],
        ['Marine & Dredging', '/marine-and-dredging'],
      ]],
    ],
  },
  {
    label: 'Renewables', href: '/renewables', blurb: 'Solar tracker parts, rooftop safety, wind tower internals, nacelle frames and offshore foundations.',
    feature: { img: '/img/news/renewables-3d.webp', title: 'The renewables park in 3D', href: '/renewables#park-3d' },
    cols: [
      ['Solar', [
        ['Tube Connector Preassembly', '/renewables/solar-tube-connector-preassembly'],
        ['Slew Drive Seats', '/renewables/solar-slew-drive-seats'],
        ['Lifeline & Handrail Base Plates', '/renewables/rooftop-lifeline-and-handrail-base-plates'],
        ['Solar Walkways & Stairs', '/renewables/solar-walkways-and-stairs'],
        ['Inverter Rooms & Skids', '/renewables/inverter-and-transformer-skids'],
      ]],
      ['Wind', [
        ['Tower Internals', '/renewables/wind-tower-internals'],
        ['Nacelle Skeleton Frames', '/renewables/nacelle-skeleton-frames'],
        ['Tower Sections & Joints', '/renewables/wind-tower-sections-and-joints'],
        ['Transition Piece Platforms', '/renewables/offshore-wind-transition-piece-platforms'],
        ['Offshore Tripod Foundations', '/renewables/offshore-wind-tripod-foundations'],
        ['Floating Wind Foundation Blocks', '/renewables/floating-wind-foundation-blocks'],
        ['Blade Transport Fixtures', '/renewables/blade-and-tower-transport-frames'],
      ]],
      ['Hydro, H₂ & more', [
        ['Penstock & Intake Supports', '/renewables/penstock-and-intake-support-structures'],
        ['Spillway Radial Gates', '/renewables/spillway-radial-gates-and-frames'],
        ['Electrolyser Stack Frames', '/renewables/electrolyser-stack-frames'],
        ['Carbon Capture Structures', '/renewables/carbon-capture-unit-structures'],
        ['BESS Container Skids', '/renewables/bess-container-skids-and-enclosures'],
        ['Tidal Turbine Supports', '/renewables/tidal-turbine-support-structures'],
      ]],
    ],
  },
  {
    label: 'Fabrication', href: '/products/custom-fabrication', blurb: 'Heavy plate, pressure parts, precision repeat work and space frames, trial-assembled before they ship.',
    feature: { img: '/models/renders/space-frames.webp', title: 'Space frames: about 10,000 T a year', href: '/products/space-frames' },
    cols: [
      ['Capabilities', [
        ['Custom & Heavy Fabrication', '/products/custom-fabrication'],
        ['Pressure Part Fabrication', '/blog/pressure-part-fabrication-allmarc-industries'],
        ['Precision Fabrication', '/blog/precision-fabrication-allmarc-industries'],
        ['Space Frames', '/products/space-frames'],
      ]],
      ['Our works', [
        ['Competency', '/competency'],
        ['Machinery & Infrastructure', '/competency/machinery'],
        ['Our Processes, on Film', '/competency/machinery#processes'],
        ['Projects', '/projects'],
        ['Gallery', '/gallery'],
      ]],
      ['Signature builds', [
        ['EGF combustion chambers', '/oil-and-gas/enclosed-ground-flare-combustion-chambers'],
        ['Pylon anchor boxes', '/industries/construction-building-and-infrastructure/pylon-anchor-boxes'],
        ['Crusher & screening structures', '/industries/mining-and-material-handling/crusher-and-screening-structures'],
        ['Grip-Strut anti-slip planks', '/products/decking-safety-access-systems/grip-strut'],
      ]],
    ],
  },
  {
    label: 'Industries', href: '/industries', blurb: '12 industries, 4 plants, one site at Kanbha, Ahmedabad.',
    feature: { img: '/models/renders/stainless-steel-flyover-piers-and-girders.webp', title: 'Stainless steel flyover girders', href: '/industries/construction-building-and-infrastructure/stainless-steel-flyover-piers-and-girders' },
    cols: [
      ['Energy & heavy', [
        ['Oil & Gas', '/oil-and-gas'],
        ['Renewables', '/renewables'],
        ['Power, Utilities & Data Centres', '/industries/power-renewables-utlities'],
        ['Cement & Heavy Industry', '/industries/cement-and-heavy-industry'],
        ['Mining & Material Handling', '/industries/mining-and-material-handling'],
      ]],
      ['Infrastructure', [
        ['Bridges, Metro & Roads', '/industries/construction-building-and-infrastructure'],
        ['High-Speed Rail', '/industries/high-speed-rail'],
        ['Ports, Jetties & Marine', '/industries/ports-and-marine'],
        ['Marine & Dredging Contractors', '/marine-and-dredging'],
        ['Pre-Engineered Buildings', '/industries/pre-engineered-buildings'],
      ]],
      ['Machines & mobility', [
        ['Mobile Equipment, Rail & Transport', '/industries/transportation-equipment-manufacturing'],
        ['Construction & Mining Equipment', '/industries/construction-equipment-makers'],
        ['Manufacturing & Machine Building', '/industries/manufacturing'],
        ['Multi-storey Steel Buildings', '/industries/pre-engineered-buildings/multi-storey-steel-buildings'],
      ]],
    ],
  },
  {
    label: 'Products', href: '/products', blurb: 'Moulds, formwork, scaffolding, decking, access systems and Grip-Strut, made on our own lines.',
    feature: { img: '/models/renders/accropode-mould-systems.webp', title: 'Accropode mould systems', href: '/products/precast_infrastructure_moulds/accropode-mould-systems' },
    cols: [
      ['Moulds & formwork', [
        ['Precast Infrastructure Moulds', '/products/precast_infrastructure_moulds'],
        ['Cast-in-situ Moulds', '/products/cast_in-situ_mould'],
        ['Speciality Formwork', '/products/speciality_formwork'],
        ['Infrastructure & Building Formwork', '/products/infrastructure-and-building-formwork'],
        ['Formwork, Scaffolding & Shoring', '/products/formwork-scaffolding-and-shoring'],
        ['Precast Concrete Elements', '/products/precast'],
      ]],
      ['Decking & access', [
        ['Decking & Safety Access', '/products/decking-safety-access-systems'],
        ['Grip-Strut', '/products/decking-safety-access-systems/grip-strut'],
        ['Solar Walkways', '/products/decking-safety-access-systems/solar-walkways'],
        ['Rooftop Walkways', '/products/decking-safety-access-systems/rooftop-walkways'],
        ['Industrial Access Systems', '/products/decking-safety-access-systems/access-systems'],
      ]],
      ['Scaffolding', [
        ['Scaffolding & Shoring', '/products/scaffolding-shoring'],
        ['Cuplock System', '/products/scaffolding-shoring/cuplock-system'],
        ['Ring Lock System', '/products/scaffolding-shoring/ring-lock-system'],
        ['Space Frames', '/products/space-frames'],
      ]],
    ],
  },
  {
    label: 'Company', href: '/about-allmarc', blurb: 'From a 400 sq ft workshop in 2010 to 4 plants and 500+ people.',
    feature: { img: '/img/real/allmarc-team-plant.webp', title: 'Build what others can’t: careers', href: '/careers' },
    cols: [
      ['About', [
        ['About Allmarc', '/about-allmarc'],
        ['History', '/about-allmarc/history'],
        ['Management', '/about-allmarc/management'],
        ['Clients', '/about-allmarc/clients'],
      ]],
      ['Work with us', [
        ['Projects', '/projects'],
        ['Careers', '/careers'],
        ['News & Insights', '/blog'],
        ['Gallery', '/gallery'],
      ]],
      ['Talk to us', [
        ['Contact', '/contact'],
        ['Download Brochure', '/download-brochure'],
        ['Customer Portal', ORIGIN + '/portal'],
      ]],
    ],
  },
];

export const FOOTER = [
  ['Oil & Gas', [
    ['Flare & Combustion', '/oil-and-gas#range'],
    ['Process Plant & Midstream', '/oil-and-gas#range'],
    ['Upstream & Offshore', '/oil-and-gas#range'],
    ['Marine Construction', '/oil-and-gas/jack-up-barges'],
    ['HSE & Access', '/oil-and-gas#range'],
    ['The whole plant in 3D', '/oil-and-gas#plant-3d'],
  ]],
  ['Industries', [
    ['Pre-Engineered Buildings', '/industries/pre-engineered-buildings'],
    ['High-Speed Rail & Railways', '/industries/high-speed-rail'],
    ['Construction & Infrastructure', '/industries/construction-building-and-infrastructure'],
    ['Renewables: solar, wind & storage', '/renewables'],
    ['Power, Renewables & Utilities', '/industries/power-renewables-utlities'],
    ['Manufacturing', '/industries/manufacturing'],
    ['Transportation Equipment', '/industries/transportation-equipment-manufacturing'],
  ]],
  ['Products', [
    ['Custom Fabrication', '/products/custom-fabrication'],
    ['Building & Infrastructure Formwork', '/products/infrastructure-and-building-formwork'],
    ['Scaffolding & Shoring', '/products/scaffolding-shoring'],
    ['Decking & Safety Access', '/products/decking-safety-access-systems'],
    ['Grip-Strut', '/products/decking-safety-access-systems/grip-strut'],
    ['Precast Concrete Elements', '/products/precast'],
  ]],
  ['Company', [
    ['About Allmarc', '/about-allmarc'],
    ['Projects', '/projects'],
    ['Machinery & Infrastructure', '/competency/machinery'],
    ['Competency', '/competency'],
    ['News & Insights', '/blog'],
    ['Gallery', '/gallery'],
    ['Customer portal', ORIGIN + '/portal'],
    ['Contact Us', '/contact'],
  ]],
];

export const CERTS = ['ISO 9001:2015', 'ISO 45001:2018', 'EN 1090-1', 'EN ISO 3834-3', 'RDSO', 'NHSRCL'];
