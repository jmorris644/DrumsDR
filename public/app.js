const LIMB = {
  RH:{name:"Right hand", color:"#2f81f7", pan: 0.35, shape:"snare"},
  LH:{name:"Left hand",  color:"#f0524b", pan:-0.35, shape:"snare"},
  RF:{name:"Right foot", color:"#33b158", pan: 0.25, shape:"kick"},
  LF:{name:"Left foot",  color:"#f0883e", pan:-0.25, shape:"kick"},
};
const VOICE = {s:"snare", k:"kick", t:"tom", h:"hat", r:"ride", c:"crash"};

/* ---------- SVG shapes (match drumkey.pdf) ---------- */
function shapeSVG(voice,color){
  const c=color;
  switch(voice){
    case "kick":  return `<rect x="4" y="4" width="24" height="24" rx="2" fill="${c}"/>`;
    case "snare": return `<circle cx="16" cy="16" r="12" fill="${c}"/>`;
    case "tom":   return `<circle cx="16" cy="16" r="12" fill="none" stroke="${c}" stroke-width="4"/>`;
    case "hat":   return `<path d="M16 3 L29 16 L16 29 L3 16 Z" fill="${c}"/>`;
    case "ride":  return `<path d="M16 3 L28 12 L23 27 L9 27 L4 12 Z" fill="${c}"/>`;
    case "crash": return `<path d="M16 4 L28 27 L4 27 Z" fill="${c}"/>`;
    default:      return `<circle cx="16" cy="16" r="11" fill="${c}"/>`;
  }
}
function cellNode(token){
  const limb=token.slice(0,2), voice=VOICE[token.slice(2)]||"snare";
  const el=document.createElement("div"); el.className="cell v-"+voice;
  el.style.setProperty("--c", LIMB[limb].color);
  el.appendChild(document.createElement("i"));   // lightweight CSS shape (no SVG)
  return el;
}

/* ---------- Legend ---------- */
(function(){
  const ll=document.getElementById("limbLegend");
  for(const k in LIMB){
    const d=document.createElement("div"); d.className="row";
    d.innerHTML=`<svg viewBox="0 0 32 32" width="16" height="16">${shapeSVG(LIMB[k].shape,LIMB[k].color)}</svg>${LIMB[k].name}`;
    ll.appendChild(d);
  }
  const vl=document.getElementById("voiceLegend");
  [["snare","Hands → snare (circle)"],["kick","Feet → kick (square)"]].forEach(([v,label])=>{
    const d=document.createElement("div"); d.className="row";
    d.innerHTML=`<svg viewBox="0 0 32 32" width="18" height="18">${shapeSVG(v,"#9fb0c3")}</svg>${label}`;
    vl.appendChild(d);
  });
})();

/* ---------- Audio engine ---------- */
let ctx, master, noiseBuf;
const BUFFERS={};                 // decoded sample AudioBuffers
const VLEVEL={kick:1.0,snare:0.92,tom:0.9,hat:0.55,ride:0.62,crash:0.8};
function initAudio(){
  if(ctx) return;
  ctx=new (window.AudioContext||window.webkitAudioContext)();
  master=ctx.createGain(); master.gain.value=0.8;
  const comp=ctx.createDynamicsCompressor();
  master.connect(comp); comp.connect(ctx.destination);
  const n=ctx.sampleRate*1.0; noiseBuf=ctx.createBuffer(1,n,ctx.sampleRate);
  const d=noiseBuf.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
  loadSamples();
}
function b64ToBuf(b64){
  const bin=atob(b64), len=bin.length, bytes=new Uint8Array(len);
  for(let i=0;i<len;i++) bytes[i]=bin.charCodeAt(i);
  return bytes.buffer;
}
function loadSamples(){
  for(const k in SAMPLE_B64){
    try{
      ctx.decodeAudioData(b64ToBuf(SAMPLE_B64[k]), buf=>{ BUFFERS[k]=buf; }, ()=>{});
    }catch(e){}
  }
}
function playBuf(voice,t,pan){
  const src=ctx.createBufferSource(); src.buffer=BUFFERS[voice];
  const g=ctx.createGain(); g.gain.value=(VLEVEL[voice]||0.85)*(0.9+Math.random()*0.12);
  const p=ctx.createStereoPanner(); p.pan.value=pan;
  src.connect(g); g.connect(p); p.connect(master); src.start(t);
}
function panner(p){ const n=ctx.createStereoPanner(); n.pan.value=p; n.connect(master); return n; }
function noise(){ const s=ctx.createBufferSource(); s.buffer=noiseBuf; return s; }

function kick(t,pan=0){
  const out=panner(pan);
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(50,t+0.11);
  g.gain.setValueAtTime(1.0,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.32);
  o.connect(g); g.connect(out); o.start(t); o.stop(t+0.34);
  // click
  const c=noise(), cg=ctx.createGain(), cf=ctx.createBiquadFilter();
  cf.type="lowpass"; cf.frequency.value=1200;
  cg.gain.setValueAtTime(0.5,t); cg.gain.exponentialRampToValueAtTime(0.001,t+0.03);
  c.connect(cf); cf.connect(cg); cg.connect(out); c.start(t); c.stop(t+0.04);
}
function snare(t,pan=0){
  const out=panner(pan);
  const nz=noise(), nf=ctx.createBiquadFilter(), ng=ctx.createGain();
  nf.type="highpass"; nf.frequency.value=1400;
  ng.gain.setValueAtTime(0.85,t); ng.gain.exponentialRampToValueAtTime(0.001,t+0.19);
  nz.connect(nf); nf.connect(ng); ng.connect(out); nz.start(t); nz.stop(t+0.2);
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.type="triangle"; o.frequency.setValueAtTime(190,t); o.frequency.exponentialRampToValueAtTime(120,t+0.1);
  g.gain.setValueAtTime(0.5,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.14);
  o.connect(g); g.connect(out); o.start(t); o.stop(t+0.16);
}
function tom(t,pan=0,f=180){
  const out=panner(pan); const o=ctx.createOscillator(), g=ctx.createGain();
  o.frequency.setValueAtTime(f,t); o.frequency.exponentialRampToValueAtTime(f*0.6,t+0.2);
  g.gain.setValueAtTime(0.9,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.3);
  o.connect(g); g.connect(out); o.start(t); o.stop(t+0.32);
}
function hat(t,pan=0,open=false){
  const out=panner(pan); const nz=noise(), f=ctx.createBiquadFilter(), g=ctx.createGain();
  f.type="highpass"; f.frequency.value=7000;
  const dur=open?0.3:0.05;
  g.gain.setValueAtTime(0.5,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  nz.connect(f); f.connect(g); g.connect(out); nz.start(t); nz.stop(t+dur+0.02);
}
function crash(t,pan=0){
  const out=panner(pan); const nz=noise(), f=ctx.createBiquadFilter(), g=ctx.createGain();
  f.type="highpass"; f.frequency.value=4000;
  g.gain.setValueAtTime(0.5,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.9);
  nz.connect(f); f.connect(g); g.connect(out); nz.start(t); nz.stop(t+1.0);
}
function voiceHit(voice,t,pan){
  if(BUFFERS[voice]) return playBuf(voice,t,pan);   // realistic sample if loaded
  switch(voice){                                     // synth fallback
    case "kick": return kick(t,pan);
    case "snare":return snare(t,pan);
    case "tom":  return tom(t,pan);
    case "hat":  return hat(t,pan,false);
    case "ride": return hat(t,pan,true);
    case "crash":return crash(t,pan);
    default: return snare(t,pan);
  }
}
function click(t,accent){
  const out=panner(0); const o=ctx.createOscillator(), g=ctx.createGain();
  o.type="square"; o.frequency.value=accent?1600:1000;
  g.gain.setValueAtTime(accent?0.35:0.22,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.04);
  o.connect(g); g.connect(out); o.start(t); o.stop(t+0.05);
}

/* ---------- State ---------- */
let notesPerBeat = 2;                  // 2 = 8ths (default, wider slow range), 4 = 16ths
let scrollView = false;               // horizontal ribbon (landscape)
let sheetKey=DATA.order[0];
let rows=buildRows(sheetKey);
let selRow=0;
let mode="row";
let bpm=70;
let playing=false;

// scheduler
let curRow=0, curStep=0, nextTime=0, beatCount=0;
let countdown=0;               // remaining count-in clicks
let timer=null;
const AHEAD=0.1, TICK=25;
let visQ=[];                    // {row,step,t}
let rowElByIndex=new Map();     // trueRowIndex -> {pr,cells}  (windowed in Scroll view)
let stride=0;                   // px per phrase along the ribbon (incl. gap)
let vspacer=null;               // sizes the ribbon's scroll extent
let scrollRAF=false;
const SCROLL_GAP=16, WIN_BACK=6, WIN_FWD=18;   // mount window: [center-6, center+18)

/* ---------- Render board ----------
   List view renders every row in flow. Scroll view is VIRTUALIZED: a spacer
   sizes the scroll extent and only a small window of phrases is ever in the DOM
   (so 256 four-bar phrases never build a 100k-px strip that crashes phones).  */
const PLAYHEAD=0.30;    // active figure sits ~30% from the left of the ribbon
function makeRow(i){
  const row=rows[i];
  const pr=document.createElement("div"); pr.className="prow"+(i===selRow?" sel":"");
  const num=document.createElement("div"); num.className="num"; num.textContent=rowLabel(sheetKey,i);
  const cells=document.createElement("div"); cells.className="cells"; const cs=[];
  row.forEach((tok,idx)=>{
    if(idx>0 && idx%4===0){ const g=document.createElement("div"); g.className="cellgap"; cells.appendChild(g); }
    const c=cellNode(tok); cells.appendChild(c); cs.push(c);
  });
  pr.appendChild(num); pr.appendChild(cells);
  pr.addEventListener("click",()=>{ selRow=i; markSel();
    if(scrollView){ ensureMounted(i); scrollToRow(i); } else centerRow(pr);
    if(playing){ curRow=i; curStep=0; } });
  if(scrollView){ pr.style.left=(i*stride)+"px"; pr.style.top="0"; }   // absolutely placed
  return {pr,cells:cs};
}
function renderSheet(){
  rows=buildRows(sheetKey);
  const m=DATA.meta[sheetKey], gen=!!GEN[sheetKey], phrasable=!!baseFigures(sheetKey);
  document.getElementById("sheetName").textContent=m.name;
  document.getElementById("sheetDesc").textContent=m.desc;
  document.getElementById("rowCount").textContent=rows.length+(phrasable&&phraseBars>1?" phrases":" lines");
  document.getElementById("phraseWrap").style.display=phrasable?"flex":"none";   // linear sets phrase too
  document.getElementById("subdivWrap").style.display=gen?"flex":"none";         // 8th/16th: two-symbol drills only
  selRow=Math.max(0,Math.min(selRow,rows.length-1));
  const host=document.getElementById("rows");
  host.classList.toggle("scrollview",scrollView);
  host.classList.toggle("virt",scrollView);
  host.style.height=""; host.scrollLeft=0; host.scrollTop=0;
  host.innerHTML=""; rowElByIndex.clear(); litCell=null; litRow=null; vspacer=null;
  if(scrollView){
    // measure one phrase for stride + height, then set up the virtual window
    const probe=makeRow(selRow); probe.pr.style.position="static"; host.appendChild(probe.pr);
    const rw=probe.pr.offsetWidth, rh=probe.pr.offsetHeight; host.removeChild(probe.pr);
    stride=rw+SCROLL_GAP;
    vspacer=document.createElement("div"); vspacer.className="vspacer";
    vspacer.style.width=(rows.length*stride)+"px"; vspacer.style.height=rh+"px";
    host.appendChild(vspacer);
    host.style.height=(rh+18)+"px";
    ensureMounted(selRow);
    requestAnimationFrame(()=>scrollToRow(selRow));
  } else {
    for(let i=0;i<rows.length;i++){ const e=makeRow(i); host.appendChild(e.pr); rowElByIndex.set(i,e); }
  }
  markSel();
}
function ensureMounted(center){          // keep only [center-WIN_BACK, center+WIN_FWD) mounted
  const host=document.getElementById("rows");
  const start=Math.max(0,center-WIN_BACK), end=Math.min(rows.length,center+WIN_FWD);
  for(const [i,e] of rowElByIndex){ if(i<start||i>=end){ e.pr.remove(); rowElByIndex.delete(i); } }
  for(let i=start;i<end;i++){ if(!rowElByIndex.has(i)){ const e=makeRow(i); host.appendChild(e.pr); rowElByIndex.set(i,e); } }
  markSel();
  if(litRow!=null){ const R=rowElByIndex.get(litRow); if(R){ R.pr.classList.add("playing"); const c=R.cells[litStep]; if(c){ c.classList.add("lit"); litCell=c; } } }
}
function scrollToRow(i){                  // glide row i (its lit cell if any) to the playhead
  const host=document.getElementById("rows"), R=rowElByIndex.get(i); if(!R) return;
  const el=(litRow===i && R.cells[litStep])?R.cells[litStep]:R.pr;
  const cr=host.getBoundingClientRect(), er=el.getBoundingClientRect();
  const target=host.scrollLeft + (er.left-cr.left) - host.clientWidth*PLAYHEAD;
  const near=Math.abs(target-host.scrollLeft) < stride*4;    // jump for big moves, glide for small
  host.scrollTo({left:target, behavior: near?"smooth":"auto"});
}
function centerRow(el){ el.scrollIntoView({block:"center",behavior:"smooth"}); }   // list view
function markSel(){ for(const [i,e] of rowElByIndex) e.pr.classList.toggle("sel", i===selRow); }

function renderSheetList(){
  const host=document.getElementById("sheetList"); host.innerHTML="";
  DATA.order.forEach(k=>{
    const m=DATA.meta[k];
    const b=document.createElement("button"); b.className="sheet"+(k===sheetKey?" active":"");
    const cnt=rowCountFor(k); const unit=(baseFigures(k)&&phraseBars>1)?"phrases":"lines";
    b.innerHTML=`<div class="nm">${m.name}</div><div class="tg">${m.tag} · ${cnt} ${unit}</div>`;
    b.addEventListener("click",()=>{ sheetKey=k; selRow=0; curRow=0; curStep=0;
      document.querySelectorAll(".sheet").forEach(x=>x.classList.remove("active")); b.classList.add("active");
      renderSheet(); });
    host.appendChild(b);
  });
}

/* ---------- Highlight loop ---------- */
let litCell=null, litRow=null, litStep=0;
function animate(){
  if(ctx){
    const now=ctx.currentTime;
    let idx=-1;
    for(let i=0;i<visQ.length;i++){ if(visQ[i].t<=now) idx=i; else break; }
    if(idx>=0){
      const cur=visQ[idx]; visQ.splice(0,idx);
      if(cur.row!==-1) lightStep(cur.row,cur.step);
      if(cur.beat!==undefined) flashBeat(cur.beat);
    }
    if(playing && scrollView) ribbonFollow(now);   // continuous, tempo-accurate scroll
  }
  requestAnimationFrame(animate);
}
// x-position (ribbon content coords) of a hit's cell centre
function cellContentX(row,step){
  const R=rowElByIndex.get(row); if(!R) return null;
  const el=R.cells[step]||R.pr;
  const host=document.getElementById("rows");
  const er=el.getBoundingClientRect(), cr=host.getBoundingClientRect();
  return host.scrollLeft + (er.left-cr.left) + er.width/2;
}
// Slide the ribbon so the playhead tracks the music between hits — synced to the
// audio clock, so it stays correct at ANY bpm (not a fixed-duration animation).
function ribbonFollow(now){
  const cur=visQ[0]; if(!cur || cur.row===-1) return;
  let x=cellContentX(cur.row,cur.step); if(x==null) return;
  const nxt=visQ[1];
  if(nxt && nxt.row!==-1 && nxt.t>cur.t){
    const x2=cellContentX(nxt.row,nxt.step);
    if(x2!=null){ const f=Math.min(1,Math.max(0,(now-cur.t)/(nxt.t-cur.t))); x+=(x2-x)*f; }
  }
  const host=document.getElementById("rows");
  host.scrollLeft = x - host.clientWidth*PLAYHEAD;
}
function lightStep(r,s){
  const rowChanged=(r!==litRow);
  litStep=s;
  if(litCell) litCell.classList.remove("lit");
  if(rowChanged && litRow!=null){ const P=rowElByIndex.get(litRow); if(P) P.pr.classList.remove("playing"); }
  litRow=r;
  if(scrollView) ensureMounted(r);          // make sure the playing row is in the window
  const R=rowElByIndex.get(r);
  if(!R){ litCell=null; return; }
  R.pr.classList.add("playing");
  const cell=R.cells[s]; litCell=cell||null; if(cell) cell.classList.add("lit");
  // ribbon scroll is driven continuously by ribbonFollow(); list play-through centers the line
  if(!scrollView && mode==="all" && rowChanged) R.pr.scrollIntoView({block:"center",behavior:"smooth"});
}
function clearLit(){
  if(litCell) litCell.classList.remove("lit");
  for(const [,e] of rowElByIndex) e.pr.classList.remove("playing");
  litCell=null; litRow=null;
}
const bd=document.getElementById("beatdot");
function flashBeat(on){ bd.classList.toggle("on",!!on); if(on) setTimeout(()=>bd.classList.remove("on"),90); }

/* ---------- Scheduler ---------- */
function currentRows(){ return mode==="row" ? [selRow] : rows.map((_,i)=>i); }
function scheduleStep(){
  const beatDur=60/bpm;
  const row = rows[curRow];
  const steps = row.length;
  // generated drills space hits by the chosen note value (16ths = 4/beat,
  // 8ths = 2/beat = half speed); figure-list drills (linear, paradiddles) read
  // straight — each 4-note figure is one beat (16ths), so multi-bar phrases
  // stay tempo-correct too.
  const perBeat = GEN[sheetKey] ? notesPerBeat : (baseFigures(sheetKey) ? 4 : steps);
  const stepDur = beatDur/perBeat;

  // count-in first
  if(countdown>0){
    click(nextTime, countdown%4===0 || countdown===4);
    visQ.push({row:-1,step:0,t:nextTime,beat:1});
    countdown--; nextTime+=beatDur;
    return;
  }
  const beatStart = (curStep % perBeat)===0;
  // metronome on the downbeat of each beat (each figure)
  if(beatStart && document.getElementById("metro").checked){
    click(nextTime, beatCount%4===0);
  }
  // the hit
  const tok=row[curStep]; const limb=tok.slice(0,2); const voice=VOICE[tok.slice(2)]||"snare";
  voiceHit(voice,nextTime,LIMB[limb].pan);
  visQ.push({row:curRow,step:curStep,t:nextTime, beat: beatStart?1:undefined});

  // advance
  curStep++; nextTime+=stepDur;
  if((curStep % perBeat)===0) beatCount++;   // count each beat/figure
  if(curStep>=steps){
    curStep=0;
    if(mode==="all"){
      curRow++;
      if(curRow>=rows.length){ curRow=0; }
    }
  }
}
function scheduler(){
  while(nextTime < ctx.currentTime + AHEAD){ scheduleStep(); }
}
function start(){
  initAudio();
  if(ctx.state==="suspended") ctx.resume();
  playing=true;
  const pb=document.getElementById("playBtn"); pb.textContent="❚❚ Pause"; pb.classList.add("on");
  curRow = mode==="row" ? selRow : selRow;
  curStep=0; beatCount=0; visQ=[];
  countdown = document.getElementById("countin").checked ? 4 : 0;
  nextTime=ctx.currentTime+0.12;
  timer=setInterval(scheduler,TICK);
}
function pause(){
  playing=false; clearInterval(timer); timer=null;
  const pb=document.getElementById("playBtn"); pb.textContent="▶ Play"; pb.classList.remove("on");
  clearLit();
}
function stop(){ pause(); curRow= mode==="row"?selRow:0; curStep=0; visQ=[]; }

/* ---------- Controls ---------- */
document.getElementById("playBtn").addEventListener("click",()=> playing?pause():start());
document.getElementById("stopBtn").addEventListener("click",stop);
const bpmEl=document.getElementById("bpm"), bpmVal=document.getElementById("bpmVal");
bpmEl.addEventListener("input",()=>{ bpm=+bpmEl.value; bpmVal.textContent=bpm; });
document.getElementById("vol").addEventListener("input",e=>{ if(master) master.gain.value=e.target.value/100; });
document.getElementById("modeSeg").addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b) return;
  mode=b.dataset.mode;
  document.querySelectorAll("#modeSeg button").forEach(x=>x.classList.toggle("on",x===b));
  if(playing){ curRow= mode==="row"?selRow:0; curStep=0; }
});
document.getElementById("phraseSeg").addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b) return;
  phraseBars=+b.dataset.bars;
  document.querySelectorAll("#phraseSeg button").forEach(x=>x.classList.toggle("on",x===b));
  selRow=0; curRow=0; curStep=0;
  renderSheet(); renderSheetList();
});
document.getElementById("subdivSeg").addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b) return;
  notesPerBeat=+b.dataset.npb;
  document.querySelectorAll("#subdivSeg button").forEach(x=>x.classList.toggle("on",x===b));
  if(playing) curStep=0;   // realign to a beat so the click stays in phase
});

/* ---------- List / Scroll (landscape ribbon) ---------- */
let userSetView=false;   // true once the user picks a view manually
function setScrollView(v){
  scrollView=v;
  document.querySelectorAll("#viewSeg button").forEach(b=>b.classList.toggle("on",(b.dataset.view==="scroll")===v));
  renderSheet();         // re-render for the axis change (list flow vs. virtual ribbon)
}
document.getElementById("viewSeg").addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b) return;
  userSetView=true; setScrollView(b.dataset.view==="scroll");
});
// manual swipe/scroll in the ribbon: keep the mounted window around what's on screen
// (during playback the animation loop drives the window, so skip it here)
document.getElementById("rows").addEventListener("scroll",()=>{
  if(!scrollView || playing || scrollRAF) return;
  scrollRAF=true;
  requestAnimationFrame(()=>{ scrollRAF=false;
    const host=document.getElementById("rows");
    ensureMounted(Math.round((host.scrollLeft+host.clientWidth*PLAYHEAD)/stride));
  });
});
// auto-switch to the ribbon on a landscape phone, unless the user chose manually
const mqPhoneLandscape=window.matchMedia("(orientation:landscape) and (max-height:600px)");
function applyAutoView(){ if(!userSetView) setScrollView(mqPhoneLandscape.matches); }
mqPhoneLandscape.addEventListener("change",applyAutoView);

document.addEventListener("keydown",e=>{
  if(e.code==="Space"){ e.preventDefault(); playing?pause():start(); }
  const prev=(e.code==="ArrowUp"||e.code==="ArrowLeft"), next=(e.code==="ArrowDown"||e.code==="ArrowRight");
  if(prev||next){
    e.preventDefault();
    selRow=next?Math.min(rows.length-1,selRow+1):Math.max(0,selRow-1);
    markSel();
    if(scrollView){ ensureMounted(selRow); scrollToRow(selRow); }
    else { const R=rowElByIndex.get(selRow); if(R) centerRow(R.pr); }
    if(playing){ curRow=selRow; curStep=0; }
  }
});

/* ---------- Fit page to the (variable-height) transport ---------- */
function fitTransport(){
  const t=document.querySelector(".transport"), w=document.querySelector(".wrap");
  if(t&&w) w.style.paddingBottom=(t.offsetHeight+16)+"px";
}
window.addEventListener("resize",fitTransport);

/* ---------- Boot ---------- */
renderSheetList();
renderSheet();
const bootHash=location.hash.replace("#","");
if(bootHash==="scroll"){ userSetView=true; setScrollView(true); }        // deep-link to ribbon
else if(bootHash==="selftest"){ runSelfTest(); }                         // headless virtualization check
else if(bootHash==="scrolltest"){ runScrollTest(); }                     // headless tempo-scroll check
else applyAutoView();     // otherwise start in the ribbon only if launched in phone-landscape
fitTransport();
requestAnimationFrame(animate);

// Drive ribbonFollow at a fixed elapsed time for a slow vs. fast tempo: at the same
// wall-clock moment the faster tempo must have scrolled further (proves it's not fixed-rate).
function runScrollTest(){
  userSetView=true; setScrollView(true);
  const host=document.getElementById("rows"), R=5;
  ensureMounted(R); litRow=R; litStep=0;
  function posAt(span,now){ visQ=[{row:R,step:0,t:0},{row:R+1,step:0,t:span}]; ribbonFollow(now); return Math.round(host.scrollLeft); }
  const start=posAt(1.0,0.0), slow=posAt(1.0,0.5), fast=posAt(0.2,0.5);
  const h=document.getElementById("hintbar"); h.style.display="block";
  h.textContent="SCROLLTEST start="+start+" slow@0.5s="+slow+" fast@0.5s="+fast+
    " → "+(fast>=slow&&slow>=start?"PASS (faster scrolls further)":"FAIL");
}
// Simulate lighting rows across the sheet and report the max DOM rows kept mounted.
function runSelfTest(){
  userSetView=true; setScrollView(true);
  let i=0, maxMounted=0;
  const t=setInterval(()=>{
    const len=(rows[i]&&rows[i].length)||8;
    lightStep(i, i%len);
    maxMounted=Math.max(maxMounted, document.querySelectorAll("#rows .prow").length);
    if(++i>90){ clearInterval(t);
      const h=document.getElementById("hintbar"); h.style.display="block";
      h.textContent="SELFTEST rows="+rows.length+" maxMounted="+maxMounted+
        " mountedNow="+document.querySelectorAll("#rows .prow").length;
    }
  },6);
}
