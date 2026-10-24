// tools/check_ch.mjs — ตรวจบทพูดทั้งเล่ม: syntax/ภาพ/speaker/เวลาอ่าน
import fs from "node:fs";
globalThis.WNF = [];
for (let i = 1; i <= 15; i++) {
  const code = fs.readFileSync(`js/ch${String(i).padStart(2, "0")}.js`, "utf8");
  (0, eval)(code);
}
let parts = 0; const bad = []; const mins = []; const speakers = new Set();
for (const ch of WNF) {
  if (!ch.parts || ch.parts.length !== 3) bad.push(`ch${ch.n}: parts=${ch.parts?.length}`);
  for (const p of ch.parts) {
    parts++;
    if (!fs.existsSync(p.img)) bad.push(`ch${ch.n} ${p.img} MISSING`);
    const chars = (p.paras || []).join("").replace(/\s/g, "").length;
    for (const id of p.cast || []) speakers.add(id);
    mins.push([`c${ch.n}p${ch.parts.indexOf(p) + 1}`, (chars / 330).toFixed(1)]);
  }
  if (!ch.q || ch.q.length !== 3 || !ch.note) bad.push(`ch${ch.n}: q/note incomplete`);
}
console.log("chapters:", WNF.length, "| parts:", parts);
console.log("bad:", bad.length ? bad.join(" ; ") : "none");
console.log("cast ids:", [...speakers].sort().join(","));
const out = mins.filter(m => +m[1] > 5.6 || +m[1] < 3.2);
console.log("out-of-band (3.2–5.6 นาทีอ่านเงียบ):", out.length ? out.map(m => m.join("=")).join(" ") : "none");
const total = mins.reduce((a, m) => a + +m[1], 0);
console.log("avg นาที/ตอน:", (total / mins.length).toFixed(2), "| รวมทั้งเล่ม:", total.toFixed(0), "นาที (อ่านออกเสียง≈x1.4)");
