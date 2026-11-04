// Elevator Control System – DFA M = (Q, Σ, δ, q0, F) from the documentation
const Q = ['q0','q1','q2','q3','q4'], SIGMA = ['U','D','A','O','C'], START = 'q0', F = ['q4'];
const T = {
  q0:{U:'q1',D:'q2',A:'q0',O:'q4',C:'q0'},
  q1:{U:'q1',D:'q1',A:'q3',O:'q1',C:'q1'},
  q2:{U:'q2',D:'q2',A:'q3',O:'q2',C:'q2'},
  q3:{U:'q3',D:'q3',A:'q3',O:'q4',C:'q0'},
  q4:{U:'q4',D:'q4',A:'q4',O:'q4',C:'q0'}};
const NAME = {q0:'IDLE',q1:'MOVING_UP',q2:'MOVING_DOWN',q3:'ARRIVED',q4:'DOOR_OPEN'};
const STATUS = {q0:'Idle',q1:'Moving Up',q2:'Moving Down',q3:'Arrived',q4:'Door Open'};
const FLOORS = [0,1,2,3,4,5];
const $ = id => document.getElementById(id);
let cur, floor, target, word, count, timer;

function build(){
  $('shaft').innerHTML = [...FLOORS].reverse().map(f=>`<div class="row">${f||'G'}</div>`).join('')+'<div id="cabin"><i class="door"></i><i class="door"></i></div>';
  $('floorBtns').innerHTML = [...FLOORS].reverse().map(f=>`<button data-floor="${f}">${f||'G'}</button>`).join('');
  $('tbody').innerHTML = Q.map(q=>`<tr data-q="${q}"><td>${q==='q0'?'→ ':''}${F.includes(q)?'* ':''}${q}</td>${SIGMA.map(s=>`<td data-c="${q}|${s}">${T[q][s]}</td>`).join('')}</tr>`).join('');
}
function log(m,c=''){const li=document.createElement('li');li.className=c;li.textContent=m;$('log').prepend(li);}

function dispatch(sym){
  clearTimeout(timer);
  const prev=cur, next=T[prev][sym];
  cur=next; count++; word.push(sym);
  if(next==='q3') target=floor;
  log(`#${count} ${sym}: ${prev} → ${next}${prev===next?' (self-loop, ignored)':''}`, prev===next?'ignored':'');
  render(prev,sym); schedule();
}
function schedule(){
  if(cur==='q1'||cur==='q2') timer=setTimeout(()=>{
    floor+= cur==='q1'?1:-1;
    if(floor===target) dispatch('A'); else {render(); schedule();}
  },950);
  else if(cur==='q3') timer=setTimeout(()=>dispatch('O'),700);
  else if(cur==='q4') timer=setTimeout(()=>dispatch('C'),1800);
}
function pressFloor(f){
  if(f===floor && cur==='q0') return dispatch('O');          // same floor: just open doors
  if(f===floor) return log(`Request for floor ${f||'G'} ignored in ${cur}`,'ignored');
  const sym = f>floor?'U':'D';
  if(cur==='q0') target=f;
  dispatch(sym);
}
function applyRaw(sym){
  if(cur==='q0' && (sym==='U'||sym==='D')){
    const f=floor+(sym==='U'?1:-1);
    if(f<0||f>5) return log(`No floor ${sym==='U'?'above':'below'} – ${sym} not applied`,'ignored');
    target=f;
  }
  dispatch(sym);
}
function render(prev,sym){
  const acc=F.includes(cur);
  $('cabin').style.bottom=floor*55+4+'px';
  $('cabin').classList.toggle('open',cur==='q4');
  $('floorNum').textContent=floor||'G';
  $('arrow').textContent=cur==='q1'?'▲':cur==='q2'?'▼':'■';
  $('status').textContent=STATUS[cur];
  $('curState').textContent=`${cur} (${NAME[cur]})`;
  $('acc').textContent=acc?'Accepting state':'Not accepting'; $('acc').className=acc?'yes':'';
  $('word').textContent=word.length?word.join(''):'(empty string)';
  $('result').textContent=acc?'Accepted':'Rejected'; $('result').className=acc?'yes':'no';
  document.querySelectorAll('#tbody tr').forEach(r=>r.classList.toggle('cur',r.dataset.q===cur));
  document.querySelectorAll('#tbody td').forEach(td=>td.classList.remove('hit'));
  if(sym){
    document.querySelector(`td[data-c="${prev}|${sym}"]`).classList.add('hit');
    $('last').innerHTML=`δ(<b>${prev}</b>, <b>${sym}</b>) = <b>${cur}</b><br>${prev===cur?'Defined self-loop: input ignored.':NAME[prev]+' → '+NAME[cur]}`;
  }
}
function reset(){
  clearTimeout(timer); cur=START; floor=0; target=null; word=[]; count=0;
  $('log').innerHTML=''; $('last').textContent='No input yet.'; log('System initialized: q0 (IDLE)');
  render();
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return;
  if(b.dataset.floor!==undefined) pressFloor(+b.dataset.floor);
  else if(b.dataset.sym) dispatch(b.dataset.sym);
});
$('applyBtn').onclick=()=>applyRaw($('inputSel').value);
$('resetBtn').onclick=reset;
$('clearBtn').onclick=()=>{$('log').innerHTML='';};
$('exampleBtn').onclick=()=>{reset();pressFloor(3);};
build(); reset();