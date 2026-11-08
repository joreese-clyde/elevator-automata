// Elevator DFA: Σ = {0,1,2,3,4,G}. 0 = open door, 1 = close door, G/2/3/4 = floor
const Q = ['q0','q1','q2'], SIGMA = ['0','1','2','3','4','G'], START = 'q0', F = ['q1'];
const FLOORSYM = ['G','2','3','4'];
const T = {
  q0:{0:'q1',1:'q0',2:'q0',3:'q0',4:'q0',G:'q0'},   // STANDBY: floors ignored, open the door first
  q1:{0:'q1',1:'q2',2:'q1',3:'q1',4:'q1',G:'q1'},   // DOOR_OPEN: only 1 (close) leads on
  q2:{0:'q1',1:'q2',2:'q0',3:'q0',4:'q0',G:'q0'}};  // READY: a floor key sends the car, then STANDBY
const NAME = {q0:'STANDBY',q1:'DOOR_OPEN',q2:'READY'};
const STATUS = {q0:'Standby, door closed',q1:'Door open',q2:'Ready, door closed'};
const HINT = {q0:'Open the door first.',q1:'Close the door to continue.',q2:'Choose a floor.'};
const POS = {q0:[110,300],q1:[590,300],q2:[350,120]}, LOOP = {q0:[0,1],q1:[0,1],q2:[0,-1]}, R = 40;
const $ = id => document.getElementById(id);
let cur, floor, word, count, busy = false, dir = 0;

const EDGES = {};
Q.forEach(a => SIGMA.forEach(s => { const k = a+'|'+T[a][s]; (EDGES[k] = EDGES[k] || []).push(s); }));

function build() {
  $('shaft').innerHTML = [...FLOORSYM].reverse().map(f => `<div class="row">${f}</div>`).join('') + '<div id="cabin"><i class="door"></i><i class="door"></i></div>';
  $('floorBtns').innerHTML = [...FLOORSYM].reverse().map(f => `<button data-sym="${f}">${f}</button>`).join('');
  $('tbody').innerHTML = Q.map(q => `<tr data-q="${q}"><td>${q===START?'→ ':''}${F.includes(q)?'* ':''}${q}</td>${SIGMA.map(s => `<td data-c="${q}|${s}">${T[q][s]}</td>`).join('')}</tr>`).join('');
  const o = ['<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z"/></marker></defs>'];
  Object.entries(EDGES).forEach(([k, l]) => {
    const [a, b] = k.split('|'), [x1, y1] = POS[a], [x2, y2] = POS[b]; let d, lx, ly;
    if (a === b) {
      const [dx, dy] = LOOP[a], sx = x1, sy = y1 + dy*R;
      d = `M${sx-12} ${sy} C${sx-45} ${sy+dy*55} ${sx+45} ${sy+dy*55} ${sx+12} ${sy}`;
      lx = x1; ly = y1 + dy*(R+52) + (dy > 0 ? 10 : -2);
    } else {
      const dx = x2-x1, dy = y2-y1, m = Math.hypot(dx, dy), ux = dx/m, uy = dy/m;
      const sx = x1+ux*R, sy = y1+uy*R, ex = x2-ux*(R+6), ey = y2-uy*(R+6);
      const cx = (sx+ex)/2 - uy*40, cy = (sy+ey)/2 + ux*40;
      d = `M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`; lx = (sx+2*cx+ex)/4; ly = (sy+2*cy+ey)/4;
    }
    o.push(`<g class="edge" data-edge="${k}"><path d="${d}" marker-end="url(#ar)"/><text x="${lx}" y="${ly}">${l.join(', ')}</text></g>`);
  });
  Q.forEach(q => { const [x, y] = POS[q];
    o.push(`<g class="node" data-q="${q}"><circle cx="${x}" cy="${y}" r="${R}"/>${F.includes(q)?`<circle cx="${x}" cy="${y}" r="${R-6}"/>`:''}<text x="${x}" y="${y}">${q}</text><text class="sub" x="${x}" y="${y+14}">${NAME[q]}</text></g>`); });
  o.push(`<path class="start" d="M10 300 L${110-R-6} 300" marker-end="url(#ar)"/><text x="14" y="290" fill="#8b6cff" font-size="12">start</text>`);
  $('diagram').innerHTML = o.join('');
}
function log(m, c = '') { const li = document.createElement('li'); li.className = c; li.textContent = m; $('log').prepend(li); }

function dispatch(sym) {
  const prev = cur, next = T[prev][sym];
  dir = 0;
  if (prev === 'q2' && FLOORSYM.includes(sym)) {            // the car only moves from READY
    const f = FLOORSYM.indexOf(sym); dir = Math.sign(f - floor); floor = f;
  }
  cur = next; count++; word.push(sym);
  const note = prev === next ? (prev === 'q0' && FLOORSYM.includes(sym) ? ' (ignored: open the door first)' : ' (self-loop, ignored)') : '';
  log(`#${count} ${sym}: ${prev} → ${next}${note}`, prev === next ? 'ignored' : '');
  render(prev, sym);
}
function render(prev, sym) {
  const acc = F.includes(cur);
  $('cabin').style.bottom = floor*62 + 4 + 'px';
  $('cabin').classList.toggle('open', cur === 'q1');
  $('floorNum').textContent = FLOORSYM[floor];
  $('arrow').textContent = dir > 0 ? '▲' : dir < 0 ? '▼' : '■';
  $('status').textContent = STATUS[cur];
  $('hint').textContent = HINT[cur];
  $('curState').textContent = `${cur} (${NAME[cur]})`;
  $('acc').textContent = acc ? 'Final state' : 'Not final'; $('acc').className = acc ? 'yes' : '';
  $('word').textContent = word.length ? word.join('') : '(empty string)';
  $('result').textContent = acc ? 'Accepted' : 'Rejected'; $('result').className = acc ? 'yes' : 'no';
  document.querySelectorAll('#tbody tr').forEach(r => r.classList.toggle('cur', r.dataset.q === cur));
  document.querySelectorAll('#tbody td').forEach(td => td.classList.remove('hit'));
  document.querySelectorAll('.node').forEach(n => n.classList.toggle('current', n.dataset.q === cur));
  document.querySelectorAll('.edge').forEach(e => e.classList.remove('active'));
  if (sym) {
    document.querySelector(`td[data-c="${prev}|${sym}"]`).classList.add('hit');
    document.querySelector(`.edge[data-edge="${prev}|${cur}"]`).classList.add('active');
    $('last').innerHTML = `δ(<b>${prev}</b>, <b>${sym}</b>) = <b>${cur}</b><br>${prev === cur ? 'Self-loop: input ignored.' : NAME[prev] + ' → ' + NAME[cur]}`;
  }
}
function reset() {
  cur = START; floor = 0; word = []; count = 0; dir = 0;
  $('log').innerHTML = ''; $('last').textContent = 'No input yet.'; log('System initialized: q0 (STANDBY) at G');
  render();
}
const wait = ms => new Promise(r => setTimeout(r, ms));
document.addEventListener('click', e => {
  const b = e.target.closest('button[data-sym]'); if (b && !busy) dispatch(b.dataset.sym);
});
$('resetBtn').onclick = () => { if (!busy) reset(); };
$('clearBtn').onclick = () => { $('log').innerHTML = ''; };
$('runBtn').onclick = async () => {
  if (busy) return;
  const s = $('strIn').value.trim().toUpperCase();
  if (!/^[01234G]*$/.test(s)) { $('err').textContent = 'Only the symbols 0, 1, 2, 3, 4, G are allowed.'; return; }
  $('err').textContent = 'Symbols: 0, 1, 2, 3, 4, G.';
  busy = true; reset();
  for (const ch of s) { await wait(1000); dispatch(ch); }
  busy = false;
};
build(); reset();