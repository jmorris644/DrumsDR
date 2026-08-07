/* Drill/phrase unit tests — no framework, no browser.
   Loads the REAL public/drills.js + public/phrases.js (which are plain
   `const ...` classic scripts, DOM-free) into one function scope, so we test
   the exact code that ships. Run: `node test/drills.test.js` */
const fs = require("fs");
const path = require("path");

const read = f => fs.readFileSync(path.join(__dirname, "..", "public", f), "utf8");

// drills.js defines `const DATA`; phrases.js defines GEN/PAT16/LINEAR/phraseBars
// and figuresFor/baseFigures/phraseFor/buildRows/rowLabel/rowCountFor. Evaluate
// both in a shared scope and hand back the functions + a phraseBars setter.
const M = new Function(
  read("drills.js") + "\n" + read("phrases.js") + "\n" +
  "return {DATA, GEN, LINEAR, baseFigures, buildRows, rowLabel, rowCountFor, comboList," +
  " setBars(v){ phraseBars = v; }};"
)();

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) fails++; };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const { DATA } = M;
const rf = DATA.sheets.RHLHRF, lf = DATA.sheets.RHLHLF, four = DATA.sheets.RHLHRFLF;

/* ---- data invariants ---- */
ok(DATA.order.length === 10, "10 sheets in order");
DATA.order.forEach(k => ok(DATA.meta[k] && DATA.sheets[k], "meta+sheet exist: " + k));
ok(rf.length === 36, "RHLHRF has 36 combos");
ok(lf.length === 36, "RHLHLF has 36 combos");
ok(four.length === 24, "RHLHRFLF has 24 combos");

// three-limb = every 4-note ordering of RH/LH/RF that uses all three (surjective)
const syms = ["RHs", "LHs", "RFk"], complete = new Set();
for (const a of syms) for (const b of syms) for (const c of syms) for (const d of syms)
  if (new Set([a, b, c, d]).size === 3) complete.add([a, b, c, d].join(","));
const rfSet = new Set(rf.map(c => c.join(",")));
ok(complete.size === 36, "there are exactly 36 surjective RH/LH/RF orderings");
ok(rfSet.size === 36, "RHLHRF combos are all unique");
ok([...complete].every(x => rfSet.has(x)), "RHLHRF == the complete 36-combo set");

// left-foot set is the exact RF->LF mirror, in the same order
ok(rf.every((c, i) => eq(c.map(t => t === "RFk" ? "LFk" : t), lf[i])),
   "RHLHLF is the exact RF->LF mirror of RHLHRF");

// four-limb: each figure uses all four limbs once
ok(four.every(c => new Set(c.map(t => t.slice(0, 2))).size === 4 && c.length === 4),
   "RHLHRFLF figures each use all four limbs");

/* ---- phrase-building logic (the real functions) ---- */
M.setBars(1);
ok(M.buildRows("RHLHRF").length === 36 && M.rowCountFor("RHLHRF") === 36, "1-bar: 36 rows");
ok(M.rowLabel("RHLHRF", 0) === "1." && M.rowLabel("RHLHRF", 35) === "36.", "1-bar labels 1..36");

M.setBars(2);
const r2 = M.buildRows("RHLHRF"), figs = M.baseFigures("RHLHRF");
ok(r2.length === 1296 && r2.every(x => x.length === 8), "2-bar: 1296 rows x 8 cells");
ok(M.rowCountFor("RHLHRF") === 1296, "2-bar count = 36^2");
ok(M.rowLabel("RHLHRF", 0) === "1,1" && M.rowLabel("RHLHRF", 1) === "1,2" &&
   M.rowLabel("RHLHRF", 36) === "2,1" && M.rowLabel("RHLHRF", 1295) === "36,36", "2-bar i,j labels");
ok(eq(r2[1], figs[0].concat(figs[1])), "2-bar row 1,2 = fig1 ++ fig2 (every-combo-with-every-other)");

M.setBars(4);
const r4 = M.buildRows("RHLHRF");
ok(r4.every(x => x.length === 16), "4-bar: 16 cells");
ok(eq(r4[1], figs[0].concat(figs[1], figs[1], figs[0])), "4-bar row 1,2 = arch i,j,j,i");

M.setBars(2);
ok(M.rowCountFor("RHLHRFLF") === 576 && M.rowCountFor("RHLHLF") === 1296, "four-limb=576, LF=1296 at 2 bars");

/* ---- paradiddles (generated-combo mode: every valid combo, no 3-in-a-row looped) ---- */
const pd = DATA.sheets.paradiddle;
ok(pd.length === 10 && pd.every(f => f.length === 4 && f.every(t => t === "RHs" || t === "LHs")),
   "paradiddle: 10 hand figures of 4 notes");
ok(eq(pd[0], ["RHs", "LHs", "RHs", "RHs"]), "paradiddle figure 1 = R L R R (standard)");
ok(!("combos" in DATA), "DATA.combos removed — paradiddle combos are generated at runtime");

const pcomb = M.comboList("paradiddle");
ok(pcomb["2"].length === 46 && pcomb["4"].length === 2206, "generated: 46 two-figure, 2206 four-figure combos");
const uniq = a => new Set(a.map(c => c.join(","))).size === a.length;
ok(uniq(pcomb["2"]) && uniq(pcomb["4"]), "no duplicate combos");
ok([...pcomb["2"], ...pcomb["4"]].every(c => c.every(n => n >= 1 && n <= 10)), "all combo refs are figures 1..10");

// the rule: flatten a combo to limbs, check no limb repeats 3x in a row, cyclically (looped)
const limbs = combo => combo.reduce((a, n) => a.concat(pd[n - 1].map(t => t.slice(0, 2))), []);
const no3 = seq => { const n = seq.length; for (let i = 0; i < n; i++) if (seq[i] === seq[(i+1)%n] && seq[i] === seq[(i+2)%n]) return false; return true; };
ok(pcomb["2"].every(c => no3(limbs(c))) && pcomb["4"].every(c => no3(limbs(c))),
   "every generated combo obeys no-3-same-limb-in-a-row (looped)");
// and it's the COMPLETE set: independent brute-force enumeration agrees, in order
const allValid = len => { const out = [], cur = []; (function rec(){ if (cur.length === len) { if (no3(limbs(cur))) out.push(cur.join(",")); return; } for (let n = 1; n <= 10; n++) { cur.push(n); rec(); cur.pop(); } })(); return out; };
ok(eq(pcomb["2"].map(c => c.join(",")), allValid(2)) && pcomb["2"].length === 46, "2-bar == complete valid set (46), in order");
ok(eq(pcomb["4"].map(c => c.join(",")), allValid(4)) && pcomb["4"].length === 2206, "4-bar == complete valid set (2206), in order");
// spot-checks the drummer flagged
const set2 = new Set(pcomb["2"].map(c => c.join(",")));
ok(!set2.has("2,8"), "2,8 excluded (makes R-R-R across the loop)");
ok(set2.has("3,3") && set2.has("10,10"), "3,3 and 10,10 now included");

M.setBars(1);
ok(M.buildRows("paradiddle").length === 10 && M.rowCountFor("paradiddle") === 10, "paradiddle 1-bar: 10 figures (rule exempt)");
M.setBars(2);
const pr2 = M.buildRows("paradiddle");
ok(pr2.length === 46 && pr2.every(x => x.length === 8), "paradiddle 2-bar: 46 rows x 8 cells");
ok(M.rowCountFor("paradiddle") === 46, "paradiddle 2-bar count = 46");
ok(M.rowLabel("paradiddle", 0) === "1,4", "paradiddle 2-bar first valid combo = 1,4");
ok(eq(pr2[0], pd[0].concat(pd[3])), "paradiddle 2-bar row0 = fig1 ++ fig4");
M.setBars(4);
const pr4 = M.buildRows("paradiddle");
ok(pr4.length === 2206 && pr4.every(x => x.length === 16), "paradiddle 4-bar: 2206 rows x 16 cells");
ok(M.rowLabel("paradiddle", 0) === pcomb["4"][0].join(","), "paradiddle 4-bar label = first generated combo");
ok(eq(pr4[0], pcomb["4"][0].reduce((a, n) => a.concat(pd[n - 1]), [])), "paradiddle 4-bar row0 = concat of its 4 figures");

console.log(fails ? `\n${fails} test(s) FAILED` : "\nAll tests passed");
process.exit(fails ? 1 : 0);
