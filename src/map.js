import { project, worldExtent, unproject } from './projection.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const [WX, WY, WW, WH] = worldExtent();

// Countries smaller than this (km²) get a permanent click target dot, because
// their outline is a fraction of a pixel at world zoom. Roughly "smaller than
// Cyprus": Luxembourg, Bahrain, every Caribbean and Pacific micro-state.
const DOT_MAX_AREA = 12000;

// Dot radius in plane units at full world zoom (~6 px on a laptop screen).
const DOT_R = 1.25;

const el = (name, attrs) => {
  const node = document.createElementNS(SVG_NS, name);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
};

function pathOf(country) {
  let d = '';
  for (const flat of country.polys) {
    for (let i = 0; i < flat.length; i += 2) {
      const [x, y] = project(flat[i], flat[i + 1]);
      d += (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2);
    }
    d += 'Z';
  }
  return d;
}

/**
 * Interactive world map. Owns the SVG, the viewport (zoom/pan) and per-country
 * CSS state classes; knows nothing about quizzes.
 */
export class WorldMap {
  /**
   * @param {HTMLElement} host
   * @param {Array} countries
   * @param {{onPick?: (country|null, ll:[number,number]) => void}} [handlers]
   */
  constructor(host, countries, handlers = {}) {
    this.host = host;
    this.countries = countries;
    this.handlers = handlers;
    this.byId = new Map(countries.map((c) => [c.id, c]));
    this.nodes = new Map(); // id -> {path, dot}
    this.view = { x: WX, y: WY, w: WW, h: WH };
    this.labelsOn = false;

    const svg = el('svg', {
      class: 'map',
      viewBox: `${WX} ${WY} ${WW} ${WH}`,
      preserveAspectRatio: 'xMidYMid meet',
    });
    svg.append(el('rect', { class: 'ocean', x: WX, y: WY, width: WW, height: WH }));

    const gLand = el('g', { class: 'land' });
    const gDots = el('g', { class: 'dots' });
    const gLabels = el('g', { class: 'labels' });

    for (const c of countries) {
      const path = el('path', { class: 'country', d: pathOf(c), 'data-id': c.id });
      gLand.append(path);
      const node = { path, dot: null, label: null };
      if (c.area <= DOT_MAX_AREA) {
        const [x, y] = project(c.center[0], c.center[1]);
        const dot = el('circle', { class: 'dot', cx: x, cy: y, r: DOT_R, 'data-id': c.id });
        gDots.append(dot);
        node.dot = dot;
      }
      this.nodes.set(c.id, node);
    }

    svg.append(gLand, gDots, gLabels);
    host.replaceChildren(svg);
    this.svg = svg;
    this.gLabels = gLabels;

    this.#bindPointer();
    this.#bindZoom();
  }

  /* ------------------------------------------------------------- viewport */

  #apply() {
    const { x, y, w, h } = this.view;
    this.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    // Keep strokes and dots a constant on-screen size while zooming.
    const k = w / WW;
    this.svg.style.setProperty('--k', k);
    // Dots keep a usable on-screen size, but shrink far enough when zoomed in
    // that neighbours like the Lesser Antilles stop overlapping each other.
    for (const { dot } of this.nodes.values()) if (dot) dot.setAttribute('r', DOT_R * Math.max(0.12, k));
    this.#layoutLabels();
  }

  /** Clamp so the world can never be dragged fully off-screen. */
  #clamp() {
    const v = this.view;
    v.w = Math.min(WW, Math.max(WW / 40, v.w));
    v.h = v.w * (WH / WW);
    v.x = Math.min(WX + WW - v.w * 0.25, Math.max(WX - v.w * 0.75, v.x));
    v.y = Math.min(WY + WH - v.h * 0.25, Math.max(WY - v.h * 0.75, v.y));
  }

  /** Convert a pointer event to plane coordinates. */
  #planeAt(ev) {
    const r = this.svg.getBoundingClientRect();
    // preserveAspectRatio=meet letterboxes the viewBox; undo that first.
    const scale = Math.min(r.width / this.view.w, r.height / this.view.h);
    const ox = (r.width - this.view.w * scale) / 2;
    const oy = (r.height - this.view.h * scale) / 2;
    return [
      this.view.x + (ev.clientX - r.left - ox) / scale,
      this.view.y + (ev.clientY - r.top - oy) / scale,
    ];
  }

  zoomBy(factor, anchor) {
    const v = this.view;
    const [ax, ay] = anchor ?? [v.x + v.w / 2, v.y + v.h / 2];
    const w = v.w / factor;
    const ratio = w / v.w;
    v.x = ax - (ax - v.x) * ratio;
    v.y = ay - (ay - v.y) * ratio;
    v.w = w;
    this.#clamp();
    this.#apply();
  }

  reset() {
    this.view = { x: WX, y: WY, w: WW, h: WH };
    this.#apply();
  }

  /** Centre the view on a lon/lat at the given plane width. */
  centerOn(ll, w) {
    const [x, y] = project(ll[0], ll[1]);
    const h = w * (WH / WW);
    this.view = { x: x - w / 2, y: y - h / 2, w, h };
    this.#clamp();
    this.#apply();
  }

  /** Plane width of the whole world; compare with `view.w` to gauge zoom. */
  get worldWidth() {
    return WW;
  }

  /**
   * Frame a projected rectangle [x0,y0,x1,y1] with padding. `bias` shifts the
   * framed feature up by that fraction of the viewport, to keep it clear of
   * the answer sheet that overlays the bottom of the map.
   */
  #frame(x0, y0, x1, y1, { pad = 2.2, min = WW / 14, bias = 0 } = {}) {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    let w = Math.max((x1 - x0) * pad, (y1 - y0) * pad * (WW / WH), min);
    w = Math.min(w, WW);
    const h = w * (WH / WW);
    this.view = { x: cx - w / 2, y: cy - h / 2 + bias * h, w, h };
    this.#clamp();
    this.#apply();
  }

  /** Frame one country (or the world when the id is unknown). */
  focus(id, opts) {
    const c = this.byId.get(id);
    if (!c) return this.reset();
    const [x0, y0] = project(c.bbox[0], c.bbox[3]);
    const [x1, y1] = project(c.bbox[2], c.bbox[1]);
    this.#frame(x0, y0, x1, y1, opts);
  }

  /**
   * Frame a group of countries. Longitudes are not wrapped, so a group
   * straddling the antimeridian (Oceania) simply ends up Pacific-wide.
   */
  focusIds(ids, opts = { pad: 1.12, min: WW / 8 }) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const id of ids) {
      const c = this.byId.get(id);
      if (!c) continue;
      const [ax, ay] = project(c.bbox[0], c.bbox[3]);
      const [bx, by] = project(c.bbox[2], c.bbox[1]);
      x0 = Math.min(x0, ax); y0 = Math.min(y0, ay);
      x1 = Math.max(x1, bx); y1 = Math.max(y1, by);
    }
    if (!Number.isFinite(x0)) return this.reset();
    this.#frame(x0, y0, x1, y1, opts);
  }

  #bindZoom() {
    this.svg.addEventListener(
      'wheel',
      (ev) => {
        ev.preventDefault();
        const factor = Math.exp(-ev.deltaY * (ev.deltaMode === 1 ? 0.05 : 0.002));
        this.zoomBy(factor, this.#planeAt(ev));
      },
      { passive: false }
    );
  }

  #bindPointer() {
    const svg = this.svg;
    let drag = null;
    const pinch = new Map();

    svg.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'touch') pinch.set(ev.pointerId, ev);
      if (pinch.size > 1) { drag = null; return; }
      svg.setPointerCapture(ev.pointerId);
      drag = { start: this.#planeAt(ev), view: { ...this.view }, moved: 0, id: ev.pointerId };
    });

    svg.addEventListener('pointermove', (ev) => {
      if (pinch.has(ev.pointerId)) pinch.set(ev.pointerId, ev);
      if (pinch.size === 2) {
        const [a, b] = [...pinch.values()];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        if (this._pinchDist) {
          const mid = { clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 };
          this.zoomBy(dist / this._pinchDist, this.#planeAt(mid));
        }
        this._pinchDist = dist;
        return;
      }
      if (!drag || ev.pointerId !== drag.id) return;
      // Recompute against the drag-start view so panning never compounds.
      const saved = this.view;
      this.view = { ...drag.view };
      const [px, py] = this.#planeAt(ev);
      this.view = saved;
      const dx = px - drag.start[0], dy = py - drag.start[1];
      drag.moved = Math.max(drag.moved, Math.hypot(dx, dy) / (this.view.w / WW));
      this.view = { ...drag.view, x: drag.view.x - dx, y: drag.view.y - dy };
      this.#clamp();
      this.#apply();
    });

    const end = (ev) => {
      pinch.delete(ev.pointerId);
      if (pinch.size < 2) this._pinchDist = 0;
      if (!drag || ev.pointerId !== drag.id) return;
      const wasDrag = drag.moved > 3;
      drag = null;
      if (wasDrag || !this.handlers.onPick) return;
      const [x, y] = this.#planeAt(ev);
      this.handlers.onPick(this.#countryAt(ev), unproject(x, y));
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);

    svg.addEventListener('pointermove', (ev) => {
      if (!this.handlers.onHover || drag) return;
      this.handlers.onHover(this.#countryAt(ev));
    });
  }

  /**
   * Country under a pointer event. Uses elementFromPoint rather than
   * ev.target: while the SVG holds pointer capture (during a drag) every
   * event retargets to the SVG itself, so ev.target would always miss.
   */
  #countryAt(ev) {
    const node = document.elementFromPoint(ev.clientX, ev.clientY);
    const hit = node?.closest?.('[data-id]');
    return hit ? this.byId.get(hit.dataset.id) ?? null : null;
  }

  /* ---------------------------------------------------------------- state */

  /** Set a state class ('correct' | 'wrong' | 'target' | 'hint' | 'done') on one country. */
  mark(id, state) {
    const node = this.nodes.get(id);
    if (!node) return;
    for (const n of [node.path, node.dot]) if (n) n.classList.add(state);
  }

  unmark(id, state) {
    const node = this.nodes.get(id);
    if (!node) return;
    for (const n of [node.path, node.dot]) if (n) n.classList.remove(state);
  }

  clearMarks(...states) {
    const list = states.length ? states : ['correct', 'wrong', 'target', 'hint', 'done', 'dim'];
    for (const { path, dot } of this.nodes.values()) {
      for (const n of [path, dot]) if (n) n.classList.remove(...list);
    }
  }

  /** Dim every country outside `ids` (a Set) so a region quiz reads clearly. */
  restrictTo(ids) {
    for (const [id, { path, dot }] of this.nodes) {
      const dim = ids && !ids.has(id);
      for (const n of [path, dot]) if (n) n.classList.toggle('dim', dim);
    }
  }

  setLabels(on, ids) {
    this.labelsOn = on;
    this.labelIds = ids;
    this.#layoutLabels();
  }

  #layoutLabels() {
    if (!this.labelsOn) {
      if (this.gLabels.childNodes.length) this.gLabels.replaceChildren();
      return;
    }
    const k = this.view.w / WW;
    const v = this.view;
    const kids = [];
    for (const c of this.countries) {
      if (this.labelIds && !this.labelIds.has(c.id)) continue;
      const [x, y] = project(c.center[0], c.center[1]);
      if (x < v.x || x > v.x + v.w || y < v.y || y > v.y + v.h) continue;
      // Show big countries always, small ones only once zoomed in enough.
      if (c.area < 90000 * k * 8) continue;
      const t = el('text', { class: 'label', x, y: y - 2 * k });
      t.style.fontSize = `${3.4 * k}px`;
      t.textContent = c.name;
      kids.push(t);
    }
    this.gLabels.replaceChildren(...kids);
  }

  /** Transient ping at a lon/lat, used to show where a wrong click landed. */
  ping(ll, cls = 'ping') {
    const [x, y] = project(ll[0], ll[1]);
    const k = this.view.w / WW;
    const c = el('circle', { class: cls, cx: x, cy: y, r: 2 * k });
    this.svg.append(c);
    setTimeout(() => c.remove(), 1200);
  }
}
