const LIMB = {
  RH:{name:"Right hand", color:"#2f81f7", pan: 0.35, shape:"snare"},
  LH:{name:"Left hand",  color:"#f0524b", pan:-0.35, shape:"snare"},
  RF:{name:"Right foot", color:"#33b158", pan: 0.25, shape:"kick"},
  LF:{name:"Left foot",  color:"#f0883e", pan:-0.25, shape:"kick"}
};
// token voice code -> voice name (name matches shapeSVG cases + .cell.v-<name> CSS).
// Base drills use only s/k; the rest are reachable via the Drum Key re-voicing page.
const VOICE = {
  s:"snare", k:"kick",
  lt:"lefttom", rt:"righttom", ft:"floortom",
  ch:"closedhat", oh:"openhat", rd:"ride",
  lc:"leftcrash", rc:"rightcrash",
  g:"ghost", x:"rest"
};

/* ---------- SVG shapes (match PDFs/drumkey.pdf) ----------
   Full kit: snare ● kick ■ left tom ◉ right tom ◎ floor tom ○ closed hat ◆ open hat ◇
   ride ⬟ left crash ▼ right crash ▲ ghost · rest (blank). Color = limb, shape = voice. */
function shapeSVG(voice,color){
  const c=color;
  switch(voice){
    case "snare":     return `<circle cx="16" cy="16" r="12" fill="${c}"/>`;
    case "kick":      return `<rect x="4" y="4" width="24" height="24" rx="2" fill="${c}"/>`;
    case "lefttom":   return `<path fill-rule="evenodd" fill="${c}" d="M4 16a12 12 0 1 0 24 0a12 12 0 1 0-24 0ZM12 16a4 4 0 1 0 8 0a4 4 0 1 0-8 0Z"/>`;
    case "righttom":  return `<circle cx="16" cy="16" r="11" fill="none" stroke="${c}" stroke-width="5"/>`;
    case "floortom":  return `<circle cx="16" cy="16" r="12" fill="none" stroke="${c}" stroke-width="2"/>`;
    case "closedhat":
    case "hat":       return `<path d="M16 3 L29 16 L16 29 L3 16 Z" fill="${c}"/>`;
    case "openhat":   return `<path d="M16 3 L29 16 L16 29 L3 16 Z" fill="none" stroke="${c}" stroke-width="2.5"/>`;
    case "ride":      return `<path d="M16 3 L28 12 L23 27 L9 27 L4 12 Z" fill="${c}"/>`;
    case "leftcrash": return `<path d="M4 5 L28 5 L16 28 Z" fill="${c}"/>`;
    case "rightcrash":
    case "crash":     return `<path d="M16 4 L28 27 L4 27 Z" fill="${c}"/>`;
    case "tom":       return `<circle cx="16" cy="16" r="12" fill="none" stroke="${c}" stroke-width="4"/>`;
    case "ghost":     return `<circle cx="16" cy="16" r="4" fill="${c}"/>`;
    case "rest":      return ``;   // blank — holds its slot, no shape
    default:          return `<circle cx="16" cy="16" r="11" fill="${c}"/>`;
  }
}
// The full instrument key (voice code, label) — shown in the Key panel.
const INSTRUMENTS=[
  ["snare","Snare"],["kick","Kick"],
  ["lefttom","Left tom"],["righttom","Right tom"],["floortom","Floor tom"],
  ["closedhat","Closed hi-hat"],["openhat","Open hi-hat"],["ride","Ride"],
  ["leftcrash","Left crash"],["rightcrash","Right crash"],
  ["ghost","Ghost note"],["rest","Rest (blank)"],
];
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
  INSTRUMENTS.forEach(([v,label])=>{
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
function playBuf(voice,t,pan,mult=1,rate=1){
  const src=ctx.createBufferSource(); src.buffer=BUFFERS[voice];
  if(rate!==1) src.playbackRate.value=rate;              // pitch the tom sample per drum
  const g=ctx.createGain(); g.gain.value=(VLEVEL[voice]||0.85)*(0.9+Math.random()*0.12)*mult;
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
function snare(t,pan=0,gain=1){
  const out=panner(pan);
  const nz=noise(), nf=ctx.createBiquadFilter(), ng=ctx.createGain();
  nf.type="highpass"; nf.frequency.value=1400;
  ng.gain.setValueAtTime(0.85*gain,t); ng.gain.exponentialRampToValueAtTime(0.001,t+0.19);
  nz.connect(nf); nf.connect(ng); ng.connect(out); nz.start(t); nz.stop(t+0.2);
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.type="triangle"; o.frequency.setValueAtTime(190,t); o.frequency.exponentialRampToValueAtTime(120,t+0.1);
  g.gain.setValueAtTime(0.5*gain,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.14);
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
function ride(t,pan=0){                               // metallic ping (synth fallback for ride)
  const out=panner(pan);
  [[3000,0.10],[4700,0.07]].forEach(([f,g])=>{
    const o=ctx.createOscillator(), gn=ctx.createGain();
    o.type="square"; o.frequency.value=f;
    gn.gain.setValueAtTime(g,t); gn.gain.exponentialRampToValueAtTime(0.001,t+0.5);
    o.connect(gn); gn.connect(out); o.start(t); o.stop(t+0.52);
  });
  const nz=noise(), f=ctx.createBiquadFilter(), g=ctx.createGain();
  f.type="highpass"; f.frequency.value=6000;
  g.gain.setValueAtTime(0.10,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.35);
  nz.connect(f); f.connect(g); g.connect(out); nz.start(t); nz.stop(t+0.37);
}
// play sample `name` (pitched/scaled) if decoded, else a synth fallback
function smpl(name,t,pan,mult=1,rate=1){
  if(BUFFERS[name]) return playBuf(name,t,pan,mult,rate);
  switch(name){
    case "kick": return kick(t,pan);
    case "snare":return snare(t,pan,mult);
    case "tom":  return tom(t,pan,180*rate);
    case "hat":  return hat(t,pan,false);
    case "ride": return ride(t,pan);
    case "crash":return crash(t,pan);
    default:     return snare(t,pan,mult);
  }
}
// map a voice name to a real kit sound. 3 toms = the tom sample pitched; 2 crashes = the
// crash sample (pan comes from the limb); ghost = a soft snare; open hat = synth sustain.
function voiceHit(voice,t,pan){
  if(voice==="rest") return;                          // silence, holds the slot
  switch(voice){
    case "snare":      return smpl("snare",t,pan);
    case "kick":       return smpl("kick",t,pan);
    case "ghost":      return smpl("snare",t,pan,0.25);   // soft ghost tap (quieter than a normal snare)
    case "lefttom":    return smpl("tom",t,pan,1,1.25);
    case "righttom":   return smpl("tom",t,pan,1,1.0);
    case "floortom":   return smpl("tom",t,pan,1,0.78);
    case "closedhat":  return smpl("hat",t,pan);
    case "openhat":    return hat(t,pan,true);
    case "ride":       return smpl("ride",t,pan);
    case "leftcrash":  return smpl("crash",t,pan);
    case "rightcrash": return smpl("crash",t,pan);
    default:           return smpl("snare",t,pan);
  }
}
function click(t,accent){
  const out=panner(0); const o=ctx.createOscillator(), g=ctx.createGain();
  o.type="square"; o.frequency.value=accent?1600:1000;
  g.gain.setValueAtTime(accent?0.55:0.38,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.04);
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
let favView=false;                              // showing the Favorites folder
let isolate=false, isoLabel="", isoBack=null;   // Scroll "focus one exercise" mode
const ISO_COPIES=2000;                          // repeats of the focused exercise (endless conveyor)

/* ---------- Favorites (on-device; heart-tap) ----------
   localStorage {v:1, items:[{sheet,bars,label,name,tokens}]}. Stable identity =
   sheet|bars|label; tokens are kept so the folder renders without rebuilding a sheet.
   Structured to migrate to a synced account store later (bump v, add an id/owner). */
const FAV_KEY="drumsdr.favorites.v1";
let favs=loadFavs();
function loadFavs(){ try{ const j=JSON.parse(localStorage.getItem(FAV_KEY)); return (j&&Array.isArray(j.items))?j.items:[]; }catch(e){ return []; } }
function saveFavs(){ try{ localStorage.setItem(FAV_KEY, JSON.stringify({v:1,items:favs})); }catch(e){} }
function favKey(sheet,bars,label){ return sheet+"|"+bars+"|"+label; }
function favIndex(sheet,bars,label){ const k=favKey(sheet,bars,label); return favs.findIndex(f=>favKey(f.sheet,f.bars,f.label)===k); }
function isFav(sheet,bars,label){ return favIndex(sheet,bars,label)>=0; }
function toggleFav(sheet,bars,label,name,tokens){
  const i=favIndex(sheet,bars,label);
  if(i>=0) favs.splice(i,1); else favs.push({sheet,bars,label,name,tokens:tokens.slice()});
  saveFavs(); updateFavCount();
  return i<0;                                   // true = now a favorite
}
function updateFavCount(){
  const b=document.getElementById("favSheetBtn"); if(!b) return;
  const tg=b.querySelector(".tg"); if(tg) tg.textContent="Saved · "+favs.length+(favs.length===1?" line":" lines");
}

/* ---------- Voicing / Drum Key (re-voice a drill's symbols) ----------
   voicing[sheetKey] = { baseToken: effectiveToken }. Absent = identity. Persisted so a
   configured kit survives a reload. Instrument rules (the drummer's matrix):
   kick = feet only · snare/toms/ride/crashes = hands only · hi-hats = any · ghost = hands+snare. */
const VOICING_KEY="drumsdr.voicing.v1";
let voicing=loadVoicing();
let kitView=false;
function loadVoicing(){ try{ const j=JSON.parse(localStorage.getItem(VOICING_KEY)); return (j&&j.map)?j.map:{}; }catch(e){ return {}; } }
function saveVoicing(){ try{ localStorage.setItem(VOICING_KEY, JSON.stringify({v:1,map:voicing})); }catch(e){} }
function revoice(token){ const m=voicing[sheetKey]; return (m&&m[token])||token; }   // effective token
function isHand(limb){ return limb==="RH"||limb==="LH"; }
const HAND_VOICES=[["s","Snare"],["lt","Left tom"],["rt","Right tom"],["ft","Floor tom"],["rd","Ride"],["lc","Left crash"],["rc","Right crash"],["ch","Closed hi-hat"],["oh","Open hi-hat"],["g","Ghost"],["x","Rest"]];
const FOOT_VOICES=[["k","Kick"],["ch","Closed hi-hat"],["oh","Open hi-hat"],["x","Rest"]];
function allowedVoices(limb){ return isHand(limb)?HAND_VOICES:FOOT_VOICES; }
function distinctSymbols(key){                  // the base tokens a sheet uses, first-seen order
  const figs=baseFigures(key); if(!figs) return [];
  const seen=new Set(), out=[];
  figs.forEach(f=>f.forEach(t=>{ if(!seen.has(t)){ seen.add(t); out.push(t); } }));
  return out;
}

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
  const num=document.createElement("div"); num.className="num"; num.textContent=isolate?isoLabel:rowLabel(sheetKey,i);
  const cells=document.createElement("div"); cells.className="cells"; const cs=[];
  row.forEach((tok,idx)=>{
    if(idx>0 && idx%4===0){ const g=document.createElement("div"); g.className="cellgap"; cells.appendChild(g); }
    const c=cellNode(revoice(tok)); cells.appendChild(c); cs.push(c);   // apply the sheet's voicing
  });
  pr.appendChild(num); pr.appendChild(cells);
  if(!scrollView && !isolate) pr.appendChild(favBtn(i));   // heart on list rows
  pr.addEventListener("click",()=>{
    if(isolate) return;                                    // copies aren't individually selectable
    if(scrollView){ enterIsolate(i); return; }             // tap a ribbon exercise → focus it
    selRow=i; markSel(); centerRow(pr);
    if(playing){ curRow=i; curStep=0; }
  });
  if(scrollView){ pr.style.left=(i*stride)+"px"; pr.style.top="0"; }   // absolutely placed
  return {pr,cells:cs};
}
function favBtn(i){
  const label=rowLabel(sheetKey,i), on=isFav(sheetKey,phraseBars,label);
  const b=document.createElement("button"); b.className="favbtn"+(on?" on":""); b.type="button";
  b.textContent=on?"♥":"♡"; b.title=on?"Remove from favorites":"Save to favorites";
  b.addEventListener("click",ev=>{
    ev.stopPropagation();
    const now=toggleFav(sheetKey,phraseBars,label,DATA.meta[sheetKey].name,rows[i]);
    b.classList.toggle("on",now); b.textContent=now?"♥":"♡";
    b.title=now?"Remove from favorites":"Save to favorites";
  });
  return b;
}
function renderSheet(){
  if(favView){ renderFavorites(); return; }
  if(kitView){ renderKit(); return; }
  if(!isolate) rows=buildRows(sheetKey);         // isolate keeps its own copies array
  const m=DATA.meta[sheetKey], gen=!!GEN[sheetKey], phrasable=!!baseFigures(sheetKey);
  document.getElementById("sheetName").textContent=isolate?("Focus · "+isoLabel):m.name;
  document.getElementById("sheetDesc").textContent=isolate?(m.name+" — one exercise, endlessly repeating. Tap ✕ Exit focus to go back."):m.desc;
  document.getElementById("rowCount").textContent=isolate?"focus":(rows.length+(phrasable&&phraseBars>1?" phrases":" lines"));
  document.getElementById("phraseWrap").style.display=(!isolate&&phrasable)?"flex":"none";   // linear sets phrase too
  document.getElementById("subdivWrap").style.display=(!isolate&&gen)?"flex":"none";         // 8th/16th: two-symbol drills only
  const vw=document.getElementById("viewWrap"); if(vw) vw.style.display=isolate?"none":"flex";
  const ie=document.getElementById("isoExit"); if(ie) ie.style.display=isolate?"inline-flex":"none";
  const kb=document.getElementById("kitBtn"); if(kb){ kb.style.display=isolate?"none":"inline-flex"; kb.textContent="🥁 Drum Key"; kb.classList.toggle("on", !!voicing[sheetKey]); }
  selRow=Math.max(0,Math.min(selRow,rows.length-1));
  const host=document.getElementById("rows");
  host.classList.toggle("scrollview",scrollView);
  host.classList.toggle("virt",scrollView);
  host.style.height=""; host.scrollLeft=0; host.scrollTop=0;
  host.style.removeProperty("--cell");   // scroll probe measures at default size; fitCells resets it below
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
  fitCells();
}
/* Shrink the shapes in List view so a whole phrase (esp. 4 bars = 16 cells) fits on one
   line — on a phone and on a laptop. Scroll view keeps the default size (it scrolls).
   `chrome` = the row's non-cell width (number col, gaps, padding, heart button). */
function cellSizeFor(n, chrome){
  const host=document.getElementById("rows");
  const barGaps=Math.max(0,Math.ceil(n/4)-1);          // dashed barline between figures
  const w=host.clientWidth||document.documentElement.clientWidth||360;
  const avail=Math.max(80,(w-(chrome||136))*0.98);
  const items=n+barGaps;                               // cells + barlines are all flex children
  const denom=n + (items-1)*0.29 + barGaps*0.36;       // flex gap between items + barline margins
  return Math.max(9,Math.min(34,(avail-barGaps*2)/denom));
}
function fitCells(){
  const host=document.getElementById("rows");
  if(favView){ return; }                 // the folder sizes its own cells in renderFavorites
  if(scrollView){ host.style.removeProperty("--cell"); return; }
  const n=(rows[0]&&rows[0].length)||4;
  host.style.setProperty("--cell", cellSizeFor(n,136).toFixed(2)+"px");   // 136 leaves room for the heart
}
/* ---------- Favorites folder ---------- */
function renderFavorites(){
  document.getElementById("sheetName").textContent="★ Favorites";
  document.getElementById("sheetDesc").textContent=favs.length
    ? "Your saved lines (this device). Tap one to open it in its drill."
    : "";
  document.getElementById("rowCount").textContent=favs.length+(favs.length===1?" line":" lines");
  document.getElementById("phraseWrap").style.display="none";
  document.getElementById("subdivWrap").style.display="none";
  const vw=document.getElementById("viewWrap"); if(vw) vw.style.display="none";
  const ie=document.getElementById("isoExit"); if(ie) ie.style.display="none";
  const kb=document.getElementById("kitBtn"); if(kb) kb.style.display="none";
  const host=document.getElementById("rows");
  host.classList.remove("scrollview","virt");
  host.style.height=""; host.scrollLeft=0; host.scrollTop=0; host.style.removeProperty("--cell");
  host.innerHTML=""; rowElByIndex.clear(); litCell=null; litRow=null; vspacer=null;
  if(!favs.length){
    const e=document.createElement("div"); e.className="emptyfav";
    e.textContent="No favorites yet — tap the ♥ on any line to save it here.";
    host.appendChild(e); return;
  }
  const maxN=favs.reduce((m,f)=>Math.max(m,f.tokens.length),4);
  const setFavCell=()=>host.style.setProperty("--cell", cellSizeFor(maxN,172).toFixed(2)+"px");   // 172: wider label column
  setFavCell(); requestAnimationFrame(()=>{ if(favView) setFavCell(); });   // re-measure after layout settles
  favs.forEach(f=>{
    const pr=document.createElement("div"); pr.className="prow favrow";
    const num=document.createElement("div"); num.className="num";
    num.innerHTML=`<div class="favlbl">${f.label}</div><div class="favsrc">${f.name} · ${f.bars} bar</div>`;
    const cells=document.createElement("div"); cells.className="cells";
    f.tokens.forEach((tok,idx)=>{
      if(idx>0 && idx%4===0){ const g=document.createElement("div"); g.className="cellgap"; cells.appendChild(g); }
      cells.appendChild(cellNode(tok));
    });
    const hb=document.createElement("button"); hb.className="favbtn on"; hb.type="button";
    hb.textContent="♥"; hb.title="Remove from favorites";
    hb.addEventListener("click",ev=>{ ev.stopPropagation(); toggleFav(f.sheet,f.bars,f.label,f.name,f.tokens); renderFavorites(); });
    pr.appendChild(num); pr.appendChild(cells); pr.appendChild(hb);
    pr.addEventListener("click",()=>openFavoriteTarget(f));
    host.appendChild(pr);
  });
}
function openFavorites(){
  if(playing) stop();
  favView=true; isolate=false;
  renderSheetList();               // single source of truth for the active highlight
  renderSheet();
}
function openFavoriteTarget(f){                 // jump from the folder to the real exercise
  if(playing) stop();
  favView=false; isolate=false;
  sheetKey=f.sheet; phraseBars=f.bars;
  document.querySelectorAll("#phraseSeg button").forEach(x=>x.classList.toggle("on",+x.dataset.bars===phraseBars));
  const built=buildRows(sheetKey); let idx=0;
  for(let i=0;i<built.length;i++){ if(rowLabel(sheetKey,i)===f.label){ idx=i; break; } }
  selRow=idx; curRow=idx; curStep=0;
  renderSheetList(); renderSheet();
  if(scrollView){ ensureMounted(selRow); scrollToRow(selRow); }
  else { const R=rowElByIndex.get(selRow); if(R) centerRow(R.pr); }
}
/* ---------- Scroll focus: one exercise, endlessly repeating ---------- */
function enterIsolate(i){
  isoLabel=rowLabel(sheetKey,i);
  const tokens=rows[i].slice();
  isoBack={ selRow:i, mode };
  isolate=true; mode="all";                     // stream through the copies = continuous conveyor
  document.querySelectorAll("#modeSeg button").forEach(x=>x.classList.toggle("on",x.dataset.mode==="all"));
  rows=Array.from({length:ISO_COPIES},()=>tokens);
  selRow=0; curRow=0; curStep=0; scrollView=true;
  renderSheet();
  if(!playing) start(); else { curRow=0; curStep=0; }
}
function exitIsolate(){
  const back=isoBack||{selRow:0,mode:"row"};
  if(playing) pause();
  isolate=false; mode=back.mode;
  document.querySelectorAll("#modeSeg button").forEach(x=>x.classList.toggle("on",x.dataset.mode===mode));
  rows=buildRows(sheetKey);
  selRow=Math.min(back.selRow, rows.length-1); curRow=selRow; curStep=0;
  renderSheet();
}

/* ---------- Drum Key page: re-voice the current drill ---------- */
let kitModal=[];   // array of base-tokens being edited (can select multiple)
function openKit(){ kitView=true; kitModal=[]; if(!voicing[sheetKey]) voicing[sheetKey]={}; renderSheet(); }
function closeKit(){ kitView=false; kitModal=[]; renderSheet(); }
function setEff(bt,token){               // set/clear a symbol's effective (limb+voice)
  if(!voicing[sheetKey]) voicing[sheetKey]={};
  if(token===bt) delete voicing[sheetKey][bt]; else voicing[sheetKey][bt]=token;
  if(voicing[sheetKey] && !Object.keys(voicing[sheetKey]).length) delete voicing[sheetKey];
  saveVoicing();
}
function setKitLimb(bt,limb){
  let vcode=revoice(bt).slice(2);
  if(!allowedVoices(limb).some(v=>v[0]===vcode)) vcode=isHand(limb)?"s":"k";   // keep the pair legal
  setEff(bt, limb+vcode); renderKit();
}
function setKitVoice(bt,code){ setEff(bt, revoice(bt).slice(0,2)+code); renderKit(); }
// Apply changes to all selected drums
function setAllKitLimbs(limb){
  kitModal.forEach(bt => {
    let vcode=revoice(bt).slice(2);
    if(!allowedVoices(limb).some(v=>v[0]===vcode)) vcode=isHand(limb)?"s":"k";
    setEff(bt, limb+vcode);
  });
  renderKit();
}
function setAllKitVoices(code){
  kitModal.forEach(bt => setEff(bt, revoice(bt).slice(0,2)+code));
  renderKit();
}
function kitCard(){
  const card=document.createElement("div"); card.className="kitcard";
  const isThreeLimbRF = sheetKey === "RHLHRF";
  const isThreeLimbLF = sheetKey === "RHLHLF";
  const isFourLimb = sheetKey === "RHLHRFLF";
  const isThreeOrFourLimb = isThreeLimbRF || isThreeLimbLF || isFourLimb;

  // Show summary of selected drums with their current colors/shapes
  const head=document.createElement("div"); head.className="kithead";
  if(sheetKey === "rightleftsnare1.1"){
    // For Right/Left Snare, show current state
    const lhEff=revoice("LHs"), rhEff=revoice("RHs");
    const lhColor=LIMB[lhEff.slice(0,2)].color, rhColor=LIMB[rhEff.slice(0,2)].color;
    if(lhColor === rhColor){
      // Both same color
      head.innerHTML=`<span class="kitnow">Currently: all snares ${lhColor === LIMB.RH.color ? "blue" : "red"}</span>`;
    } else {
      // Half and half
      head.innerHTML=`<span class="kitnow">Currently: half blue / half red</span>`;
    }
  } else if(sheetKey === "RLkick"){
    // For Right/Left Kick, show current state
    const lfEff=revoice("LFk"), rfEff=revoice("RFk");
    const lfColor=LIMB[lfEff.slice(0,2)].color, rfColor=LIMB[rfEff.slice(0,2)].color;
    if(lfColor === rfColor){
      // Both same color
      head.innerHTML=`<span class="kitnow">Currently: all kicks ${lfColor === LIMB.RF.color ? "green" : "orange"}</span>`;
    } else {
      // Half and half
      head.innerHTML=`<span class="kitnow">Currently: half orange / half green</span>`;
    }
  } else {
    const count = kitModal.length;
    const bs=distinctSymbols(sheetKey);
    if(count === 1){
      const bt = kitModal[0];
      const eff=revoice(bt), limb=eff.slice(0,2), vcode=eff.slice(2);
      const voiceName = VOICE[vcode]||"snare";
      const isInBaseDrill = bs.includes(bt);
      if(isInBaseDrill){
        head.innerHTML=`<span class="kitorig">${LIMB[bt.slice(0,2)].name} · ${VOICE[bt.slice(2)]}</span>`+
                       `<span class="kitarrow">→</span>`+
                       `<svg viewBox="0 0 32 32" width="20" height="20" style="vertical-align:middle">${shapeSVG(voiceName, LIMB[limb].color)}</svg>`+
                       `<span class="kitnow">${LIMB[limb].name} · ${voiceName}</span>`;
      } else {
        head.innerHTML=`<svg viewBox="0 0 32 32" width="20" height="20" style="vertical-align:middle">${shapeSVG(voiceName, LIMB[limb].color)}</svg>`+
                       `<span class="kitnow">${LIMB[limb].name} · ${voiceName}</span>`;
      }
    } else if(count === 2) {
      const drums = kitModal.map(bt => {
        const eff=revoice(bt), limb=eff.slice(0,2), vcode=eff.slice(2);
        const voiceName = VOICE[vcode]||"snare";
        return {limb, voiceName, color: LIMB[limb].color};
      });
      head.innerHTML=`<span class="kitnow">Selected:</span>`+
        drums.map(d => `<svg viewBox="0 0 32 32" width="20" height="20" style="vertical-align:middle">${shapeSVG(d.voiceName, d.color)}</svg>`).join(' ');
    } else {
      head.innerHTML=`<span class="kitnow">${count} drums selected</span>`;
    }
  }
  card.appendChild(head);

  // For three-limb and four-limb exercises, show the appropriate number of colors
  // For other exercises, restrict based on instrument rules
  let allowedLimbs = [];

  if(isThreeLimbRF){
    // Three-limb with right foot: show blue, red, green (RH, LH, RF)
    allowedLimbs = ["RH", "LH", "RF"];
  } else if(isThreeLimbLF){
    // Three-limb with left foot: show blue, red, orange (RH, LH, LF)
    allowedLimbs = ["RH", "LH", "LF"];
  } else if(isFourLimb){
    // Four-limb: show all four colors
    allowedLimbs = ["RH", "LH", "RF", "LF"];
  } else if(sheetKey === "rightleftsnare1.1"){
    // Right/Left -- Snare: show only RH (blue) and LH (red) for snare shapes
    // For kick/hat, show RF (green) and LF (orange)
    const allSnare = kitModal.every(bt => {
      const originalVoice = VOICE[bt.slice(2)];
      return originalVoice === "snare" || originalVoice === "ghost" || originalVoice === "rest";
    });
    const allKickOrHat = kitModal.every(bt => {
      const originalVoice = VOICE[bt.slice(2)];
      return originalVoice === "kick" || originalVoice === "closedhat" || originalVoice === "openhat";
    });

    if(allSnare){
      allowedLimbs = ["RH", "LH"];  // blue and red only for snare
    } else if(allKickOrHat){
      allowedLimbs = ["RF", "LF"];  // green and orange for kick/hat
    } else {
      // Mixed selection
      allowedLimbs = ["RH", "LH", "RF", "LF"];
    }
  } else {
    // Other drills: apply instrument rules
    const allKickOrHat = kitModal.every(bt => {
      const originalVoice = VOICE[bt.slice(2)];
      return originalVoice === "kick" || originalVoice === "closedhat" || originalVoice === "openhat";
    });
    const allOther = kitModal.every(bt => {
      const originalVoice = VOICE[bt.slice(2)];
      return !(originalVoice === "kick" || originalVoice === "closedhat" || originalVoice === "openhat");
    });

    if(allKickOrHat){
      allowedLimbs = ["RF", "LF"];  // green and orange
    } else if(allOther){
      allowedLimbs = ["RH", "LH"];  // red and blue
    } else {
      // Mixed selection - show all colors
      allowedLimbs = ["RH", "LH", "RF", "LF"];
    }
  }

  // Add instrument selection
  const symbols=document.createElement("div"); symbols.className="kitvoices";

  // For three/four-limb drills with selection, show full instrument list
  if(isThreeOrFourLimb && kitModal.length > 0){
    // Get allowed voices for selected drum(s)
    let voices = [];
    if(kitModal.length === 1){
      const limb = revoice(kitModal[0]).slice(0,2);
      voices = allowedVoices(limb);
    } else {
      // Multiple selection: show all instruments
      voices = [...HAND_VOICES];
    }

    voices.forEach(([v,label])=>{
      const b=document.createElement("button"); b.type="button"; b.className="voicebtn";
      const voiceName = VOICE[v] || "snare";
      b.innerHTML=`<svg viewBox="0 0 32 32" width="24" height="24">${shapeSVG(voiceName, "#9fb0c3")}</svg>`;
      b.addEventListener("click",()=>setAllKitVoices(v));
      symbols.appendChild(b);
    });
  } else if(sheetKey === "RLkick" && kitModal.length > 0) {
    // Right/Left -- Kick: simple buttons for all kicks to be one color
    const kickGreenBtn=document.createElement("button"); kickGreenBtn.type="button"; kickGreenBtn.className="voicebtn";
    kickGreenBtn.innerHTML=`<svg viewBox="0 0 32 32" width="24" height="24">${shapeSVG("kick", LIMB["RF"].color)}</svg>`;
    kickGreenBtn.addEventListener("click",()=>{
      if(!voicing[sheetKey]) voicing[sheetKey]={};
      voicing[sheetKey]["LFk"]="RFk";
      delete voicing[sheetKey]["RFk"];
      saveVoicing();
      kitModal=[];
      renderKit();
      renderSheet();
    });
    symbols.appendChild(kickGreenBtn);

    const kickOrangeBtn=document.createElement("button"); kickOrangeBtn.type="button"; kickOrangeBtn.className="voicebtn";
    kickOrangeBtn.innerHTML=`<svg viewBox="0 0 32 32" width="24" height="24">${shapeSVG("kick", LIMB["LF"].color)}</svg>`;
    kickOrangeBtn.addEventListener("click",()=>{
      if(!voicing[sheetKey]) voicing[sheetKey]={};
      voicing[sheetKey]["RFk"]="LFk";
      delete voicing[sheetKey]["LFk"];
      saveVoicing();
      kitModal=[];
      renderKit();
      renderSheet();
    });
    symbols.appendChild(kickOrangeBtn);
  } else if(sheetKey === "rightleftsnare1.1" && kitModal.length > 0) {
    // Right/Left -- Snare: show color swatches based on selection
    const allSnare = kitModal.every(bt => {
      const originalVoice = VOICE[bt.slice(2)];
      return originalVoice === "snare" || originalVoice === "ghost" || originalVoice === "rest";
    });
    const allKickOrHat = kitModal.every(bt => {
      const originalVoice = VOICE[bt.slice(2)];
      return originalVoice === "kick" || originalVoice === "closedhat" || originalVoice === "openhat";
    });

    // Show color swatches
    const colors=document.createElement("div"); colors.className="kitcolors";
    if(allSnare){
      // Show blue and red only
      ["RH", "LH"].forEach(l=>{
        const b=document.createElement("button"); b.type="button"; b.className="swatch";
        b.style.background=LIMB[l].color; b.title=LIMB[l].name;
        b.addEventListener("click",()=>setAllKitLimbs(l));
        colors.appendChild(b);
      });
    } else if(allKickOrHat){
      // Show green and orange only
      ["RF", "LF"].forEach(l=>{
        const b=document.createElement("button"); b.type="button"; b.className="swatch";
        b.style.background=LIMB[l].color; b.title=LIMB[l].name;
        b.addEventListener("click",()=>setAllKitLimbs(l));
        colors.appendChild(b);
      });
    } else {
      // Mixed selection - show all colors
      ["RH", "LH", "RF", "LF"].forEach(l=>{
        const b=document.createElement("button"); b.type="button"; b.className="swatch";
        b.style.background=LIMB[l].color; b.title=LIMB[l].name;
        b.addEventListener("click",()=>setAllKitLimbs(l));
        colors.appendChild(b);
      });
    }
    card.appendChild(colors);
  } else if(kitModal.length > 0) {
    // Other drills: show color swatches and basic instruments
    if(!isThreeOrFourLimb){
      const colors=document.createElement("div"); colors.className="kitcolors";
      allowedLimbs.forEach(l=>{
        const b=document.createElement("button"); b.type="button"; b.className="swatch";
        b.style.background=LIMB[l].color; b.title=LIMB[l].name;
        b.addEventListener("click",()=>setAllKitLimbs(l));
        colors.appendChild(b);
      });
      card.appendChild(colors);
    }

    // Show ghost and rest only
    const specialVoices = [["g","Ghost note"],["x","Rest"]];
    specialVoices.forEach(([v,label])=>{
      const b=document.createElement("button"); b.type="button"; b.className="voicebtn";
      b.innerHTML=`<svg viewBox="0 0 32 32" width="24" height="24">${shapeSVG(VOICE[v]||"snare", "#9fb0c3")}</svg>`;
      b.addEventListener("click",()=>setAllKitVoices(v));
      symbols.appendChild(b);
    });
  }

  if(kitModal.length > 0){
    card.appendChild(symbols);

    // Add reset button to revert selected drum(s) to default
    const resetBtn=document.createElement("button");
    resetBtn.type="button";
    resetBtn.className="voicebtn resetbtn";
    resetBtn.innerHTML=`↺`;
    resetBtn.addEventListener("click",()=>{
      kitModal.forEach(bt => {
        if(!voicing[sheetKey]) return;
        delete voicing[sheetKey][bt];
        if(Object.keys(voicing[sheetKey]).length === 0) delete voicing[sheetKey];
      });
      saveVoicing();
      kitModal=[];
      renderKit();
    });
    symbols.appendChild(resetBtn);
  }

  return card;
}
// Bird's-eye drum kit mapping: instrument voice code -> {cx, cy, r} (center x/y, radius)
const DRUM_POSITIONS={
  snare:      {cx:200,cy:200,r:30},
  lefttom:    {cx:150,cy:130,r:24},
  righttom:   {cx:250,cy:130,r:24},
  floortom:   {cx:280,cy:220,r:26},
  kick:       {cx:200,cy:270,r:34},
  closedhat:  {cx:120,cy:200,r:18},
  openhat:    {cx:120,cy:200,r:18},
  ride:       {cx:310,cy:150,r:22},
  leftcrash:  {cx:100,cy:90,r:20},
  rightcrash: {cx:300,cy:90,r:20},
  ghost:      {cx:200,cy:200,r:30},   // same as snare
  rest:       {cx:200,cy:200,r:30},   // same as snare
};
function limbsForVoice(v){
  const bs=distinctSymbols(sheetKey);
  const limbs=[];

  // For Right/Left Snare drill, show colors on instruments that are used in the drill or have been re-voiced
  if(sheetKey === "rightleftsnare1.1"){
    // Check if this voice is in the base drill or has a voicing assigned
    const hasVoicing = voicing[sheetKey] && Object.values(voicing[sheetKey]).some(tok => {
      const effVoice = VOICE[tok.slice(2)] || "snare";
      return effVoice === v || (v === "closedhat" && effVoice === "openhat") || (v === "snare" && (effVoice === "ghost" || effVoice === "rest"));
    });

    if(v === "snare" || hasVoicing){
      // For snare or any re-voiced instrument, show the current limbs
      bs.forEach(bt=>{
        const eff=revoice(bt); const effVoice=VOICE[eff.slice(2)]||"snare";
        if(effVoice===v || (v==="closedhat"&&effVoice==="openhat") || (v==="snare"&&(effVoice==="ghost"||effVoice==="rest"))){
          const lm=eff.slice(0,2); if(!limbs.includes(lm)) limbs.push(lm);
        }
      });
    }
    return limbs;
  }

  // For Right/Left Kick drill, only the kick can have colors; all other instruments are empty
  if(sheetKey === "RLkick"){
    if(v === "kick"){
      const lfEff=revoice("LFk"), rfEff=revoice("RFk");
      const lfLimb=lfEff.slice(0,2), rfLimb=rfEff.slice(0,2);
      if(!limbs.includes(lfLimb)) limbs.push(lfLimb);
      if(!limbs.includes(rfLimb)) limbs.push(rfLimb);
    }
    // For all other voices, return empty array
    return limbs;
  }

  // Other drills: use the original logic
  bs.forEach(bt=>{
    const eff=revoice(bt); const effVoice=VOICE[eff.slice(2)]||"snare";
    if(effVoice===v || (v==="closedhat"&&effVoice==="openhat") || (v==="snare"&&(effVoice==="ghost"||effVoice==="rest"))){
      const lm=eff.slice(0,2); if(!limbs.includes(lm)) limbs.push(lm);
    }
  });
  // Also check for synthetic tokens in the voicing map that map to this voice
  if(voicing[sheetKey]){
    Object.values(voicing[sheetKey]).forEach(tok=>{
      const effVoice=VOICE[tok.slice(2)]||"snare";
      if(effVoice===v || (v==="closedhat"&&effVoice==="openhat") || (v==="snare"&&(effVoice==="ghost"||effVoice==="rest"))){
        const lm=tok.slice(0,2); if(!limbs.includes(lm)) limbs.push(lm);
      }
    });
  }
  return limbs;
}
function drumCircle(v){
  const pos=DRUM_POSITIONS[v]; if(!pos) return "";
  const limbs=limbsForVoice(v);

  // Scale factor for the shape - how much of the "radius space" to use
  const scale = 1.8;  // makes shapes nicely sized within their area
  const w = pos.r * 2 * scale;
  const h = pos.r * 2 * scale;
  const x = pos.cx - pos.r * scale;
  const y = pos.cy - pos.r * scale;

  // Check if this drum is in the current selection
  let isSelected = false;
  const bs=distinctSymbols(sheetKey);
  const matched=bs.filter(bt=>{
    const eff=revoice(bt); const effVoice=VOICE[eff.slice(2)]||"snare";
    return effVoice===v || (v==="closedhat"&&effVoice==="openhat") || (v==="snare"&&(effVoice==="ghost"||effVoice==="rest"));
  });
  isSelected = matched.some(bt => kitModal.includes(bt));

  let result = "";

  if(limbs.length===0) {
    // empty drum - show shape with gray fill
    const opacity = isSelected ? "1" : "0.5";
    result = `<g opacity="${opacity}"><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 32 32">${shapeSVG(v, "#55647d")}</svg></g>`;
  } else if(limbs.length===1) {
    // single limb - show shape in that color
    result = `<g><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 32 32">${shapeSVG(v, LIMB[limbs[0]].color)}</svg></g>`;
  } else if(limbs.length===2){
    // Special case: if snare with both RH and LH in Right/Left -- Snare drill, left side red, right side blue
    if(v === "snare" && sheetKey === "rightleftsnare1.1" && limbs.includes("RH") && limbs.includes("LH")){
      const c1=LIMB["LH"].color; // red on left
      const c2=LIMB["RH"].color; // blue on right
      const clipid=`clip-${v}-${Date.now()}`;
      result = `<g><defs><clipPath id="${clipid}-left"><rect x="0" y="0" width="16" height="32"/></clipPath><clipPath id="${clipid}-right"><rect x="16" y="0" width="16" height="32"/></clipPath></defs>`+
        `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 32 32">`+
        `<g clip-path="url(#${clipid}-left)">${shapeSVG(v, c1)}</g>`+
        `<g clip-path="url(#${clipid}-right)">${shapeSVG(v, c2)}</g>`+
        `</svg></g>`;
    } else if(v === "kick" && sheetKey === "RLkick" && limbs.includes("RF") && limbs.includes("LF")){
      // Special case: if kick with both RF and LF in Right/Left -- Kick drill, left side orange, right side green
      const c1=LIMB["LF"].color; // orange on left
      const c2=LIMB["RF"].color; // green on right
      const clipid=`clip-${v}-${Date.now()}`;
      result = `<g><defs><clipPath id="${clipid}-left"><rect x="0" y="0" width="16" height="32"/></clipPath><clipPath id="${clipid}-right"><rect x="16" y="0" width="16" height="32"/></clipPath></defs>`+
        `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 32 32">`+
        `<g clip-path="url(#${clipid}-left)">${shapeSVG(v, c1)}</g>`+
        `<g clip-path="url(#${clipid}-right)">${shapeSVG(v, c2)}</g>`+
        `</svg></g>`;
    } else {
      // Other two-limb cases: split in half vertically for two limbs
      const c1=LIMB[limbs[0]].color, c2=LIMB[limbs[1]].color;
      const clipid=`clip-${v}-${Date.now()}`;
      result = `<g><defs><clipPath id="${clipid}-left"><rect x="0" y="0" width="16" height="32"/></clipPath><clipPath id="${clipid}-right"><rect x="16" y="0" width="16" height="32"/></clipPath></defs>`+
        `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 32 32">`+
        `<g clip-path="url(#${clipid}-left)">${shapeSVG(v, c1)}</g>`+
        `<g clip-path="url(#${clipid}-right)">${shapeSVG(v, c2)}</g>`+
        `</svg></g>`;
    }
  } else {
    // 3+ limbs: show as a multi-color stripe pattern using a circle with pie slices, then overlay the shape
    const colors=limbs.map(l=>LIMB[l].color);
    const seg=360/colors.length;
    let path="";
    colors.forEach((c,i)=>{
      const a1=(i*seg-90)*Math.PI/180, a2=((i+1)*seg-90)*Math.PI/180;
      const x1=pos.cx+pos.r*Math.cos(a1), y1=pos.cy+pos.r*Math.sin(a1);
      const x2=pos.cx+pos.r*Math.cos(a2), y2=pos.cy+pos.r*Math.sin(a2);
      path+=`<path d="M${pos.cx},${pos.cy} L${x1},${y1} A${pos.r},${pos.r} 0 0,1 ${x2},${y2} Z" fill="${c}"/>`;
    });
    result = `<g>${path}<circle cx="${pos.cx}" cy="${pos.cy}" r="${pos.r}" fill="none" stroke="#fff" stroke-width="2"/>`+
      `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 32 32">${shapeSVG(v, "#fff")}</svg></g>`;
  }

  // Add selection highlight if this drum is selected
  if(isSelected){
    result += `<circle cx="${pos.cx}" cy="${pos.cy}" r="${pos.r + 8}" fill="none" stroke="#2f81f7" stroke-width="3" opacity="0.8"/>`;
  }

  return result;
}
function drumLabel(v,label){
  const pos=DRUM_POSITIONS[v]; if(!pos) return "";
  return `<text x="${pos.cx}" y="${pos.cy+pos.r+14}" text-anchor="middle" font-size="11" fill="#8b98a9">${label}</text>`;
}
function renderKit(){
  const m=DATA.meta[sheetKey];
  const isThreeLimbRF = sheetKey === "RHLHRF";
  const isThreeLimbLF = sheetKey === "RHLHLF";
  const isFourLimb = sheetKey === "RHLHRFLF";
  const isThreeOrFourLimb = isThreeLimbRF || isThreeLimbLF || isFourLimb;

  document.getElementById("sheetName").textContent="🥁 Drum Key — "+m.name;

  let descText;
  if(sheetKey === "rightleftsnare1.1"){
    if(kitModal.length > 0){
      descText = "Choose a color for each selected drum. Tap drums to add or remove from selection.";
    } else {
      descText = "Tap drums to select them. You can select multiple drums at once.";
    }
  } else if(sheetKey === "RLkick"){
    if(kitModal.length > 0){
      descText = "Pick one of the three options below to change the kick colors.";
    } else {
      descText = "Tap the kick drum below to select it, then choose your colors.";
    }
  } else if(kitModal.length > 0){
    if(isThreeOrFourLimb){
      descText = "Choose an instrument for the selected drum. Tap drums to add or remove from selection.";
    } else {
      descText = "Choose a color and symbol. Tap drums to add or remove from selection.";
    }
  } else {
    if(isThreeOrFourLimb){
      descText = "Tap each drum to select it, then pick an instrument. You can select drums one at a time or multiple at once.";
    } else {
      descText = "Tap drums to select them. You can select multiple drums at once.";
    }
  }

  document.getElementById("sheetDesc").textContent=descText;
  document.getElementById("rowCount").textContent="";
  document.getElementById("phraseWrap").style.display="none";
  document.getElementById("subdivWrap").style.display="none";
  const vw=document.getElementById("viewWrap"); if(vw) vw.style.display="none";
  const ie=document.getElementById("isoExit"); if(ie) ie.style.display="none";
  const kb=document.getElementById("kitBtn"); if(kb){ kb.style.display="inline-flex"; kb.textContent="✓ Done"; kb.classList.add("on"); }
  const host=document.getElementById("rows");
  host.classList.remove("scrollview","virt");
  host.style.height=""; host.scrollLeft=0; host.scrollTop=0; host.style.removeProperty("--cell");
  host.innerHTML=""; rowElByIndex.clear(); litCell=null; litRow=null; vspacer=null;
  const wrap=document.createElement("div"); wrap.className="kit"; host.appendChild(wrap);
  // live preview of the selected exercise, re-voiced
  const prow=rows[selRow]||rows[0]||[];
  host.style.setProperty("--cell", cellSizeFor(prow.length||8, 48).toFixed(2)+"px");
  const prev=document.createElement("div"); prev.className="kitprev";
  prev.innerHTML=`<div class="kitprevlbl">Preview · ${isolate?isoLabel:rowLabel(sheetKey,selRow)}</div>`;
  const pcells=document.createElement("div"); pcells.className="cells";
  prow.forEach((tok,idx)=>{ if(idx>0&&idx%4===0){ const g=document.createElement("div"); g.className="cellgap"; pcells.appendChild(g); } pcells.appendChild(cellNode(revoice(tok))); });
  prev.appendChild(pcells); wrap.appendChild(prev);

  // bird's-eye drum kit view
  const kitsvg=document.createElement("div"); kitsvg.className="kitsvg";
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.setAttribute("viewBox","0 0 400 340"); svg.setAttribute("width","100%"); svg.setAttribute("height","100%");
  // defs for clip paths
  const defs=document.createElementNS("http://www.w3.org/2000/svg","defs");
  svg.appendChild(defs);
  const drums=["leftcrash","lefttom","righttom","ride","rightcrash","closedhat","snare","floortom","kick"];
  const labels={"leftcrash":"L Crash","lefttom":"L Tom","righttom":"R Tom","floortom":"Floor","ride":"Ride","rightcrash":"R Crash","closedhat":"Hi-Hat","snare":"Snare","kick":"Kick"};
  drums.forEach(v=>{
    const g=document.createElementNS("http://www.w3.org/2000/svg","g");
    const circleHTML=drumCircle(v);
    // extract clip paths and add to defs
    const clipMatch=circleHTML.match(/<clipPath[^>]*>.*?<\/clipPath>/g);
    if(clipMatch){ clipMatch.forEach(cp=>{ const el=document.createElementNS("http://www.w3.org/2000/svg","g"); el.innerHTML=cp; defs.appendChild(el.firstChild); }); }
    const cleanHTML=circleHTML.replace(/<clipPath[^>]*>.*?<\/clipPath>/g,"");
    g.innerHTML=cleanHTML+drumLabel(v,labels[v]);
    g.style.cursor="pointer";
    g.addEventListener("click",()=>{
      const bs=distinctSymbols(sheetKey);
      const matched=bs.filter(bt=>{
        const eff=revoice(bt); const effVoice=VOICE[eff.slice(2)]||"snare";
        return effVoice===v || (v==="closedhat"&&effVoice==="openhat") || (v==="snare"&&(effVoice==="ghost"||effVoice==="rest"));
      });
      if(matched.length===0) return;
      // For Right/Left -- Snare, allow selecting multiple drums
      if(sheetKey === "rightleftsnare1.1"){
        // Toggle selection: add if not selected, remove if already selected
        const anySelected = matched.some(bt => kitModal.includes(bt));
        if(anySelected){
          matched.forEach(bt => {
            const idx = kitModal.indexOf(bt);
            if(idx >= 0) kitModal.splice(idx, 1);
          });
        } else {
          matched.forEach(bt => {
            if(!kitModal.includes(bt)) kitModal.push(bt);
          });
        }
        renderKit();
      } else if(sheetKey === "RLkick"){
        // For Right/Left -- Kick, only allow clicking the kick, and just toggle selection
        if(v === "kick"){
          if(kitModal.length > 0){
            kitModal=[];
          } else {
            kitModal=["kick"];  // just a marker that kick is selected
          }
        }
        renderKit();
      } else {
        // Other drills: select all matched drums
        const anySelected = matched.some(bt => kitModal.includes(bt));
        if(anySelected){
          matched.forEach(bt => {
            const idx = kitModal.indexOf(bt);
            if(idx >= 0) kitModal.splice(idx, 1);
          });
        } else {
          matched.forEach(bt => {
            if(!kitModal.includes(bt)) kitModal.push(bt);
          });
        }
        renderKit();
      }
    });
    svg.appendChild(g);
  });
  kitsvg.appendChild(svg); wrap.appendChild(kitsvg);

  // modal card - always shown when drums are selected
  if(kitModal.length > 0){
    const card=kitCard();
    card.className="kitcard kitmodal";
    // Add X close button
    const closeBtn=document.createElement("button");
    closeBtn.type="button";
    closeBtn.className="kitclose";
    closeBtn.textContent="✕";
    closeBtn.addEventListener("click",(ev)=>{
      ev.stopPropagation();
      kitModal=[];
      renderKit();
    });
    card.appendChild(closeBtn);
    wrap.appendChild(card);
  }

  // reset
  const foot=document.createElement("div"); foot.className="kitfoot";
  const reset=document.createElement("button"); reset.type="button"; reset.className="ctl kitreset"; reset.textContent="↺ Reset to default";
  reset.addEventListener("click",()=>{ delete voicing[sheetKey]; saveVoicing(); kitModal=[]; renderKit(); });
  foot.appendChild(reset); wrap.appendChild(foot);
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
  const fb=document.createElement("button"); fb.id="favSheetBtn"; fb.className="sheet favsheet"+(favView?" active":"");
  fb.innerHTML=`<div class="nm">★ Favorites</div><div class="tg">Saved · ${favs.length}${favs.length===1?" line":" lines"}</div>`;
  fb.addEventListener("click",openFavorites);
  host.appendChild(fb);
  DATA.order.forEach(k=>{
    const m=DATA.meta[k];
    const b=document.createElement("button"); b.className="sheet"+(!favView&&!isolate&&k===sheetKey?" active":"");
    const cnt=rowCountFor(k); const unit=(baseFigures(k)&&phraseBars>1)?"phrases":"lines";
    b.innerHTML=`<div class="nm">${m.name}</div><div class="tg">${m.tag} · ${cnt} ${unit}</div>`;
    b.addEventListener("click",()=>{ favView=false; isolate=false; sheetKey=k; selRow=0; curRow=0; curStep=0;
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
  // the hit (re-voiced per the Drum Key page, if any)
  const tok=revoice(row[curStep]); const limb=tok.slice(0,2); const voice=VOICE[tok.slice(2)]||"snare";
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
  if(favView) return;              // the folder isn't a playable context — tap a line to open it
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
document.getElementById("isoExit").addEventListener("click",exitIsolate);
document.getElementById("kitBtn").addEventListener("click",()=> kitView?closeKit():openKit());
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
    if(favView||isolate) return;              // no per-line selection in the folder / focus mode
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
window.addEventListener("resize",()=>{ fitTransport(); if(favView) renderFavorites(); else fitCells(); });

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
