#!/usr/bin/env node
// Builds data/countries.json (the only runtime data file) from Natural Earth 50m.
//
//   node scripts/build-data.mjs
//
// Sources (downloaded once into .cache/, safe to delete):
//   ne_50m_admin_0_countries.geojson  -> borders, names, region
//   ne_50m_populated_places.geojson   -> capital city name + position (used as a hint)
//
// Output shape:
//   { generated, source, count, sets: [{n,ids}],
//     countries: [ {id,name,region,subregion,capital,capitalLL,area,pop,gdp,
//                   score,rank,set,bbox,center,polys} ] }
// where polys is an array of rings, each ring a flat [lon,lat,lon,lat,...] array
// rounded to 2dp, and rank/set/sets come from the importance score below.

import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = resolve(ROOT, '.cache');
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';

// The 195 UN member + observer states, keyed by Natural Earth's ADM0_A3.
// (South Sudan is "SDS" and Palestine is "PSX" in Natural Earth.)
const UN_STATES = `
AFG ALB DZA AND AGO ATG ARG ARM AUS AUT AZE BHS BHR BGD BRB BLR BEL BLZ BEN BTN
BOL BIH BWA BRA BRN BGR BFA BDI CPV KHM CMR CAN CAF TCD CHL CHN COL COM COG COD
CRI CIV HRV CUB CYP CZE DNK DJI DMA DOM ECU EGY SLV GNQ ERI EST SWZ ETH FJI FIN
FRA GAB GMB GEO DEU GHA GRC GRD GTM GIN GNB GUY HTI HND HUN ISL IND IDN IRN IRQ
IRL ISR ITA JAM JPN JOR KAZ KEN KIR PRK KOR KWT KGZ LAO LVA LBN LSO LBR LBY LIE
LTU LUX MDG MWI MYS MDV MLI MLT MHL MRT MUS MEX FSM MDA MCO MNG MNE MAR MOZ MMR
NAM NRU NPL NLD NZL NIC NER NGA MKD NOR OMN PAK PLW PAN PNG PRY PER PHL POL PRT
QAT ROU RUS RWA KNA LCA VCT WSM SMR STP SAU SEN SRB SYC SLE SGP SVK SVN SLB SOM
ZAF SDS ESP LKA SDN SUR SWE CHE SYR TJK TZA THA TLS TGO TON TTO TUN TUR TKM TUV
UGA UKR ARE GBR USA URY UZB VUT VEN VNM YEM ZMB ZWE PSX VAT
`.trim().split(/\s+/);

// ISO 3166-1 alpha-3 where Natural Earth's ADM0_A3 differs, plus display names
// preferred over Natural Earth's abbreviated NAME field.
const OVERRIDES = {
  SDS: { id: 'SSD', name: 'South Sudan' },
  PSX: { id: 'PSE', name: 'Palestine' },
  ATG: { name: 'Antigua and Barbuda' },
  BIH: { name: 'Bosnia and Herzegovina' },
  BRN: { name: 'Brunei' },
  CAF: { name: 'Central African Republic' },
  COD: { name: 'Democratic Republic of the Congo' },
  COG: { name: 'Republic of the Congo' },
  CIV: { name: "Côte d'Ivoire" },
  CZE: { name: 'Czechia' },
  DOM: { name: 'Dominican Republic' },
  GNQ: { name: 'Equatorial Guinea' },
  FSM: { name: 'Micronesia' },
  GNB: { name: 'Guinea-Bissau' },
  MHL: { name: 'Marshall Islands' },
  MKD: { name: 'North Macedonia' },
  PRK: { name: 'North Korea' },
  KOR: { name: 'South Korea' },
  KNA: { name: 'Saint Kitts and Nevis' },
  LCA: { name: 'Saint Lucia' },
  VCT: { name: 'Saint Vincent and the Grenadines' },
  STP: { name: 'São Tomé and Príncipe' },
  SLB: { name: 'Solomon Islands' },
  ZAF: { name: 'South Africa' },
  SSD: { name: 'South Sudan' },
  ARE: { name: 'United Arab Emirates' },
  GBR: { name: 'United Kingdom' },
  USA: { name: 'United States' },
  TZA: { name: 'Tanzania' },
  VAT: { name: 'Vatican City' },
  SWZ: { name: 'Eswatini' },
  TLS: { name: 'Timor-Leste' },
  BHS: { name: 'Bahamas' },
  GMB: { name: 'Gambia' },
  NLD: { name: 'Netherlands' },
  PHL: { name: 'Philippines' },
  TUR: { name: 'Turkey' },
};

// Natural Earth's CONTINENT, normalised to the six quiz regions.
const REGION = {
  Africa: 'Africa',
  Asia: 'Asia',
  Europe: 'Europe',
  'North America': 'North America',
  'South America': 'South America',
  Oceania: 'Oceania',
  'Seven seas (open ocean)': 'Africa', // Seychelles, Mauritius, ...
};

// Natural Earth files a few island states under an ocean rather than a landmass.
const REGION_FIX = { MDV: 'Asia' };

async function fetchCached(name) {
  await mkdir(CACHE, { recursive: true });
  const path = resolve(CACHE, name);
  try {
    await stat(path);
  } catch {
    process.stderr.write(`downloading ${name}...\n`);
    const res = await fetch(NE + name);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    await writeFile(path, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(await readFile(path, 'utf8'));
}

/* ---------------------------------------------------------------- geometry */

const R = 6371; // km
const rad = (d) => (d * Math.PI) / 180;

// Ramer-Douglas-Peucker on a closed ring of [lon,lat] pairs. Distances are in
// degrees scaled by cos(lat) so that tolerance means roughly the same thing at
// every latitude instead of collapsing high-latitude coastlines.
function simplifyRing(ring, tol) {
  if (ring.length < 5) return ring;
  const kx = Math.cos(rad(ring.reduce((s, p) => s + p[1], 0) / ring.length)) || 0.05;
  const seg = (a, b, p) => {
    const ax = a[0] * kx, ay = a[1], bx = b[0] * kx, by = b[1], px = p[0] * kx, py = p[1];
    const dx = bx - ax, dy = by - ay;
    const len = dx * dx + dy * dy;
    let t = len ? ((px - ax) * dx + (py - ay) * dy) / len : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = ax + t * dx - px, ey = ay + t * dy - py;
    return Math.hypot(ex, ey);
  };
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [lo, hi] = stack.pop();
    let best = -1, bestD = tol;
    for (let i = lo + 1; i < hi; i++) {
      const d = seg(ring[lo], ring[hi], ring[i]);
      if (d > bestD) { bestD = d; best = i; }
    }
    if (best > 0) {
      keep[best] = 1;
      stack.push([lo, best], [best, hi]);
    }
  }
  const out = [];
  for (let i = 0; i < ring.length; i++) if (keep[i]) out.push(ring[i]);
  return out.length >= 4 ? out : ring;
}

// Signed area in square degrees; sign gives winding, magnitude ranks rings.
function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return a / 2;
}

// Geodesic area of a ring in km^2 (spherical excess), used for difficulty tiers.
function ringAreaKm2(ring) {
  let total = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    total += rad(ring[i][0] - ring[j][0]) * (2 + Math.sin(rad(ring[j][1])) + Math.sin(rad(ring[i][1])));
  }
  return Math.abs((total * R * R) / 2);
}

function ringsOf(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  // Outer rings only: holes are invisible at quiz zoom levels and doubling the
  // path data to draw Lesotho's cutout inside South Africa is not worth it.
  return polys.map((p) => p[0]).filter((r) => r && r.length >= 4);
}

/* -------------------------------------------------------------------- main */

const countries = await fetchCached('ne_50m_admin_0_countries.geojson');
const places = await fetchCached('ne_50m_populated_places.geojson');

// Natural Earth marks secondary seats as "Admin-0 capital alt" - Kyoto for
// Japan, Laayoune for Morocco, Baguio for the Philippines. They sort ahead of
// the real entry, and this loop keeps the first hit, so a substring test here
// silently swaps in the wrong city. Match the class exactly.
const capitals = new Map();
for (const f of places.features) {
  const p = f.properties;
  if (p.FEATURECLA !== 'Admin-0 capital') continue;
  const key = p.ADM0_A3 || p.SOV_A3;
  if (!key || capitals.has(key)) continue;
  // Natural Earth ships "Washington,  D.C." with a doubled space.
  const name = p.NAME.replace(/\s+/g, ' ').trim();
  capitals.set(key, { name, ll: f.geometry.coordinates.map((v) => +v.toFixed(3)) });
}

// Capitals Natural Earth files under a different admin code, omits entirely,
// or lists several with no way to rank them. The second group is a
// judgement call about what a geography quiz should teach: the seat of
// government where a country has one, otherwise the constitutional capital.
const CAPITAL_FIX = {
  SDS: { name: 'Juba', ll: [31.58, 4.85] },
  PSX: { name: 'Ramallah', ll: [35.2, 31.9] },
  VAT: { name: 'Vatican City', ll: [12.45, 41.9] },
  MCO: { name: 'Monaco', ll: [7.42, 43.73] },
  SGP: { name: 'Singapore', ll: [103.85, 1.29] },
  NRU: { name: 'Yaren', ll: [166.92, -0.55] },
  TUV: { name: 'Funafuti', ll: [179.2, -8.52] },
  CHE: { name: 'Bern', ll: [7.45, 46.95] },
  NLD: { name: 'Amsterdam', ll: [4.9, 52.37] },
  BOL: { name: 'Sucre', ll: [-65.26, -19.05] },
  // Four cities are filed as capitals of South Africa; Pretoria is the
  // executive seat and the answer every atlas gives.
  ZAF: { name: 'Pretoria', ll: [28.23, -25.71] },
  // Official capitals that Natural Earth ranks behind the largest city.
  TZA: { name: 'Dodoma', ll: [35.75, -6.183] },
  BEN: { name: 'Porto-Novo', ll: [2.617, 6.483] },
  LKA: { name: 'Sri Jayawardenepura Kotte', ll: [79.95, 6.9] },
};

const out = [];
const missing = new Set(UN_STATES);

for (const f of countries.features) {
  const p = f.properties;
  const a3 = p.ADM0_A3;
  if (!missing.has(a3)) continue;
  missing.delete(a3);

  const ov = OVERRIDES[a3] || {};
  const id = ov.id || a3;
  const rings = ringsOf(f.geometry)
    .map((r) => ({ r, a: Math.abs(ringArea(r)), km2: ringAreaKm2(r) }))
    .sort((x, y) => y.a - x.a);

  const totalKm2 = rings.reduce((s, x) => s + x.km2, 0);
  // Keep every island big enough to see, and always the largest ring; the cap
  // stops Kiribati's 30 atolls from outweighing all of Europe in file size.
  const kept = rings.filter((x, i) => i === 0 || x.a > 0.004).slice(0, 40);

  const polys = [];
  let bbox = [180, 90, -180, -90];
  let cx = 0, cy = 0, cw = 0;
  for (const { r, a } of kept) {
    const s = simplifyRing(r, 0.06);
    const flat = new Array(s.length * 2);
    let sx = 0, sy = 0;
    for (let i = 0; i < s.length; i++) {
      const lon = +s[i][0].toFixed(2), lat = +s[i][1].toFixed(2);
      flat[i * 2] = lon;
      flat[i * 2 + 1] = lat;
      sx += lon; sy += lat;
      if (lon < bbox[0]) bbox[0] = lon;
      if (lat < bbox[1]) bbox[1] = lat;
      if (lon > bbox[2]) bbox[2] = lon;
      if (lat > bbox[3]) bbox[3] = lat;
    }
    polys.push(flat);
    const w = a || 1e-6;
    cx += (sx / s.length) * w; cy += (sy / s.length) * w; cw += w;
  }

  const cap = CAPITAL_FIX[a3] || capitals.get(a3) || null;
  // Label/marker anchor: the capital when we have one (always inside the
  // country), else the area-weighted mean of ring centroids.
  const center = cap ? cap.ll : [+(cx / cw).toFixed(2), +(cy / cw).toFixed(2)];

  out.push({
    id,
    name: ov.name || p.NAME,
    region: REGION_FIX[a3] || REGION[p.CONTINENT] || p.CONTINENT,
    subregion: p.SUBREGION,
    capital: cap ? cap.name : null,
    capitalLL: cap ? cap.ll : null,
    area: Math.round(totalKm2),
    pop: p.POP_EST || null,
    gdp: p.GDP_MD > 0 ? p.GDP_MD : null, // millions USD; NE uses -99 for no data (Vatican)
    bbox,
    center,
    polys,
  });
}

if (missing.size) throw new Error(`no geometry for: ${[...missing].join(' ')}`);

/* ------------------------------------------------------------- backdrop */

// Everything that is *not* a quiz answer: dependencies, disputed territories,
// Antarctica. Without these the map has holes where Greenland, Taiwan and
// Western Sahara belong, which reads as a rendering bug rather than as "not a
// UN member". Geometry only - no name, no id, never clickable - and simplified
// harder than the real countries because nothing is ever zoomed to it.
const land = [];
for (const f of countries.features) {
  if (UN_STATES.includes(f.properties.ADM0_A3)) continue;
  const rings = ringsOf(f.geometry)
    .map((r) => ({ r, a: Math.abs(ringArea(r)) }))
    .sort((x, y) => y.a - x.a);
  for (const { r, a } of rings.filter((x, i) => i === 0 || x.a > 0.01).slice(0, 12)) {
    const s = simplifyRing(r, 0.12);
    const flat = new Array(s.length * 2);
    for (let i = 0; i < s.length; i++) {
      flat[i * 2] = +s[i][0].toFixed(2);
      flat[i * 2 + 1] = +s[i][1].toFixed(2);
    }
    land.push(flat);
  }
}

/* ------------------------------------------------------------ importance */

// "Geopolitical importance" is a value judgement, so the recipe is kept dumb
// and inspectable instead of hand-tuned: three log-scaled size measures plus
// flat bonuses for the seats that give a country reach beyond its size.
// Memberships are as of 2025.
const P5 = ['CHN', 'FRA', 'RUS', 'GBR', 'USA'];
const G20 = [
  'ARG', 'AUS', 'BRA', 'CAN', 'DEU', 'IND', 'IDN', 'ITA',
  'JPN', 'KOR', 'MEX', 'SAU', 'ZAF', 'TUR',
];
const EU = [
  'AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA',
  'DEU', 'GRC', 'HUN', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD',
  'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE',
];

// gdp/pop/area each span six orders of magnitude, so normalise log10 rather
// than the raw value; missing or zero scores 0 outright (which is also what
// the formula gives whenever the smallest country sets min = log10(1) = 0).
function normalise(key) {
  const logs = out.map((c) => (c[key] > 0 ? Math.log10(1 + c[key]) : 0));
  const min = Math.min(...logs), max = Math.max(...logs);
  return out.map((c, i) => (c[key] > 0 ? (logs[i] - min) / (max - min) : 0));
}

const gdp01 = normalise('gdp');
const pop01 = normalise('pop');
const area01 = normalise('area');

out.forEach((c, i) => {
  const base = 0.45 * gdp01[i] + 0.35 * pop01[i] + 0.20 * area01[i];
  let bonus = 0;
  if (P5.includes(c.id)) bonus += 0.60;
  else if (G20.includes(c.id)) bonus += 0.25;
  if (EU.includes(c.id)) bonus += 0.10; // punching above their size via the bloc
  c.score = +(base + bonus).toFixed(4);
});

// Rank order is the study order; name breaks score ties so builds are stable.
const ranked = [...out].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
const SET_SIZE = 15; // 195 = 13 * 15, so every set is full
ranked.forEach((c, i) => {
  c.rank = i + 1;
  c.set = Math.floor(i / SET_SIZE) + 1;
});
const sets = [];
for (let i = 0; i < ranked.length; i += SET_SIZE) {
  sets.push({ n: sets.length + 1, ids: ranked.slice(i, i + SET_SIZE).map((c) => c.id) });
}

out.sort((a, b) => a.name.localeCompare(b.name));

const payload = {
  generated: new Date().toISOString().slice(0, 10),
  source: 'Natural Earth 50m (public domain) via natural-earth-vector',
  count: out.length,
  sets,
  countries: out,
  land,
};

await mkdir(resolve(ROOT, 'data'), { recursive: true });
const file = resolve(ROOT, 'data/countries.json');
await writeFile(file, JSON.stringify(payload));
const { size } = await stat(file);
const byRegion = {};
for (const c of out) byRegion[c.region] = (byRegion[c.region] || 0) + 1;
process.stderr.write(
  `wrote data/countries.json  ${out.length} countries  ` +
    `${(size / 1024).toFixed(0)} KB (${size} bytes)\n` +
    Object.entries(byRegion).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${k}: ${v}`).join('\n') +
    `\n  no capital: ${out.filter((c) => !c.capital).map((c) => c.id).join(' ') || 'none'}\n` +
    `  ${sets.length} sets of ${SET_SIZE}\n` +
    `  ${land.length} backdrop rings (dependencies, disputed, Antarctica)\n` +
    `  set 1: ${ranked.slice(0, SET_SIZE).map((c) => c.name).join(', ')}\n`
);
