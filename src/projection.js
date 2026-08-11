// Robinson projection: pleasant world map, no polar area explosion, no Mercator
// lie that makes Greenland look like Africa. Table from Robinson's 1974 paper:
// XT = relative length of each parallel, YT = relative distance from equator,
// sampled every 5 degrees and interpolated quadratically.
const XT = [0.8487, 0.84751182, 0.84479598, 0.840213, 0.83359314, 0.8257851, 0.814752, 0.80006949,
  0.78216192, 0.76060494, 0.73658673, 0.7086645, 0.67777182, 0.64475739, 0.60987582, 0.57134484,
  0.52729731, 0.48562614, 0.45167814];
const YT = [0, 0.0838426, 0.1676852, 0.2515278, 0.3353704, 0.419213, 0.5030556, 0.5868982, 0.6707408,
  0.7545834, 0.838426, 0.9222686, 1.0061112, 1.0899538, 1.1737964, 1.257639, 1.3414816, 1.4253242,
  1.5091668];

// Plane units are "degrees of equatorial longitude": x = XT * lon, so the map
// spans x in [-152.77, 152.77]. Robinson's height:width ratio is 0.5072, which
// fixes the y scale.
const HALF_WIDTH = XT[0] * 180;
const YK = (0.5072 * HALF_WIDTH) / YT[18];

function interp(table, i, t) {
  const a = table[i > 0 ? i - 1 : 0];
  const b = table[i];
  const c = table[i < 18 ? i + 1 : 18];
  return b + (t * (c - a) + t * t * (c - 2 * b + a)) / 2;
}

/** [lon, lat] in degrees -> [x, y] in plane units (y grows downward, for SVG). */
export function project(lon, lat) {
  const abs = Math.abs(lat);
  const i = Math.min(17, Math.floor(abs / 5));
  const t = abs / 5 - i;
  return [interp(XT, i, t) * lon, interp(YT, i, t) * YK * (lat < 0 ? 1 : -1)];
}

/** Projected extent of the whole world as [minX, minY, width, height]. */
export function worldExtent() {
  const h = YT[18] * YK;
  return [-HALF_WIDTH, -h, 2 * HALF_WIDTH, 2 * h];
}

/** Great-circle distance in km, for "you were 400 km off" feedback. */
export function haversineKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLon = (b[0] - a[0]) * rad;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.min(1, Math.sqrt(s))));
}

/**
 * Inverse of {@link project}, by bisection on latitude then division on
 * longitude. Needed to turn a click on the map back into [lon, lat].
 */
export function unproject(x, y) {
  let lo = -90, hi = 90;
  for (let n = 0; n < 30; n++) {
    const mid = (lo + hi) / 2;
    // y decreases as latitude increases, so a larger y means mid is too far south.
    if (project(0, mid)[1] > y) lo = mid;
    else hi = mid;
  }
  const lat = (lo + hi) / 2;
  const abs = Math.abs(lat);
  const i = Math.min(17, Math.floor(abs / 5));
  return [x / interp(XT, i, abs / 5 - i), lat];
}
