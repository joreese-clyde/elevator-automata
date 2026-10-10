/* ===================================================================
   ELEVATOR DFA SIMULATOR
   Part 1: the DFA (pure logic, no DOM)   Part 2: UI that only READS it
   =================================================================== */

// ---------- PART 1: THE DFA -----------------------------------------
const FLOORS = [0, 1, 2, 3, 4, 5];
// Alphabet (Σ): 6 floor requests + 3 events
const ALPHABET = [...FLOORS.map(f => 'SELECT_' + f), 'FLOOR_REACHED', 'OPEN_DOOR', 'CLOSE_DOOR'];
const inputClass = a => (a.startsWith('SELECT_') ? 'SELECT_n' : a);

const stateName = (phase, floor, target) =>
  target == null ? `${phase}[${floor}]` : `${phase}[${floor}→${target}]`;

// Q: every state = (phase, floor, destination). Destination exists only while moving,
// so the model is finite: 6 IDLE + 15 UP + 15 DOWN + 6 ARRIVED + 6 DOOR_OPEN = 48 states.
const STATE_INFO = {};
function addState(phase, floor, target) {
  STATE_INFO[stateName(phase, floor, target)] = { phase, floor, target };
}
FLOORS.forEach(f => {
  ['IDLE', 'ARRIVED', 'DOOR_OPEN'].forEach(p => addState(p, f));
  FLOORS.forEach(t => { if (t > f) addState('MOVING_UP', f, t); if (t < f) addState('MOVING_DOWN', f, t); });
});

const INITIAL_STATE = stateName('IDLE', 0);            // q0: parked at ground floor, doing nothing
const isAccepting = s => STATE_INFO[s].phase === 'DOOR_OPEN'; // F: doors open at a stopped floor

// Rule used ONCE at start-up to fill the table. Returns [nextState, explanation].
function buildRule(s, a) {
  const { phase: p, floor: f, target: t } = s;
  const sel = a.startsWith('SELECT_') ? Number(a.slice(7)) : null;
  const stay = why => [stateName(p, f, t), why];
  if (p === 'IDLE') {
    if (sel === f) return [stateName('DOOR_OPEN', f), 'Requested floor is the current floor, so the doors open.'];
    if (sel !== null) return [stateName(sel > f ? 'MOVING_UP' : 'MOVING_DOWN', f, sel), `Request accepted: destination ${sel} is ${sel > f ? 'above' : 'below'}, so the car starts moving.`];
    if (a === 'OPEN_DOOR') return [stateName('DOOR_OPEN', f), 'Doors may open while the car is stopped.'];
    return stay('Nothing to do while idle, so the input is ignored (self-loop).');
  }
  if (p === 'MOVING_UP' || p === 'MOVING_DOWN') {
    if (a === 'FLOOR_REACHED') {
      const n = f + (p === 'MOVING_UP' ? 1 : -1);
      return n === t ? [stateName('ARRIVED', n), 'The car reached its destination floor.']
                     : [stateName(p, n, t), 'The car passed a floor and keeps moving toward its destination.'];
    }
    return stay('Requests and doors are locked while moving, so the input is ignored (self-loop).');
  }
  if (p === 'ARRIVED') {
    if (a === 'OPEN_DOOR') return [stateName('DOOR_OPEN', f), 'Passengers can now get on or off.'];
    if (a === 'CLOSE_DOOR') return [stateName('IDLE', f), 'Doors are already closed; the car becomes idle.'];
    return stay('Not meaningful right after arrival, so the input is ignored (self-loop).');
  }
  if (a === 'CLOSE_DOOR') return [stateName('IDLE', f), 'Doors close and the car waits for the next request.'];
  return stay('Doors are open: other inputs are ignored (self-loop).');
}

// δ as a table: TABLE[state][input] = next state. SINGLE SOURCE OF TRUTH.
const TABLE = {}, EXPLAIN = {};
Object.keys(STATE_INFO).forEach(s => {
  TABLE[s] = {}; EXPLAIN[s] = {};
  ALPHABET.forEach(a => { [TABLE[s][a], EXPLAIN[s][a]] = buildRule(STATE_INFO[s], a); });
});

// δ(state, input): a pure lookup. Same pair -> same answer, defined for all pairs.
function transition(state, input) { return TABLE[state][input]; }

// ---------- Phase-level summary (for diagram and table), derived from TABLE ----
const PHASES = ['IDLE', 'MOVING_UP', 'MOVING_DOWN', 'ARRIVED', 'DOOR_OPEN'];
const phaseOf = s => STATE_INFO[s].phase;
const EDGES = {}, ROWS = {};
Object.keys(TABLE).forEach(s => ALPHABET.forEach(a => {
  const pf = phaseOf(s), pt = phaseOf(TABLE[s][a]), c = inputClass(a);
  (EDGES[pf + '|' + pt] = EDGES[pf + '|' + pt] || new Set()).add(c);
  const k = `${pf}|${c}|${pt}`;
  if (!ROWS[k]) ROWS[k] = { pf, c, pt, why: EXPLAIN[s][a].replace(/destination \d is (above|below)/, 'destination is $1') };
}));

// ---------- PART 2: UI -----------------------------------------------
const $ = id => document.getElementById(id);
let current, count, word, tripStart, statusText, timer = null, auto = true, muted = false, audio;

const NODE = { IDLE: [110, 200], MOVING_UP: [290, 60], MOVING_DOWN: [290, 340], ARRIVED: [570, 100], DOOR_OPEN: [570, 300] };
const R = 40;

function buildShaft() {
  $('shaft').innerHTML = [...FLOORS].reverse().map(f => `<div class="row"><span>${f === 0 ? 'G' : f}</span></div>`).join('') +
    '<div id="cabin"><i class="door"></i><i class="door"></i></div>';
  $('floorBtns').innerHTML = [...FLOORS].reverse().map(f => `<button data-in="SELECT_${f}">${f === 0 ? 'G' : f}</button>`).join('');
  $('inputSel').innerHTML = ALPHABET.map(a => `<option>${a}</option>`).join('');
}

function buildDiagram() {
  const svg = [`<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z"/></marker></defs>`];
  Object.keys(EDGES).forEach(k => {
    const [a, b] = k.split('|'), labels = [...EDGES[k]], title = labels.join(', ');
    const text = labels.length > 2 ? `${labels[0]} +${labels.length - 1}` : labels.join(', ');
    let d, lx, ly;
    const [x1, y1] = NODE[a], [x2, y2] = NODE[b];
    if (a === b) {                                  // self-loop pointing away from the centre
      let dx = x1 - 340, dy = y1 - 200; const m = Math.hypot(dx, dy); dx /= m; dy /= m;
      const px = -dy, py = dx, sx = x1 + dx * R, sy = y1 + dy * R;
      d = `M${sx + px * 14} ${sy + py * 14} C${sx + dx * 60 + px * 50} ${sy + dy * 60 + py * 50} ${sx + dx * 60 - px * 50} ${sy + dy * 60 - py * 50} ${sx - px * 14} ${sy - py * 14}`;
      lx = x1 + dx * (R + 62); ly = y1 + dy * (R + 62);
    } else {
      const dx = x2 - x1, dy = y2 - y1, m = Math.hypot(dx, dy), ux = dx / m, uy = dy / m;
      const sx = x1 + ux * R, sy = y1 + uy * R, ex = x2 - ux * (R + 6), ey = y2 - uy * (R + 6);
      const off = (a === 'ARRIVED' && b === 'IDLE') ? -70 : 32;
      const cx = (sx + ex) / 2 - uy * off, cy = (sy + ey) / 2 + ux * off;
      d = `M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`;
      lx = (sx + 2 * cx + ex) / 4; ly = (sy + 2 * cy + ey) / 4;
    }
    svg.push(`<g class="edge" data-edge="${k}"><title>${title}</title><path d="${d}" marker-end="url(#ar)"/><text x="${lx}" y="${ly}">${text}</text></g>`);
  });
  PHASES.forEach(p => {
    const [x, y] = NODE[p];
    svg.push(`<g class="node ${p === 'DOOR_OPEN' ? 'accept' : ''}" data-phase="${p}"><circle cx="${x}" cy="${y}" r="${R}"/>${p === 'DOOR_OPEN' ? `<circle cx="${x}" cy="${y}" r="${R - 6}"/>` : ''}<text x="${x}" y="${y + 4}">${p}</text></g>`);
  });
  svg.push(`<path class="start" d="M20 200 L${110 - R - 6} 200" marker-end="url(#ar)"/><text class="startt" x="20" y="188">start</text>`);
  $('diagram').innerHTML = svg.join('');
}

function buildTable() {
  $('tbody').innerHTML = Object.entries(ROWS).map(([k, r]) =>
    `<tr data-row="${k}"><td>${r.pf}</td><td>${r.c}</td><td>${r.pt}</td><td>${r.why}</td></tr>`).join('');
}

function log(msg, cls = '') {
  const li = document.createElement('li'); li.className = cls; li.textContent = msg;
  $('log').prepend(li);
}

function beep() {
  if (muted) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = 880; g.gain.setValueAtTime(0.15, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.5);
    o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.5);
  } catch (e) { /* audio is optional */ }
}

// The only function that changes the DFA state.
function dispatch(input) {
  clearTimeout(timer);
  const prev = current, next = transition(prev, input), why = EXPLAIN[prev][input];
  const changed = prev !== next;
  current = next; count++; word.push(input);
  const pp = phaseOf(prev), np = phaseOf(next);
  if (pp === 'IDLE' && (np === 'MOVING_UP' || np === 'MOVING_DOWN')) tripStart = STATE_INFO[prev].floor;
  statusText = { IDLE: pp === 'DOOR_OPEN' ? 'Door Closing' : 'Idle', MOVING_UP: 'Moving Up', MOVING_DOWN: 'Moving Down', ARRIVED: 'Arrived', DOOR_OPEN: pp === 'DOOR_OPEN' ? 'Door Open' : 'Door Opening' }[np];
  log(`#${count} Input ${input}: ${prev} → ${next}. ${why}`, changed ? '' : 'ignored');
  if (np === 'ARRIVED') { log(`Destination reached: floor ${STATE_INFO[next].floor}`, 'ok'); beep(); }
  render(prev, input, next, why);
  scheduleInternal();
  return next;
}

// Internal events the elevator itself produces (sensor / door timer)
function internalInput(s) {
  const p = phaseOf(s);
  return p.startsWith('MOVING') ? 'FLOOR_REACHED' : p === 'ARRIVED' ? 'OPEN_DOOR' : p === 'DOOR_OPEN' ? 'CLOSE_DOOR' : null;
}
function scheduleInternal() {
  const nxt = internalInput(current);
  $('stepBtn').disabled = !nxt;
  $('hint').textContent = nxt ? `Next event the elevator would produce: ${nxt}` : 'Waiting for a floor request.';
  if (auto && nxt) timer = setTimeout(() => dispatch(nxt), phaseOf(current) === 'DOOR_OPEN' ? 1800 : phaseOf(current) === 'ARRIVED' ? 700 : 950);
}

function render(prev, input, next, why) {
  const info = STATE_INFO[next], p = info.phase;
  $('cabin').style.bottom = info.floor * 55 + 'px';
  $('cabin').classList.toggle('open', p === 'DOOR_OPEN');
  $('floorNum').textContent = info.floor === 0 ? 'G' : info.floor;
  $('arrow').textContent = p === 'MOVING_UP' ? '▲' : p === 'MOVING_DOWN' ? '▼' : '■';
  $('status').textContent = statusText;
  $('curState').textContent = next;
  $('acc').textContent = isAccepting(next) ? 'Accepting state (doors open at a stopped floor)' : 'Not accepting';
  $('acc').className = isAccepting(next) ? 'yes' : '';
  $('count').textContent = count;
  $('word').textContent = word.length ? word.join(' ') : '(empty string)';
  const pr = p.startsWith('MOVING') ? Math.abs(info.floor - tripStart) / Math.abs(info.target - tripStart) : (p === 'ARRIVED' || p === 'DOOR_OPEN') && count ? 1 : 0;
  $('bar').style.width = (pr * 100) + '%';
  if (input) {
    const changed = prev !== next;
    $('last').innerHTML = `<b>${prev}</b> <span class="sym">— ${input} →</span> <b>${next}</b><br>In Σ: yes. Effect: ${changed ? 'state changed' : 'ignored (defined self-loop)'}.<br>${why}`;
  }
  document.querySelectorAll('.node').forEach(n => n.classList.toggle('current', n.dataset.phase === p));
  document.querySelectorAll('.edge, tr[data-row]').forEach(e => e.classList.remove('active'));
  if (input) {
    const ek = phaseOf(prev) + '|' + p, rk = `${phaseOf(prev)}|${inputClass(input)}|${p}`;
    document.querySelector(`.edge[data-edge="${ek}"]`)?.classList.add('active');
    const row = document.querySelector(`tr[data-row="${rk}"]`);
    row?.classList.add('active'); row?.scrollIntoView({ block: 'nearest' });
  }
}

function reset() {
  clearTimeout(timer);
  current = INITIAL_STATE; count = 0; word = []; tripStart = 0; statusText = 'Idle';
  $('log').innerHTML = ''; $('last').textContent = 'No input yet.';
  log(`System initialized. Current state: ${current}`);
  render(null, null, current); scheduleInternal();
}

// ---------- Quiz ------------------------------------------------------
const QUIZ = [
  { q: 'The elevator is in IDLE[0]. What does the input SELECT_3 lead to?', o: ['MOVING_UP[0→3]', 'ARRIVED[3]', 'IDLE[0]'], a: 0, e: 'Floor 3 is above floor 0, so the DFA goes to a MOVING_UP state that remembers the destination.' },
  { q: 'In MOVING_UP[1→3], the input OPEN_DOOR is applied. What happens?', o: ['Doors open', 'State stays the same (self-loop)', 'Error: no transition'], a: 1, e: 'A DFA needs a transition for every state/input pair. Here the defined answer is to stay put.' },
  { q: 'Which is the initial state q₀?', o: ['DOOR_OPEN[0]', 'IDLE[0]', 'ARRIVED[0]'], a: 1, e: 'The elevator starts parked at the ground floor with no pending request.' },
  { q: 'Why is IDLE not an accepting state?', o: ['It is not a real state', 'Accepting means "doors open at a stopped floor", which marks a completed trip', 'Accepting states must be moving'], a: 1, e: 'Accepting states are a choice we make to recognise valid input strings; not every operational state qualifies.' }
];
function buildQuiz() {
  $('quiz').innerHTML = QUIZ.map((x, i) => `<div class="q"><p>${i + 1}. ${x.q}</p>${x.o.map((t, j) => `<button data-q="${i}" data-o="${j}">${t}</button>`).join('')}<p class="fb" id="fb${i}"></p></div>`).join('');
}

// ---------- Events ----------------------------------------------------
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.in) dispatch(b.dataset.in);
  if (b.dataset.q) {
    const x = QUIZ[b.dataset.q], ok = +b.dataset.o === x.a, fb = $('fb' + b.dataset.q);
    fb.textContent = (ok ? 'Correct. ' : 'Not quite. ') + x.e; fb.className = 'fb ' + (ok ? 'yes' : 'no');
  }
});
$('applyBtn').onclick = () => dispatch($('inputSel').value);
$('stepBtn').onclick = () => { const n = internalInput(current); if (n) dispatch(n); };
$('autoBtn').onclick = () => { auto = !auto; $('autoBtn').textContent = auto ? 'Mode: Auto' : 'Mode: Step-by-step'; clearTimeout(timer); scheduleInternal(); };
$('muteBtn').onclick = () => { muted = !muted; $('muteBtn').textContent = muted ? 'Sound: off' : 'Sound: on'; };
$('resetBtn').onclick = reset;
$('clearBtn').onclick = () => { $('log').innerHTML = ''; };
$('exampleBtn').onclick = () => { reset(); auto = true; $('autoBtn').textContent = 'Mode: Auto'; dispatch('SELECT_3'); };

// Static numbers in the learning section come from the real model
$('nStates').textContent = Object.keys(STATE_INFO).length;
$('nSigma').textContent = ALPHABET.length;
buildShaft(); buildDiagram(); buildTable(); buildQuiz(); reset();