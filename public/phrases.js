/* ---------- Phrase generation ----------
   The two-symbol drills are generated at runtime so we can present them either
   as single figures (16) or as every two-bar phrase pairing (256).            */
const GEN = {                         // sheetKey -> the two symbols it alternates
  "rightleftsnare1.1": {a:"LHs", b:"RHs"},
  "LHLF1.1":           {a:"LHs", b:"LFk"},
  "RHLF1.1":           {a:"RHs", b:"LFk"},
  "LHRF1.1":           {a:"LHs", b:"RFk"},
  "RHRF1.1":           {a:"RHs", b:"RFk"},
  "RLkick":            {a:"LFk", b:"RFk"},
};
// The 16 orderings of two symbols over four 16ths, in a teaching order
// (unison → one different → two/two → alternating). 0 = a, 1 = b.
const PAT16 = [
  [0,0,0,0],[1,1,1,1],[0,0,0,1],[1,1,1,0],[0,0,1,1],[1,1,0,0],[0,1,1,1],[1,0,0,0],
  [0,1,1,0],[1,0,0,1],[0,1,0,0],[1,0,1,1],[0,0,1,0],[1,1,0,1],[0,1,0,1],[1,0,1,0],
];
let phraseBars = 2;                   // 1 = single figures, 2 = two-bar, 4 = four-bar

function figuresFor(gen){ return PAT16.map(p => p.map(bit => bit ? gen.b : gen.a)); }
// Sheets that support phrasing expose a list of base one-bar figures: the two-symbol
// drills generate theirs (16 orderings); the linear drills use their hand-curated
// figure list straight from DATA (36 three-limb, 24 four-limb). Everything downstream
// (row building, i,j labels, counts) is identical once we have that list.
const LINEAR = new Set(["RHLHRF","RHLHLF","RHLHRFLF"]);
function baseFigures(key){
  if(GEN[key]) return figuresFor(GEN[key]);
  if(LINEAR.has(key) || comboList(key)) return DATA.sheets[key];
  return null;                                       // plain static sheet (no phrasing)
}
// Combo sheets carry a combo list per phrase length, keyed "2"/"4". Paradiddles
// ENUMERATE every valid combo under the drummer's rule: no run of 3+ of the same limb
// (color) anywhere in the phrase, checked cyclically because each exercise loops on
// itself. 1-bar (single figures) is exempt — the 10 figures are just the framework.
// Other sheets could still ship an explicit DATA.combos[key] list instead.
const NO3 = new Set(["paradiddle"]);   // sheets whose 2/4-bar combos are auto-generated
function limbAt(figs, combo){          // flatten a combo (1-based figure indices) to limbs
  const seq=[];
  for(const n of combo) for(const tok of figs[n-1]) seq.push(tok.slice(0,2));
  return seq;
}
function no3Cyclic(seq){               // false if any limb repeats 3x in a row (incl. wrap)
  const n=seq.length;
  for(let i=0;i<n;i++) if(seq[i]===seq[(i+1)%n] && seq[i]===seq[(i+2)%n]) return false;
  return true;
}
function genCombos(key, len){          // every length-`len` figure combo that passes the rule
  const figs=DATA.sheets[key], N=figs.length, out=[], cur=[];
  (function rec(){
    if(cur.length===len){ if(no3Cyclic(limbAt(figs,cur))) out.push(cur.slice()); return; }
    for(let n=1;n<=N;n++){ cur.push(n); rec(); cur.pop(); }   // n=1..N → lexicographic order
  })();
  return out;
}
const _comboCache={};
function comboList(key){
  if(NO3.has(key))
    return _comboCache[key] || (_comboCache[key]={ "2":genCombos(key,2), "4":genCombos(key,4) });
  return (typeof DATA!=="undefined" && DATA.combos && DATA.combos[key]) || null;
}
// Turn an ordered pair of figures (i,j) into a phrase of the current length.
function phraseFor(figs, i, j){
  const a=figs[i], b=figs[j];
  if(phraseBars === 2) return a.concat(b);
  return a.concat(b, b, a);                         // 4 bars: arch form i,j,j,i
}
function buildRows(key){
  const figs = baseFigures(key);
  if(!figs) return DATA.sheets[key];                 // non-phrasing sheet: static data
  if(phraseBars === 1) return figs.map(f => f.slice());
  const cur = comboList(key);
  if(cur) return (cur[phraseBars] || []).map(          // curated: only the picked combos
    combo => combo.reduce((acc, n) => acc.concat(figs[n-1]), []));
  const out = [];                                   // every ordered pair of figures
  for(let i=0;i<figs.length;i++)
    for(let j=0;j<figs.length;j++) out.push(phraseFor(figs,i,j));
  return out;
}
function rowLabel(key, ri){
  const figs = baseFigures(key);
  if(!figs || phraseBars === 1) return (ri+1)+".";
  const cur = comboList(key);
  if(cur){ const c=(cur[phraseBars]||[])[ri]; return c ? c.join(",") : (ri+1)+"."; }
  const n = figs.length;                            // "i,j" — matches the drummer's notation
  return (Math.floor(ri/n)+1)+","+(ri%n+1);
}
function rowCountFor(key){
  const figs = baseFigures(key);
  if(!figs) return DATA.sheets[key].length;
  if(phraseBars === 1) return figs.length;
  const cur = comboList(key);
  if(cur) return (cur[phraseBars] || []).length;
  return figs.length * figs.length;
}
