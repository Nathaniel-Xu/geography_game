import { WorldMap } from './map.js';
import { Quiz, MODES, MAX_ATTEMPTS } from './quiz.js';
import { Stats } from './store.js';
import { Course, PASS } from './course.js';
import { play, bind, setEnabled } from '../vendor/cuelume/index.js';
import { CLOUD_ENABLED } from './config.js';
import { account, completeSignIn, idToken, signIn, signOut } from './auth.js';
import { Cloud } from './cloud.js';

const $ = (id) => document.getElementById(id);
const REGIONS = ['World', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];
const LENGTHS = [
  { label: '10', n: 10 },
  { label: '25', n: 25 },
  { label: 'All', n: 0 },
];

/**
 * Sound design (cuelume, https://github.com/Danilaa1/cuelume). Two layers:
 *   - Declarative: every button carries data-cuelume-press/release (tactile
 *     click), data-cuelume-hover="tick" on nav-ish chrome, or
 *     data-cuelume-toggle on switch-like controls (segmented pickers, the
 *     Labels toggle, the "Free play" disclosure). See index.html and the
 *     dynamic element builders below.
 *   - Imperative (`play(name)`): layered on top for outcomes a declarative
 *     click can't express — right/wrong, entering/leaving a screen, a set
 *     mastered. Mapped once here so the "why this sound" reasoning lives in
 *     one place instead of at every call site.
 * cuelume itself no-ops before the page's first user gesture and while
 * muted, so nothing needs to guard boot-time calls.
 */
const MUTE_KEY = 'geoquiz.muted.v1';

const state = {
  mode: 'find',
  region: 'World',
  length: 10,
  quiz: null,
  streak: 0,
  timer: null,
  labels: false,
  reviewPool: null, // ids forced into the next quiz ("drill my misses")
  set: null, // course set being worked, or null in free play
  phase: null, // 'learn' | 'choice' | 'type' within that set
  learnAt: 0, // index into the set during the learn phase
  muted: localStorage.getItem(MUTE_KEY) === '1',
};

let countries = [];
let byId = new Map();
let map = null;
let course = null;
const stats = new Stats();
let cloud = null;

/* --------------------------------------------------------------- utilities */

const idsForRegion = (region) =>
  countries.filter((c) => region === 'World' || c.region === region).map((c) => c.id);

/**
 * Speak a country name with the browser's own speech synthesiser: no
 * dependency, no audio files, no network, and it already ships in every
 * target browser. Offered while learning and exploring only - during a quiz
 * it would read the answer out loud.
 *
 * Deliberately independent of the UI-sound mute: that silences incidental
 * feedback chirps, whereas pressing a speaker button is an explicit request.
 */
const CAN_SPEAK =
  typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';

function say(text) {
  if (!CAN_SPEAK || !text) return;
  speechSynthesis.cancel(); // a second press interrupts the first, never queues
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; // these are the English exonyms the quiz asks for
  u.rate = 0.9; // unfamiliar words, so a touch slower than default
  // getVoices() is empty until the browser has loaded them, and `lang` alone
  // is enough in that case, so there is nothing to wait for.
  const voice = speechSynthesis.getVoices().find((v) => v.lang?.startsWith('en'));
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

function toast(text, kind = '', ms = 1500) {
  const t = $('toast');
  t.textContent = text;
  t.className = `toast ${kind}`;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    t.hidden = true;
  }, ms);
}

function segmented(host, items, current, onPick) {
  host.replaceChildren(
    ...items.map((it) => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.type = 'button';
      b.textContent = it.label;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-pressed', String(it.value === current));
      // A segmented picker reads as a bank of switches, not plain buttons.
      b.setAttribute('data-cuelume-toggle', 'toggle');
      b.setAttribute('data-cuelume-hover', 'tick');
      b.addEventListener('click', () => onPick(it.value));
      return b;
    })
  );
}

/* -------------------------------------------------------------- menu screen */

function renderMenu() {
  segmented(
    $('modePick'),
    Object.entries(MODES).map(([value, m]) => ({ value, label: m.label })),
    state.mode,
    (v) => {
      state.mode = v;
      renderMenu();
    }
  );
  $('modeBlurb').textContent = MODES[state.mode].blurb;

  segmented($('regionPick'), REGIONS.map((r) => ({ value: r, label: r })), state.region, (v) => {
    state.region = v;
    renderMenu();
    map.restrictTo(v === 'World' ? null : new Set(idsForRegion(v)));
    if (v === 'World') map.reset();
    else map.focusIds(idsForRegion(v));
  });

  segmented($('lengthPick'), LENGTHS.map((l) => ({ value: l.n, label: l.label })), state.length, (v) => {
    state.length = v;
    renderMenu();
  });

  const pool = idsForRegion(state.region);
  const s = stats.summary(pool);
  const pct = (n) => (s.total ? (n / s.total) * 100 : 0);
  $('progressPanel').innerHTML = `
    <h3>Your progress · ${state.region}</h3>
    <div class="meter">
      <i class="learned" style="width:${pct(s.learned)}%"></i>
      <i class="shaky" style="width:${pct(s.shaky)}%"></i>
    </div>
    <div class="legend">
      <span><i style="background:var(--good)"></i>${s.learned} solid</span>
      <span><i style="background:var(--warn)"></i>${s.shaky} shaky</span>
      <span><i style="background:#1b2433"></i>${s.total - s.seen} not seen yet</span>
    </div>`;

  renderCourseCta();
  renderAccount();
}

/* ------------------------------------------------------------------ account */

const SYNC_TEXT = {
  connecting: 'Connecting\u2026',
  synced: 'Progress saved to your account.',
  offline: 'Offline \u2014 playing locally, will sync when reconnected.',
  off: 'Signed in.',
};

/**
 * The account row. Absent entirely until a backend is configured, so an
 * unconfigured copy of the game shows no dead controls.
 */
function renderAccount() {
  const host = $('account');
  // Home screen only. Everywhere else the bar belongs to the quiz controls,
  // and this gate also stops an async status change from resurrecting the
  // card mid-drill.
  host.hidden = !CLOUD_ENABLED || $('panelMenu').hidden;
  if (host.hidden) return;

  const who = account();
  const pic = $('accountPic');
  pic.hidden = !who?.picture;
  if (who?.picture && pic.src !== who.picture) pic.src = who.picture;

  $('accountName').textContent = who ? who.name : 'Progress stays in this browser';
  $('btnSignIn').hidden = Boolean(who);
  $('btnSignOut').hidden = !who;

  const syncState = cloud?.state ?? 'off';
  $('accountStatus').textContent = who
    ? cloud?.detail || SYNC_TEXT[syncState] || ''
    : 'Sign in to save it to your account.';
  host.classList.toggle('bad', syncState === 'error');
}

/** Sign in, then open the session. Errors surface as a toast, never a dead button. */
async function startSignIn() {
  try {
    await signIn();
  } catch (err) {
    toast(`Sign-in failed: ${err.message}`, 'bad', 4000);
  }
}

async function endSignIn() {
  cloud?.disconnect();
  const redirecting = await signOut();
  if (!redirecting) {
    renderAccount();
    toast('Signed out.', '', 1400);
  }
}

/** Open a synced session with whatever token is currently valid. */
async function openSession() {
  if (!CLOUD_ENABLED || !cloud) return;
  const token = await idToken();
  const who = account();
  if (!token || !who) {
    renderAccount();
    return;
  }
  cloud.connect(token, who.sub);
}

function renderCourseCta() {
  const cta = $('courseTitle');
  if (!course.available) {
    // Only reachable with an out-of-date data file; say so instead of
    // offering buttons that cannot do anything.
    cta.textContent = 'The course is unavailable';
    $('courseStatus').textContent =
      'data/countries.json has no study sets. Run `npm run build:data`, then reload with Ctrl+Shift+R.';
    $('btnCourse').disabled = true;
    $('btnBrowseSets').disabled = true;
    return;
  }
  $('btnCourse').disabled = false;
  $('btnBrowseSets').disabled = false;
  const sum = course.summary();
  const next = course.nextSet();
  const phase = course.nextPhase(next);
  const verb = { learn: 'Learn', choice: 'Quiz', type: 'Type' }[phase];
  cta.textContent = `The course · ${sum.total} sets, most important first`;
  $('courseStatus').textContent =
    sum.done === sum.total
      ? 'Every set mastered. Replay any of them, or drill free play.'
      : `${sum.done} of ${sum.total} sets mastered · up next: ${verb} set ${next} (${course.preview(next)})`;
  $('btnCourse').textContent = sum.done || sum.started ? `Continue · set ${next}` : 'Start the course';
}

/** Hide every floating overlay; each screen re-shows what it needs. */
function hideOverlays() {
  for (const id of ['choices', 'answer', 'learnCard', 'hover', 'panelMenu', 'panelCourse', 'panelResults']) {
    $(id).hidden = true;
  }
  for (const id of ['prompt', 'scoreboard', 'account', 'btnSkip', 'btnQuit', 'btnSets', 'btnLabels', 'btnMenu']) {
    $(id).hidden = true;
  }
}

function showMenu() {
  stopQuiz();
  state.set = null;
  state.phase = null;
  play('droplet', { volume: 0.6 }); // returning home reads as a collapse
  hideOverlays();
  $('panelMenu').hidden = false;
  document.body.classList.remove('playing', 'explore');
  map.clearMarks();
  map.restrictTo(state.region === 'World' ? null : new Set(idsForRegion(state.region)));
  map.setLabels(false);
  state.labels = false;
  $('btnLabels').setAttribute('aria-pressed', 'false');
  renderMenu();
}

function showExplore() {
  stopQuiz();
  play('bloom', { volume: 0.75 }); // opening the free-roam map is a reveal
  hideOverlays();
  document.body.classList.add('explore');
  $('btnMenu').hidden = false;
  $('btnLabels').hidden = false;
  $('prompt').hidden = false;
  $('promptKicker').textContent = 'Explore';
  $('promptName').textContent = 'Tap any country';
  // Visible for the whole explore session, but inert until a country is picked
  // - there is nothing to pronounce about "Tap any country".
  $('sayPrompt').hidden = !CAN_SPEAK;
  $('sayPrompt').disabled = true;
  $('promptSub').textContent = 'Wheel or pinch to zoom, drag to pan.';
  map.clearMarks();
  if (state.region !== 'World') {
    map.restrictTo(new Set(idsForRegion(state.region)));
    map.focusIds(idsForRegion(state.region));
  } else {
    map.restrictTo(null);
  }
}


/* ------------------------------------------------------------------- course */

const PHASE_LABEL = { learn: 'Learn', choice: 'Multiple choice', type: 'Type the names' };

function showSets() {
  stopQuiz();
  state.set = null;
  state.phase = null;
  play('whisper', { volume: 0.7 }); // revealing the dense 13-set list
  hideOverlays();
  document.body.classList.remove('playing', 'explore');
  map.clearMarks();
  map.restrictTo(null);
  map.reset();
  $('panelCourse').hidden = false;
  renderSetList();
}

function renderSetList() {
  const host = $('setList');
  if (!course.available) {
    host.innerHTML =
      '<p class="hint">No study sets in data/countries.json. Run <code>npm run build:data</code>, ' +
      'then reload with Ctrl+Shift+R (Cmd+Shift+R on macOS).</p>';
    return;
  }
  const next = course.nextSet();
  host.replaceChildren(
    ...course.sets.map((s) => {
      const p = course.progress(s.n);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `set-row${p.done ? ' done' : ''}${s.n === next && !p.done ? ' current' : ''}`;
      row.setAttribute('data-cuelume-press', '');
      row.setAttribute('data-cuelume-release', '');
      row.setAttribute('data-cuelume-hover', 'tick');
      row.innerHTML = `
        <span class="set-n">${s.n}</span>
        <span class="set-main">
          <b>Set ${s.n}</b>
          <span>${course.preview(s.n)}&hellip;</span>
        </span>
        <span class="set-state">${setState(p)}</span>`;
      row.addEventListener('click', () => openSet(s.n));
      row.addEventListener('pointerenter', () => map.restrictTo(new Set(course.ids(s.n))));
      return row;
    })
  );
}

function setState(p) {
  if (p.done) return `mastered · ${Math.round(p.typed * 100)}%`;
  if (p.typed) return `typing ${Math.round(p.typed * 100)}%`;
  if (p.choice) return `choice ${Math.round(p.choice * 100)}%`;
  if (p.learned) return 'learned';
  return 'not started';
}

/** Enter a set at the phase it is due for (or a phase you picked explicitly). */
function openSet(n, phase) {
  if (n == null || !course.ids(n).length) {
    toast('That set is missing from the data file.', 'bad', 3000);
    return;
  }
  phase = phase ?? course.nextPhase(n);
  state.set = n;
  state.phase = phase;
  if (phase === 'learn') return startLearn(n);
  startQuiz({ ids: course.ids(n), mode: phase === 'type' ? 'type' : 'name' });
}

/* ------------------------------------------------------- course: learn phase */

function startLearn(n) {
  stopQuiz();
  play('ready', { volume: 0.8 }); // a fresh set's material is in place
  hideOverlays();
  document.body.classList.remove('explore');
  document.body.classList.add('playing');
  state.learnAt = 0;
  $('prompt').hidden = false;
  $('btnSets').hidden = false;
  $('learnCard').hidden = false;
  map.setLabels(false);
  map.clearMarks();
  map.restrictTo(new Set(course.ids(n)));
  renderLearn();
}

function renderLearn() {
  const list = course.countries(state.set);
  const i = Math.max(0, Math.min(state.learnAt, list.length - 1));
  state.learnAt = i;
  const c = list[i];

  map.clearMarks('target', 'correct', 'wrong', 'hint');
  for (const seen of list.slice(0, i)) map.mark(seen.id, 'done');
  map.mark(c.id, 'target');
  map.focus(c.id, { pad: 4.5, min: 46, bias: window.innerWidth < 760 ? 0.24 : 0.14 });

  $('promptKicker').textContent = `Set ${state.set}`;
  $('promptName').textContent = 'Learn these on the map';
  $('promptSub').textContent = `${PHASE_LABEL.learn} · ${i + 1} of ${list.length}`;

  $('learnCount').textContent = `${i + 1} / ${list.length}`;
  $('learnName').textContent = c.name;
  $('sayLearn').hidden = !CAN_SPEAK;
  $('learnFacts').textContent =
    `${c.capital ? 'Capital ' + c.capital + ' · ' : ''}${c.subregion} · ` +
    `${c.area.toLocaleString()} km² · ${c.pop ? c.pop.toLocaleString() + ' people' : 'population n/a'}`;
  $('learnPrev').disabled = i === 0;
  $('learnNext').textContent = i === list.length - 1 ? 'Quiz me →' : 'Next →';
  $('learnQuiz').hidden = i === list.length - 1;
}

function stepLearn(delta) {
  const list = course.countries(state.set);
  if (state.learnAt + delta >= list.length) return finishLearn();
  play('page', { volume: 0.6 }); // flipping to the next/previous country
  state.learnAt = Math.max(0, state.learnAt + delta);
  renderLearn();
}

function finishLearn() {
  course.markLearned(state.set);
  openSet(state.set, 'choice');
}

/* --------------------------------------------------------------- quiz flow */

/**
 * Start a quiz. Free play passes nothing and uses the menu settings; the course
 * passes an explicit id list and mode.
 */
function startQuiz({ ids = null, mode = state.mode, length } = {}) {
  const pool = ids && ids.length ? ids : idsForRegion(state.region);
  const quiz = new Quiz({
    countries,
    ids: pool,
    mode,
    length: length ?? (ids && ids.length ? 0 : state.length),
    stats,
  });
  if (!quiz.total) {
    toast('Nothing to drill there.', 'bad');
    return;
  }
  play('loading', { volume: 0.6 }); // a fresh question set is spinning up
  state.quiz = quiz;
  state.streak = 0;
  state.reviewPool = null;

  hideOverlays();
  document.body.classList.add('playing');
  document.body.classList.remove('explore');
  $('prompt').hidden = false;
  $('scoreboard').hidden = false;
  $('btnSkip').hidden = false;
  $('btnQuit').hidden = false;
  $('btnSets').hidden = state.set === null;
  map.setLabels(false);
  map.clearMarks();
  const scope = state.set !== null ? new Set(course.ids(state.set)) : null;
  map.restrictTo(scope ?? (state.region === 'World' ? null : new Set(idsForRegion(state.region))));
  if (state.set !== null) map.focusIds(course.ids(state.set));
  else if (state.region === 'World') map.reset();
  else map.focusIds(idsForRegion(state.region));
  renderQuestion();
}

function stopQuiz() {
  clearTimeout(state.timer);
  state.timer = null;
  state.quiz = null;
}

/** Frame the "name it"/"type it" target the same tight way on every question. */
function focusPrompt(id) {
  map.focus(id, { pad: 3.2, min: 40, bias: window.innerWidth < 760 ? 0.22 : 0.13 });
}

function renderQuestion() {
  const q = state.quiz;
  if (!q || q.done) return finish();
  const c = q.country;
  const spec = MODES[q.mode];

  $('sbScore').textContent = q.right % 1 ? q.right.toFixed(1) : String(q.right);
  $('sbProgress').textContent = `${q.index + 1}/${q.total}`;
  $('sbStreak').textContent = String(state.streak);
  map.clearMarks('target', 'correct', 'wrong', 'hint');

  // No pronunciation during a quiz: in the "name it" modes it would read out
  // the answer, and in the rest it just repeats the prompt.
  $('sayPrompt').hidden = true;
  const kicker = state.set !== null ? `Set ${state.set}` : null;
  if (spec.kind === 'choice' || spec.kind === 'text') {
    // Both "name it" modes show the country and ask for its name; only the
    // input differs, so they share the framing.
    $('promptKicker').textContent = kicker ?? (spec.kind === 'text' ? 'Type it' : 'Name it');
    $('promptName').textContent = 'Which country is highlighted?';
    $('promptSub').textContent =
      state.set !== null ? `${PHASE_LABEL[spec.kind === 'text' ? 'type' : 'choice']} · set ${state.set}` : '';
    focusPrompt(c.id);
    map.mark(c.id, 'target');
    if (spec.kind === 'choice') renderChoices();
    else renderAnswerBox();
  } else {
    $('choices').hidden = true;
    $('promptKicker').textContent = q.mode === 'capital' ? 'Capital' : 'Find';
    $('promptName').textContent = spec.prompt(c);
    $('promptSub').textContent =
      q.mode === 'capital'
        ? `Click its country · ${MAX_ATTEMPTS} tries`
        : `Click it on the map · ${MAX_ATTEMPTS} tries`;
  }
}

/** The typed-answer bar: fresh, focused, and cleared for each question. */
function renderAnswerBox() {
  const form = $('answer');
  const input = $('answerInput');
  form.hidden = false;
  form.className = 'answer';
  input.disabled = false;
  input.value = '';
  $('answerNote').textContent = `${MAX_ATTEMPTS} tries · Enter to answer`;
  $('answerNote').className = 'answer-note';
  input.focus();
}

function renderChoices(result) {
  const q = state.quiz;
  const host = $('choices');
  host.hidden = false;
  host.replaceChildren(
    ...q.choices.map((c) => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.type = 'button';
      b.textContent = c.name;
      b.setAttribute('data-cuelume-press', '');
      b.setAttribute('data-cuelume-release', '');
      b.setAttribute('data-cuelume-hover', 'tick');
      if (result) {
        b.disabled = true;
        if (c.id === q.country.id) b.classList.add('good');
        else if (result.picked && c.id === result.picked.id) b.classList.add('bad');
      } else {
        b.addEventListener('click', () => judge(q.answerChoice(c.id)));
      }
      return b;
    })
  );
}

function judge(result, ll) {
  if (!result) return;
  const q = state.quiz;
  const c = q.country;
  const typed = MODES[q.mode].kind === 'text';

  if (result.ok) {
    state.streak++;
    map.mark(c.id, 'correct');
    const spelled = result.verdict === 'close';
    // A typo still earns the "you knew it" sparkle; a clean answer gets the
    // fuller success chime.
    play(spelled ? 'sparkle' : 'success', { volume: spelled ? 0.85 : 1 });
    toast(
      spelled ? `Close enough — ${c.name}.` : result.firstTry ? pickPraise() : 'Right — second look.',
      'good',
      spelled ? 1600 : 1100
    );
    if (typed) setAnswerNote(spelled ? `It is spelled “${c.name}”.` : c.name, spelled ? 'warm' : 'good', true);
  } else if (!result.revealed) {
    state.streak = 0;
    play('error', { volume: 0.55 }); // recoverable — tries remain
    const left = MAX_ATTEMPTS - result.attempts;
    const tries = `${left} ${left === 1 ? 'try' : 'tries'} left.`;
    if (typed) {
      // Naming a different country, or a place that is not one, teaches more
      // than a bare "wrong".
      const wrongCountry = result.picked && result.picked.id !== c.id ? result.picked : null;
      const said = wrongCountry ? `That is ${wrongCountry.name}. ` : '';
      const why = result.note ? `“${result.input}” — ${result.note}. ` : '';
      toast(`${said || why || ''}Not it. ${tries}`, 'warm', 2000);
      setAnswerNote(`${said}${why}${tries}`, 'bad');
      if (wrongCountry) {
        // The target is already zoomed in tight enough to hide most of the
        // map, so widen out to actually show the country the player named.
        map.mark(wrongCountry.id, 'wrong');
        map.focusIds([c.id, wrongCountry.id], {
          pad: 1.4,
          min: 55,
          bias: window.innerWidth < 760 ? 0.22 : 0.13,
        });
        setTimeout(() => {
          map.unmark(wrongCountry.id, 'wrong');
          if (state.quiz === q) focusPrompt(c.id);
        }, 1900);
      }
    } else {
      if (result.picked) {
        map.mark(result.picked.id, 'wrong');
        setTimeout(() => map.unmark(result.picked.id, 'wrong'), 900);
      }
      const km = result.distanceKm;
      toast(
        `${result.picked ? result.picked.name + '? ' : ''}${warmth(km)} — ${km.toLocaleString()} km off. ${tries}`,
        'warm',
        2200
      );
      // A near miss on a micro-state usually means overlapping dots at world
      // zoom, so zoom in around the click — not around the answer.
      if (ll && km < 500 && c.area <= 12000 && map.view.w > map.worldWidth / 3) {
        map.centerOn(ll, map.worldWidth / 12);
      }
    }
    if (result.attempts === MAX_ATTEMPTS - 1) {
      if (!typed) {
        map.mark(c.id, 'hint');
        setTimeout(() => map.unmark(c.id, 'hint'), 260);
      }
      $('promptSub').textContent = MODES[q.mode].hint(c);
    }
    return;
  } else {
    state.streak = 0;
    map.mark(c.id, 'wrong');
    play('droplet', { volume: 0.7 }); // out of tries — the answer sinks into view
    toast(`${c.name}.`, 'bad', 1800);
    if (typed) setAnswerNote(`It was ${c.name}.`, 'bad', true);
    else if (q.mode !== 'name') map.focus(c.id, { pad: 2.2, min: 46 });
  }

  if (MODES[q.mode].kind === 'choice') renderChoices(result);
  $('sbScore').textContent = q.right % 1 ? q.right.toFixed(1) : String(q.right);
  $('sbStreak').textContent = String(state.streak);
  $('promptSub').textContent = `${c.name} — ${c.capital ? c.capital + ' · ' : ''}${c.subregion}`;

  clearTimeout(state.timer);
  state.timer = setTimeout(advance, result.ok ? 900 : 2000);
}

/** Feedback under the typed-answer input; `settled` locks the field. */
function setAnswerNote(text, kind, settled = false) {
  $('answerNote').textContent = text;
  $('answerNote').className = `answer-note ${kind}`;
  $('answer').className = `answer ${kind === 'good' ? 'good' : kind === 'bad' ? 'bad' : ''}`;
  if (settled) $('answerInput').disabled = true;
  else $('answerInput').select();
}

function advance() {
  clearTimeout(state.timer);
  const q = state.quiz;
  if (!q) return;
  map.mark(q.country.id, 'done');
  q.next();
  if (q.done) finish();
  else {
    play('page', { volume: 0.65 }); // turning to the next question
    // Click modes get the wide view back; the "name it" modes reframe per
    // question anyway, and a course set stays inside its own scope.
    if (MODES[q.mode].kind === 'click') {
      if (state.set !== null) map.focusIds(course.ids(state.set));
      else if (state.region === 'World') map.reset();
      else map.focusIds(idsForRegion(state.region));
    }
    renderQuestion();
  }
}

const PRAISE = ['Nailed it.', 'Correct.', 'Spot on.', 'Yes.', 'Exactly.'];
const pickPraise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];
const warmth = (km) => (km < 500 ? 'Almost' : km < 1500 ? 'Close' : km < 4000 ? 'Warm' : 'Cold');

function finish() {
  const q = state.quiz;
  if (!q) return;
  const r = q.results();
  stopQuiz();
  play('bloom', { volume: 0.85 }); // the results swell into view
  const setN = state.set;
  const phase = MODES[q.mode].kind === 'text' ? 'type' : MODES[q.mode].kind === 'choice' ? 'choice' : null;
  if (setN !== null && phase && r.asked) course.recordQuiz(setN, phase, r.accuracy);

  hideOverlays();
  $('btnMenu').hidden = false;
  $('btnLabels').hidden = false;
  $('btnSets').hidden = setN === null;
  document.body.classList.remove('playing');

  const asked = r.asked;
  $('resTitle').textContent =
    setN !== null
      ? `Set ${setN} · ${PHASE_LABEL[phase]}`
      : r.accuracy >= 0.9
        ? 'Sharp.'
        : r.accuracy >= 0.6
          ? 'Solid run.'
          : 'Good — now the hard part.';
  $('resStats').innerHTML = `
    <div><b>${r.score % 1 ? r.score.toFixed(1) : r.score}/${asked}</b><span>score</span></div>
    <div><b>${Math.round(r.accuracy * 100)}%</b><span>accuracy</span></div>
    <div><b>${r.seconds}s</b><span>time</span></div>
    <div><b>${r.missed.length}</b><span>missed</span></div>`;

  renderCourseActions(setN, phase, r);

  const review = [...r.missed, ...r.shaky.filter((id) => !r.missed.includes(id))];
  state.reviewPool = review;
  $('btnReview').hidden = review.length === 0;
  // Inside a course set the phase buttons already cover "go again".
  $('btnAgain').hidden = setN !== null;

  const chipList = (title, ids) => {
    if (!ids.length) return null;
    const wrap = document.createElement('div');
    const h = document.createElement('h3');
    h.textContent = title;
    const chips = document.createElement('div');
    chips.className = 'chips';
    for (const id of ids) {
      const c = byId.get(id);
      const b = document.createElement('button');
      b.className = 'chip';
      b.type = 'button';
      b.textContent = c.name;
      b.setAttribute('data-cuelume-press', '');
      b.setAttribute('data-cuelume-release', '');
      b.setAttribute('data-cuelume-hover', 'tick');
      b.addEventListener('click', () => {
        map.clearMarks('target');
        map.mark(id, 'target');
        map.focus(id, { pad: 1.9, min: 42 });
        toast(`${c.name} · ${c.capital ?? '—'} · ${c.subregion}`, '', 2600);
      });
      chips.append(b);
    }
    wrap.append(h, chips);
    return wrap;
  };

  const host = $('resMissed');
  const blocks = [
    chipList('Missed — tap to see where it is', r.missed),
    chipList('Took a second look — tap to review', r.shaky),
  ].filter(Boolean);
  if (blocks.length) host.replaceChildren(...blocks);
  else host.innerHTML = `<h3>${setN !== null ? 'Every one first try.' : 'Every one first try. Try a bigger region.'}</h3>`;
  $('panelResults').hidden = false;
  renderMenu();
}

/**
 * The "what next" row on the results panel. The multiple-choice pass hands off
 * to typing only when the player says they are ready; typing at PASS or better
 * masters the set and offers the next one.
 */
function renderCourseActions(setN, phase, r) {
  const host = $('resCourse');
  if (setN === null || !phase) {
    host.hidden = true;
    host.replaceChildren();
    return;
  }
  const passed = r.accuracy >= PASS;
  const btn = (label, cls, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn ${cls}`;
    b.textContent = label;
    b.setAttribute('data-cuelume-press', '');
    b.setAttribute('data-cuelume-release', '');
    b.setAttribute('data-cuelume-hover', 'tick');
    b.addEventListener('click', fn);
    return b;
  };
  const kids = [];

  if (phase === 'choice') {
    kids.push(btn('Type these names →', passed ? 'primary' : '', () => openSet(setN, 'type')));
    kids.push(btn('Run the choices again', passed ? '' : 'primary', () => openSet(setN, 'choice')));
    kids.push(btn('Back to the map', 'ghost', () => openSet(setN, 'learn')));
  } else {
    if (passed && setN < course.count) {
      kids.push(btn(`Start set ${setN + 1} →`, 'primary', () => openSet(setN + 1)));
      kids.push(btn('Type set ' + setN + ' again', '', () => openSet(setN, 'type')));
    } else if (passed) {
      kids.push(btn('All sets mastered — review', 'primary', showSets));
    } else {
      kids.push(btn('Try typing again', 'primary', () => openSet(setN, 'type')));
      kids.push(btn('Back to multiple choice', '', () => openSet(setN, 'choice')));
      kids.push(btn('Back to the map', 'ghost', () => openSet(setN, 'learn')));
    }
  }
  kids.push(btn('All sets', 'ghost', showSets));

  host.replaceChildren(...kids);
  host.hidden = false;

  if (phase === 'type' && passed) {
    // A milestone earns a little fanfare on top of the base success chime
    // the last correct answer already played.
    play('success');
    setTimeout(() => play('sparkle', { volume: 0.75 }), 200);
    toast(`Set ${setN} mastered.`, 'good', 2200);
  }
}

/* ------------------------------------------------------------------- events */

function onPick(country, ll) {
  const q = state.quiz;
  if (!q) {
    // Explore mode.
    if (!country) return;
    play('whisper', { volume: 0.55 }); // subtle feedback for a dense 195-country map
    map.clearMarks('target');
    map.mark(country.id, 'target');
    map.focus(country.id, { pad: 1.7, min: 40 });
    $('promptKicker').textContent = country.region;
    $('promptName').textContent = country.name;
    $('sayPrompt').disabled = false;
    $('promptSub').textContent = `${country.capital ? 'Capital ' + country.capital + ' · ' : ''}${
      country.subregion
    } · ${country.area.toLocaleString()} km²`;
    return;
  }
  if (q.revealed || MODES[q.mode].kind === 'choice') return;
  if (!country) {
    map.ping(ll);
    play('error', { volume: 0.3 }); // soft — a mis-click, not a wrong guess
    toast('Ocean. Aim for land.', 'warm', 1100);
    return;
  }
  if (state.region !== 'World' && country.region !== state.region) {
    play('error', { volume: 0.35 });
    toast(`${country.name} is not in ${state.region}.`, 'warm', 1300);
    return;
  }
  judge(q.answerClick(country, ll), ll);
}

function onHover(country) {
  const chip = $('hover');
  if (!country || state.quiz) {
    chip.hidden = true;
    return;
  }
  chip.hidden = false;
  chip.innerHTML = `<b>${country.name}</b><span>${country.capital ?? '—'} · ${country.region}</span>`;
}

function bindChrome() {
  $('btnStart').addEventListener('click', () => startQuiz());
  $('btnExplore').addEventListener('click', showExplore);
  $('btnMenu').addEventListener('click', showMenu);
  $('btnBack').addEventListener('click', showMenu);
  $('btnAgain').addEventListener('click', () =>
    state.set !== null ? openSet(state.set, state.phase ?? 'choice') : startQuiz()
  );
  $('btnReview').addEventListener('click', () =>
    startQuiz({ ids: state.reviewPool, mode: state.quiz?.mode })
  );
  $('btnQuit').addEventListener('click', finish);
  $('btnSkip').addEventListener('click', () => {
    const q = state.quiz;
    if (!q) return;
    if (q.revealed) return advance();
    judge(q.reveal());
  });
  $('btnLabels').addEventListener('click', (ev) => {
    state.labels = !state.labels;
    ev.currentTarget.setAttribute('aria-pressed', String(state.labels));
    const scope =
      state.set !== null
        ? new Set(course.ids(state.set))
        : state.region === 'World'
          ? null
          : new Set(idsForRegion(state.region));
    map.setLabels(state.labels, scope);
  });
  $('zoomIn').addEventListener('click', () => map.zoomBy(1.6));
  $('zoomOut').addEventListener('click', () => map.zoomBy(1 / 1.6));
  $('zoomReset').addEventListener('click', () => map.reset());
  $('btnReset').addEventListener('click', () => {
    if (!confirm('Erase your saved progress for all 195 countries?')) return;
    stats.reset();
    renderMenu();
    toast('Progress cleared.', '', 1200);
  });
  $('btnSound').addEventListener('click', () => {
    state.muted = !state.muted;
    localStorage.setItem(MUTE_KEY, state.muted ? '1' : '0');
    setEnabled(!state.muted);
    const btnSound = $('btnSound');
    btnSound.textContent = `Sound: ${state.muted ? 'off' : 'on'}`;
    btnSound.setAttribute('aria-pressed', String(!state.muted));
    // Confirm turning it back on; staying silent when muting is the point.
    if (!state.muted) play('toggle');
  });

  // Account.
  $('btnSignIn').addEventListener('click', startSignIn);
  $('btnSignOut').addEventListener('click', endSignIn);

  // Course chrome.
  $('btnCourse').addEventListener('click', () => openSet(course.nextSet()));
  $('btnBrowseSets').addEventListener('click', showSets);
  $('btnSets').addEventListener('click', showSets);
  $('btnCourseBack').addEventListener('click', showMenu);
  $('btnCourseReset').addEventListener('click', () => {
    if (!confirm('Reset course progress? Your per-country stats stay.')) return;
    course.reset();
    renderSetList();
    renderMenu();
    toast('Course reset.', '', 1200);
  });
  $('learnPrev').addEventListener('click', () => stepLearn(-1));
  $('learnNext').addEventListener('click', () => stepLearn(1));
  $('learnQuiz').addEventListener('click', finishLearn);

  // Read the name straight off the panel: both buttons are only reachable when
  // the text beside them is a real country name.
  $('sayLearn').addEventListener('click', () => say($('learnName').textContent));
  $('sayPrompt').addEventListener('click', () => say($('promptName').textContent));

  $('answer').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const q = state.quiz;
    if (!q) return;
    if (q.revealed) return advance();
    judge(q.answerText($('answerInput').value));
  });

  document.addEventListener('keydown', (ev) => {
    const q = state.quiz;
    const typing = ev.target instanceof HTMLInputElement && !ev.target.disabled;
    if (ev.key === 'Escape') {
      // On the menu, Escape is the close button: dismissing it is how you get
      // to the free-roam map. Everywhere else it still backs out to the menu.
      if (!$('panelMenu').hidden) return showExplore();
      return state.set !== null ? showSets() : showMenu();
    }
    if (!typing) {
      if (ev.key === '+' || ev.key === '=') return map.zoomBy(1.6);
      if (ev.key === '-') return map.zoomBy(1 / 1.6);
      if (ev.key === '0') return map.reset();
    }
    if (!$('learnCard').hidden) {
      // A focused button already turns Enter/Space into a click. Claiming them
      // here as well would preventDefault the activation, so the pronounce
      // button would go silent for anyone navigating by keyboard.
      const onButton = document.activeElement?.tagName === 'BUTTON';
      if (ev.key === 'ArrowRight' || (!onButton && (ev.key === 'Enter' || ev.key === ' '))) {
        ev.preventDefault();
        return stepLearn(1);
      }
      if (ev.key === 'ArrowLeft') return stepLearn(-1);
      return;
    }
    if (!q || typing) return;
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      if (q.revealed) advance();
      else judge(q.reveal());
      return;
    }
    if (MODES[q.mode].kind === 'choice' && /^[1-4]$/.test(ev.key)) {
      const c = q.choices[Number(ev.key) - 1];
      if (c && !q.revealed) judge(q.answerChoice(c.id));
    }
  });
}

/* --------------------------------------------------------------------- boot */

/**
 * Study sets normally ship in the data file. Rebuild them from per-country
 * `rank`/`set` fields if only those survive, so a half-updated payload still
 * gives a working course.
 */
function setsFrom(data) {
  if (Array.isArray(data.sets) && data.sets.length) return data.sets;
  const ranked = data.countries.filter((c) => c.set && c.rank).sort((a, b) => a.rank - b.rank);
  if (!ranked.length) return [];
  const byN = new Map();
  for (const c of ranked) {
    if (!byN.has(c.set)) byN.set(c.set, []);
    byN.get(c.set).push(c.id);
  }
  return [...byN.entries()].sort((a, b) => a[0] - b[0]).map(([n, ids]) => ({ n, ids }));
}

async function boot() {
  // Consume an OAuth redirect before anything else reads the URL, so the code
  // and state never linger in the address bar or in a shared link.
  const back = CLOUD_ENABLED ? await completeSignIn() : { handled: false };

  // `cache: 'no-cache'` forces revalidation: a plain static server sends no
  // ETag or Cache-Control, so browsers otherwise keep serving a stale data
  // file — which silently strips the course out of the app.
  const res = await fetch('data/countries.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`countries.json: HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.countries) || !data.countries.length) {
    throw new Error('countries.json has no countries');
  }
  countries = data.countries;
  byId = new Map(countries.map((c) => [c.id, c]));
  course = new Course(setsFrom(data), byId);
  map = new WorldMap($('map'), countries, { onPick, onHover }, data.land || []);
  $('footInfo').textContent =
    `${data.count} countries · ${data.source} · keys: Enter answer/next, 1-4 choices, +/-/0 zoom, Esc back`;
  $('loading').hidden = true;
  setEnabled(!state.muted);
  const btnSound = $('btnSound');
  btnSound.textContent = `Sound: ${state.muted ? 'off' : 'on'}`;
  btnSound.setAttribute('aria-pressed', String(!state.muted));
  bind(); // delegate every data-cuelume-* interaction, including future DOM
  bindChrome();

  if (CLOUD_ENABLED) {
    cloud = new Cloud({
      stats,
      course,
      onStatus: renderAccount,
      // A merge can change progress under any open screen.
      onData: () => {
        renderMenu();
        if (!$('panelCourse').hidden) renderSetList();
      },
    });
    if (back.error) toast(`Sign-in failed: ${back.error}`, 'bad', 5000);
  }
  showMenu();
  // Connecting is deliberately not awaited: the map is playable immediately and
  // the account row fills itself in when the session lands.
  if (cloud) openSession();
}

// A handler that throws must never look like a dead button.
addEventListener('error', (ev) => {
  if (map) toast(`Something broke: ${ev.message}`, 'bad', 4000);
});
addEventListener('unhandledrejection', (ev) => {
  if (map) toast(`Something broke: ${ev.reason?.message ?? ev.reason}`, 'bad', 4000);
});

boot().catch((err) => {
  $('loading').hidden = false;
  $('loading').textContent = `Could not load the map: ${err.message}`;
  console.error(err);
});
