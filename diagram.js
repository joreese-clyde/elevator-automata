// State diagram page – same DFA as the documentation (standalone)
const SIGMA=['U','D','A','O','C'], F=['q4'];
const T={q0:{U:'q1',D:'q2',A:'q0',O:'q4',C:'q0'},q1:{U:'q1',D:'q1',A:'q3',O:'q1',C:'q1'},
 q2:{U:'q2',D:'q2',A:'q3',O:'q2',C:'q2'},q3:{U:'q3',D:'q3',A:'q3',O:'q4',C:'q0'},q4:{U:'q4',D:'q4',A:'q4',O:'q4',C:'q0'}};
const NAME={q0:'IDLE',q1:'MOVING_UP',q2:'MOVING_DOWN',q3:'ARRIVED',q4:'DOOR_OPEN'};
const POS={q0:[350,200],q1:[110,100],q2:[110,310],q3:[590,100],q4:[590,310]};
const LOOP={q0:[0,-1],q1:[0,-1],q2:[0,1],q3:[0,-1],q4:[0,1]}, R=36;
const EXAMPLES=['O','UAO','DAO','UUADO','UAOUAO','UAOCDAO','','UDAC','UA','UO','UAC','UAOC','UAOUC','AC'];
const $=id=>document.getElementById(id);
let cur='q0', word='', busy=false;

// group transitions into edges: "from|to" -> labels
const EDGES={};
Object.keys(T).forEach(a=>SIGMA.forEach(s=>{const k=a+'|'+T[a][s];(EDGES[k]=EDGES[k]||[]).push(s);}));

function build(){
  const o=[`<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z"/></marker></defs>`];
  Object.entries(EDGES).forEach(([k,l])=>{
    const [a,b]=k.split('|'), [x1,y1]=POS[a], [x2,y2]=POS[b]; let d,lx,ly;
    if(a===b){
      const [dx,dy]=LOOP[a], px=-dy, py=dx, sx=x1+dx*R, sy=y1+dy*R;
      d=`M${sx+px*12} ${sy+py*12} C${sx+dx*50+px*40} ${sy+dy*50+py*40} ${sx+dx*50-px*40} ${sy+dy*50-py*40} ${sx-px*12} ${sy-py*12}`;
      lx=x1+dx*(R+48); ly=y1+dy*(R+48)+4;
    }else{
      const dx=x2-x1, dy=y2-y1, m=Math.hypot(dx,dy), ux=dx/m, uy=dy/m;
      const sx=x1+ux*R, sy=y1+uy*R, ex=x2-ux*(R+6), ey=y2-uy*(R+6);
      const cx=(sx+ex)/2-uy*30, cy=(sy+ey)/2+ux*30;
      d=`M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`; lx=(sx+2*cx+ex)/4; ly=(sy+2*cy+ey)/4;
    }
    o.push(`<g class="edge" data-edge="${k}"><path d="${d}" marker-end="url(#ar)"/><text x="${lx}" y="${ly}">${l.join(', ')}</text></g>`);
  });
  Object.keys(POS).forEach(q=>{const [x,y]=POS[q];
    o.push(`<g class="node" data-q="${q}"><circle cx="${x}" cy="${y}" r="${R}"/>${F.includes(q)?`<circle cx="${x}" cy="${y}" r="${R-6}"/>`:''}<text x="${x}" y="${y+2}">${q}</text><text class="sub" x="${x}" y="${y+16}">${NAME[q]}</text></g>`);});
  o.push(`<path class="start" d="M230 200 L${350-R-6} 200" marker-end="url(#ar)"/><text x="235" y="190" fill="#8b6cff" font-size="12">start</text>`);
  $('diagram').innerHTML=o.join('');
  $('btns').innerHTML=SIGMA.map(s=>`<button data-s="${s}">${s}</button>`).join('');
  $('ex').innerHTML=EXAMPLES.map(e=>`<option value="${e}">${e||'(empty string)'}</option>`).join('');
}
function render(prev,sym){
  const acc=F.includes(cur);
  document.querySelectorAll('.node').forEach(n=>n.classList.toggle('current',n.dataset.q===cur));
  document.querySelectorAll('.edge').forEach(e=>e.classList.remove('active'));
  if(sym){document.querySelector(`.edge[data-edge="${prev}|${cur}"]`).classList.add('active');
    $('last').innerHTML=`δ(<b>${prev}</b>, <b>${sym}</b>) = <b>${cur}</b>${prev===cur?' — self-loop':''}`;}
  $('cur').textContent=cur; $('nm').textContent=NAME[cur];
  $('word').textContent=word||'(empty string)';
  $('result').textContent=acc?'Accepted':'Rejected'; $('result').className=acc?'yes':'no';
}
function step(s){const p=cur; cur=T[p][s]; word+=s; render(p,s);}
function reset(){cur='q0'; word=''; $('last').textContent='Press U, D, A, O or C.'; render();}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
$('btns').onclick=e=>{const b=e.target.closest('button'); if(b&&!busy) step(b.dataset.s);};
$('resetBtn').onclick=()=>{if(!busy) reset();};
$('runBtn').onclick=async()=>{
  if(busy) return; busy=true; reset();
  for(const s of $('ex').value){await wait(700); step(s);}
  busy=false;
};
build(); reset();