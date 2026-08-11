/**
 * Typed-answer matching for country questions.
 *
 * Both sides are normalised hard (case, diacritics, punctuation, the noise
 * words "the"/"and", "st." -> "saint") and then judged in this order:
 *   exact       - names THIS country: official name or a known alias
 *   alias-other - exactly names a DIFFERENT country, so the UI can say
 *                 "that's Peru" instead of a bare "wrong"
 *   no          - a known near miss (England for the UK, "Korea", ...)
 *   close       - a typo: Damerau-Levenshtein inside a length-scaled budget
 * Naming some other real place always outranks a fuzzy hit, so `close` never
 * fires for an input that is itself somebody's name.
 */

// Letters NFD cannot decompose into base + combining mark.
const TRANSLIT = {
  ø: 'o', đ: 'd', ð: 'd', ł: 'l', ß: 'ss', æ: 'ae', œ: 'oe', þ: 'th', ı: 'i'
};

/**
 * Canonical form of a typed or official name. Idempotent: the output has no
 * diacritics, no punctuation, no "and" tokens and never leads with "the"/"st".
 */
export function normalizeName(s) {
  if (typeof s !== 'string') return '';
  const folded = s
    .toLowerCase()
    .replace(/[øđðłßæœþı]/g, ch => TRANSLIT[ch])
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // apostrophes vanish ("cote d'ivoire" -> "cote divoire"); everything else
    // that is not a letter or digit becomes a separator. "U.S.A." must collapse
    // to "usa", so periods and commas are dropped rather than spaced.
    .replace(/['\u2018\u2019\u02bc`\u00b4.,]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ');

  const tokens = [];
  for (const t of folded.split(' ')) {
    if (t && t !== 'and') tokens.push(t);
  }
  while (tokens.length && tokens[0] === 'the') tokens.shift();
  if (tokens[0] === 'st') tokens[0] = 'saint';
  return tokens.join(' ');
}

/**
 * id -> every spelling a learner might reasonably type for it. Written this
 * way round because it is the readable direction; flattened below into the
 * normalised lookup the matcher actually uses. Canonical names are not
 * repeated here, they come from the country record.
 */
const ALIAS_SOURCE = {
  // Americas
  USA: ['usa', 'u.s.a.', 'us', 'u.s.', 'united states of america', 'america'],
  MEX: ['united mexican states'],
  BRA: ['brasil', 'federative republic of brazil'],
  BOL: ['plurinational state of bolivia'],
  VEN: ['bolivarian republic of venezuela'],
  SUR: ['surinam', 'dutch guiana'],
  GUY: ['british guiana'],
  BLZ: ['british honduras'],
  DOM: ['dominican rep'],
  TTO: ['trinidad'],
  ATG: ['antigua'],
  KNA: ['saint kitts', 'saint christopher and nevis'],
  VCT: ['saint vincent', 'saint vincent and grenadines'],

  // Europe
  GBR: ['uk', 'u.k.', 'great britain', 'britain',
    'united kingdom of great britain and northern ireland'],
  IRL: ['republic of ireland', 'eire'],
  NLD: ['holland', 'kingdom of the netherlands'],
  DEU: ['deutschland', 'federal republic of germany'],
  ESP: ['españa', 'kingdom of spain'],
  ITA: ['italia', 'italian republic'],
  GRC: ['hellas', 'hellenic republic'],
  CHE: ['swiss', 'swiss confederation', 'helvetia'],
  CZE: ['czech republic', 'czech', 'czech rep'],
  SVK: ['slovak republic'],
  MKD: ['macedonia', 'fyrom', 'former yugoslav republic of macedonia'],
  BIH: ['bosnia', 'bosnia herzegovina'],
  MDA: ['republic of moldova'],
  BLR: ['byelorussia', 'belorussia'],
  RUS: ['russian federation'],
  VAT: ['vatican', 'holy see', 'vatican city state'],
  TUR: ['türkiye', 'turkiye', 'republic of turkey'],

  // Africa
  CIV: ['ivory coast', 'cote d ivoire', "côte d'ivoire"],
  CPV: ['cape verde'],
  COD: ['dr congo', 'drc', 'democratic republic of congo', 'congo kinshasa',
    'congo drc', 'zaire'],
  COG: ['congo brazzaville', 'republic of congo', 'congo republic'],
  CAF: ['car', 'central african rep'],
  STP: ['sao tome', 'são tomé', 'sao tome and principe'],
  SWZ: ['swaziland', 'kingdom of eswatini'],
  TZA: ['united republic of tanzania', 'tanganyika'],
  ZWE: ['rhodesia', 'southern rhodesia'],
  ZMB: ['northern rhodesia'],
  MWI: ['nyasaland'],
  LSO: ['basutoland'],
  BWA: ['bechuanaland'],
  NAM: ['south west africa'],
  ZAF: ['rsa', 'republic of south africa'],
  ETH: ['abyssinia'],
  BFA: ['burkina', 'upper volta'],
  BEN: ['dahomey'],
  GHA: ['gold coast'],
  EGY: ['arab republic of egypt'],
  MAR: ['kingdom of morocco'],
  CMR: ['cameroun'],
  LBY: ['state of libya'],

  // Middle East and Asia
  ARE: ['uae', 'u.a.e.', 'emirates'],
  SAU: ['saudi', 'ksa', 'kingdom of saudi arabia'],
  SYR: ['syrian arab republic'],
  PSE: ['palestinian territories', 'palestinian territory', 'state of palestine'],
  KOR: ['south korea', 'republic of korea', 's korea', 'korea south'],
  PRK: ['north korea', 'dprk', 'n korea', 'korea north',
    "democratic people's republic of korea"],
  CHN: ['prc', "people's republic of china", 'mainland china'],
  JPN: ['nippon', 'nihon'],
  IND: ['bharat', 'republic of india'],
  LKA: ['ceylon'],
  MMR: ['burma'],
  THA: ['siam'],
  KHM: ['kampuchea'],
  LAO: ['lao', 'lao pdr', "lao people's democratic republic"],
  VNM: ['viet nam', 'socialist republic of vietnam'],
  TLS: ['east timor'],
  BRN: ['brunei darussalam'],
  PHL: ['republic of the philippines'],
  KGZ: ['kyrgyz republic', 'kirghizia'],
  KAZ: ['republic of kazakhstan'],
  FSM: ['federated states of micronesia'],

  // Oceania
  PNG: ['png'],
  NZL: ['aotearoa'],
  WSM: ['western samoa'],
  VUT: ['new hebrides']
};

/** Normalised alias -> ISO3 id. Keys are pre-normalised, so lookups are O(1). */
export const ALIASES = Object.freeze(buildAliases());

/** ISO3 id -> its normalised aliases, for fuzzy matching against a target. */
const ALIASES_BY_ID = buildByIdIndex();

function buildAliases() {
  const out = {};
  for (const id of Object.keys(ALIAS_SOURCE)) {
    for (const raw of ALIAS_SOURCE[id]) {
      const key = normalizeName(raw);
      if (key) out[key] = id;
    }
  }
  return out;
}

function buildByIdIndex() {
  const out = new Map();
  for (const key of Object.keys(ALIASES)) {
    const id = ALIASES[key];
    const list = out.get(id);
    if (list) list.push(key);
    else out.set(id, [key]);
  }
  return out;
}

/**
 * Inputs that name a real place which is NOT one of the 195 answers, or that
 * are too vague to be one. Value is the reason, shown by the UI on a miss.
 */
export const NEAR_MISS = Object.freeze(buildNearMiss({
  'england': 'part of the United Kingdom',
  'scotland': 'part of the United Kingdom',
  'wales': 'part of the United Kingdom',
  'northern ireland': 'part of the United Kingdom, not the Republic of Ireland',
  'korea': 'say North Korea or South Korea',
  'congo': 'two countries share the name: DR Congo and Republic of the Congo',
  'taiwan': 'not a UN member state, so it is not in this quiz',
  'kosovo': 'not a UN member state, so it is not in this quiz',
  'hong kong': 'a special administrative region of China, not a country here',
  'macau': 'a special administrative region of China, not a country here',
  'tibet': 'part of China',
  'greenland': 'part of the Kingdom of Denmark',
  'puerto rico': 'a territory of the United States',
  'siberia': 'part of Russia',
  'scandinavia': 'a region, not a country'
}));

function buildNearMiss(raw) {
  const out = {};
  for (const key of Object.keys(raw)) out[normalizeName(key)] = raw[key];
  return out;
}

/**
 * Damerau-Levenshtein (optimal string alignment) distance.
 * O(a*b) time, O(min(a,b)) space via three rolling rows.
 */
export function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  // Shorter string on the row axis keeps the rows at O(min) width.
  if (a.length > b.length) { const t = a; a = b; b = t; }

  const n = a.length;
  let prev2 = new Array(n + 1).fill(0);
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let i = 0; i <= n; i++) prev[i] = i;

  for (let j = 1; j <= b.length; j++) {
    cur[0] = j;
    const bj = b.charCodeAt(j - 1);
    for (let i = 1; i <= n; i++) {
      const cost = a.charCodeAt(i - 1) === bj ? 0 : 1;
      let v = prev[i] + 1;
      const ins = cur[i - 1] + 1;
      if (ins < v) v = ins;
      const sub = prev[i - 1] + cost;
      if (sub < v) v = sub;
      if (i > 1 && j > 1 &&
          a.charCodeAt(i - 1) === b.charCodeAt(j - 2) &&
          a.charCodeAt(i - 2) === bj) {
        const swap = prev2[i - 2] + cost;
        if (swap < v) v = swap;
      }
      cur[i] = v;
    }
    const spare = prev2;
    prev2 = prev;
    prev = cur;
    cur = spare;
  }
  return prev[n];
}

/** Typo budget: longer names earn more slack, very short ones get none. */
function tolerance(len) {
  if (len <= 3) return 0;
  if (len <= 8) return 1;
  if (len <= 14) return 2;
  return 3;
}

const targetCache = new Map();

/** Normalised name plus every alias of `country`, memoised per record. */
function targetsFor(country) {
  const key = country.id + '\u0000' + country.name;
  let targets = targetCache.get(key);
  if (!targets) {
    targets = [normalizeName(country.name)];
    const aliases = ALIASES_BY_ID.get(country.id);
    if (aliases) {
      for (const a of aliases) if (a !== targets[0]) targets.push(a);
    }
    targetCache.set(key, targets);
  }
  return targets;
}

/** ISO3 id that `input` exactly names, or null. Canonical names win over aliases. */
export function identify(input, countries) {
  const n = normalizeName(input);
  if (!n) return null;
  if (countries) {
    for (const c of countries) if (normalizeName(c.name) === n) return c.id;
  }
  return ALIASES[n] || null;
}

/**
 * 'exact' | 'close' | 'alias-other' | 'no'.
 * `countries` is optional; without it we cannot tell that an unknown-but-valid
 * name belongs to someone else, so those inputs fall back to 'no'.
 */
export function matchName(input, country, countries) {
  const n = normalizeName(input);
  if (!n) return 'no';

  const targets = targetsFor(country);
  for (const t of targets) if (t === n) return 'exact';

  // Naming a different real country beats any fuzzy interpretation.
  const other = countries ? identify(n, countries) : (ALIASES[n] || null);
  if (other && other !== country.id) return countries ? 'alias-other' : 'no';

  if (NEAR_MISS[n]) return 'no';

  for (const t of targets) {
    if (editDistance(n, t) <= tolerance(t.length)) return 'close';
  }
  return 'no';
}
