// genart.mjs — สร้างภาพนิทานสัตว์การ์ตูนทั้งเล่ม (45 ตอน + ปก + avatar)
// รัน: node tools/genart.mjs   →  เขียนไฟล์ลง assets/ และ assets/c/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* ---------- helpers ---------- */
// ถ้า extra กำหนด fill เองแล้ว ไม่ปล่อย fill ซ้ำ (XML ห้าม attribute ซ้ำ)
const F = (fill, extra) => (/\bfill=/.test(extra) ? "" : `fill="${fill}" `);
const R = (x, y, w, h, rx = 0, fill = "#fff", extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ${F(fill, extra)}${extra}/>`;
const C = (cx, cy, r, fill, extra = "") => `<circle cx="${cx}" cy="${cy}" r="${r}" ${F(fill, extra)}${extra}/>`;
const E = (cx, cy, rx, ry, fill, extra = "") => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${F(fill, extra)}${extra}/>`;
const P = (d, fill = "none", extra = "") => `<path d="${d}" ${F(fill, extra)}${extra}/>`;
const G = (tx, ty, s = 1, flip = false, inner = "") =>
  `<g transform="translate(${tx},${ty}) scale(${flip ? -s : s},${s})">${inner}</g>`;
const dark = (hex, f = 0.82) => { // ให้เงาสีเดิมแก่เข้มขึ้น (ประมาณด้วยการผสมดำ)
  const n = parseInt(hex.slice(1), 16), k = Math.round(255 * (1 - f));
  const r = Math.round(((n >> 16) & 255) * f + k), g = Math.round(((n >> 8) & 255) * f + k), b = Math.round((n & 255) * f + k);
  return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
};

/* ---------- หน้าสัตว์แบบ chibi ----------
   anchor: หัวกลม r26 ศูนย์ที่ (0,0) ของกลุ่มหัว; ตัวอยู่ล่าง
   คืน {back(วาดก่อนหัว), head(หลังหัว+หน้า), tail, bodyFill} */
const eyes = (emo = "norm") => {
  if (emo === "happy") return P("M-13,-2 q4,-5 8,0 M5,-2 q4,-5 8,0", "none", 'stroke="#3A2E2A" stroke-width="2.4" stroke-linecap="round" fill="none"');
  if (emo === "sleepy") return P("M-13,-1 q4,3 8,0 M5,-1 q4,3 8,0", "none", 'stroke="#3A2E2A" stroke-width="2.4" stroke-linecap="round" fill="none"');
  if (emo === "wow") return C(-9, -2, 4.6, "#3A2E2A") + C(9, -2, 4.6, "#3A2E2A") + C(-10.4, -3.6, 1.6, "#fff") + C(7.6, -3.6, 1.6, "#fff");
  if (emo === "sad") return C(-9, -2, 3.2, "#3A2E2A") + C(9, -2, 3.2, "#3A2E2A") + C(-10.2, -3.4, 1.1, "#fff") + C(7.8, -3.4, 1.1, "#fff") + P("M-6,9 q6,-4 12,0", "none", 'stroke="#3A2E2A" stroke-width="2.2" stroke-linecap="round" fill="none"');
  return C(-9, -2, 3.4, "#3A2E2A") + C(9, -2, 3.4, "#3A2E2A") + C(-10.2, -3.4, 1.2, "#fff") + C(7.8, -3.4, 1.2, "#fff");
};
const owlEyes = () => C(-9, -2, 5.4, "#3A2E2A") + C(9, -2, 5.4, "#3A2E2A") + C(-10.8, -4, 1.9, "#fff") + C(7.2, -4, 1.9, "#fff");
const blush = C(-15, 5, 3.4, "#F49E9E", 'opacity="0.55"') + C(15, 5, 3.4, "#F49E9E", 'opacity="0.55"');
const mouth = (emo = "norm") =>
  emo === "sad" ? "" :
  emo === "wow" ? E(0, 8, 3, 4, "#B5564F") :
  emo === "sleepy" ? E(0, 8, 2, 2.6, "#B5564F") :
  P("M-4,7 q4,4 8,0", "none", 'stroke="#B5564F" stroke-width="2.2" stroke-linecap="round" fill="none"');

const SPECIES = {
  lion: { fur: "#E8A33D", ears: C(-24, -12, 6.5, "#E8A33D") + C(24, -12, 6.5, "#E8A33D"),
    back: P("M0,-30 a30,30 0 1 0 0.01,0 z", "#C77B3A") + Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2;return C(Math.cos(a)*29,Math.sin(a)*29-1,7.5,"#C77B3A")}).join(""),
    muzzle: E(0, 8, 9, 6.5, "#F7DCA8"), tail: P("M18,0 q16,-6 12,-18", "none", 'stroke="#C77B3A" stroke-width="6" stroke-linecap="round" fill="none"') + C(30, -19, 4.5, "#C77B3A") },
  elephant: { fur: "#9AA7C7", ears: E(-31, 2, 15, 19, "#8B98B8") + E(31, 2, 15, 19, "#8B98B8") + E(-31, 2, 9, 12, "#B9C3DB") + E(31, 2, 9, 12, "#B9C3DB"),
    trunk: P("M0,4 q0,14 -3,20 q-1.5,4 -6,3.5", "none", 'stroke="#9AA7C7" stroke-width="8" stroke-linecap="round" fill="none"'), tail: P("M16,4 q10,2 9,-8", "none", 'stroke="#8B98B8" stroke-width="4" stroke-linecap="round" fill="none"') },
  fox: { fur: "#F08A4B", ears: P("M-22,-14 L-27,-34 L-8,-22 Z", "#F08A4B") + P("M22,-14 L27,-34 L8,-22 Z", "#F08A4B") + P("M-20,-17 L-23,-29 L-12,-22 Z", "#FFF4E6") + P("M20,-17 L23,-29 L12,-22 Z", "#FFF4E6"),
    muzzle: P("M-11,2 Q0,16 11,2 Q6,14 0,14 Q-6,14 -11,2 Z", "#FFF4E6") + C(0, 14, 3.4, "#4A3B33"),
    tail: P("M16,-2 q22,-2 20,-22 q10,18 -6,28 q-8,4 -14,-6", "#F08A4B") + P("M28,-16 q6,10 -4,16 q8,-2 6,-10 z", "#FFF4E6") },
  owl: { fur: "#C9A66B", ears: P("M-18,-18 L-23,-30 L-10,-23 Z", "#B08C50") + P("M18,-18 L23,-30 L10,-23 Z", "#B08C50"),
    discs: C(-9, -2, 8.5, "#F7EAD0") + C(9, -2, 8.5, "#F7EAD0"),
    beak: P("M-3,4 L3,4 L0,10 Z", "#E8933E"), belly: E(0, 16, 12, 10, "#F7EAD0"),
    wings: E(-24, 12, 6, 12, "#B08C50") + E(24, 12, 6, 12, "#B08C50"), tail: "" },
  dog: { fur: "#F2C879", ears: P("M-20,-12 q-8,-6 -6,-16 q8,4 10,12 z", "#E0A860") + P("M20,-12 q8,-6 6,-16 q-8,4 -10,12 z", "#E0A860"),
    muzzle: E(0, 8, 8.5, 6.5, "#FBEED2") + C(0, 4, 3.2, "#4A3B33"),
    brows: P("M-13,-10 q5,-3 9,-1 M4,-11 q5,-2 9,1", "none", 'stroke="#C98F4E" stroke-width="2" stroke-linecap="round" fill="none"'),
    tail: P("M14,-4 q14,-8 8,-20", "none", 'stroke="#F2C879" stroke-width="7" stroke-linecap="round" fill="none"') },
  rabbit: { fur: "#F5E3D7", ears: E(-9, -38, 7.5, 20, "#F5E3D7", 'transform="rotate(-8 -9 -38)"') + E(9, -38, 7.5, 20, "#F5E3D7", 'transform="rotate(8 9 -38)"') + E(-9, -36, 3.8, 14, "#F2B8C0", 'transform="rotate(-8 -9 -36)"') + E(9, -36, 3.8, 14, "#F2B8C0", 'transform="rotate(8 9 -36)"'),
    muzzle: E(0, 7, 6.5, 5, "#fff") + C(0, 3.5, 2.8, "#D98A94"), tail: C(-16, -6, 6, "#FDF6EE") },
  pig: { fur: "#F4B8C4", ears: P("M-20,-12 L-25,-26 L-9,-19 Z", "#F4B8C4") + P("M20,-12 L25,-26 L9,-19 Z", "#F4B8C4"),
    muzzle: E(0, 6, 9.5, 7, "#FBD3DA") + C(-3.4, 6, 1.5, "#C76E80") + C(3.4, 6, 1.5, "#C76E80"), tail: P("M14,-4 q8,-2 7,-9 q-1,-5 3,-4", "none", 'stroke="#F4B8C4" stroke-width="4.5" stroke-linecap="round" fill="none"') },
  wolf: { fur: "#8E9BAE", ears: P("M-20,-13 L-26,-33 L-8,-21 Z", "#7B8798") + P("M20,-13 L26,-33 L8,-21 Z", "#7B8798"),
    muzzle: E(0, 8, 9, 6.5, "#DDE3EA") + C(0, 4, 3, "#3E4653"), tail: P("M16,-4 q16,-6 12,-20", "none", 'stroke="#7B8798" stroke-width="7" stroke-linecap="round" fill="none"') },
  mouse: { fur: "#B9AEC4", ears: C(-20, -20, 10, "#B9AEC4") + C(20, -20, 10, "#B9AEC4") + C(-20, -20, 5.5, "#E7C9D6") + C(20, -20, 5.5, "#E7C9D6"),
    muzzle: C(0, 6, 3.2, "#6D617A"), tail: P("M12,-2 q14,4 10,14", "none", 'stroke="#D9A7B8" stroke-width="3" stroke-linecap="round" fill="none"') },
  squirrel: { fur: "#C98A5B", ears: E(-14, -24, 6, 8, "#C98A5B") + E(14, -24, 6, 8, "#C98A5B") + E(-14, -24, 3, 4.5, "#E8B48C") + E(14, -24, 3, 4.5, "#E8B48C"),
    muzzle: E(0, 7, 7, 5.5, "#EFD2B4") + C(0, 3.5, 2.6, "#7A4E2D"),
    tail: P("M14,-8 q26,6 16,-30 q18,24 -2,38 q-10,6 -14,-8", "#B0703F") },
  lizard: { fur: "#8FBF6F", ears: P("M-16,-20 q-2,-12 8,-16 q-2,8 2,12 z", "#7BAF5C") + P("M16,-20 q2,-12 -8,-16 q2,8 -2,12 z", "#7BAF5C"),
    muzzle: E(0, 7, 8, 5.5, "#A9D68C") + C(0, 3.5, 2.4, "#4E6B3A"), crest: P("M0,-24 q3,-6 0,-10 q-3,4 0,10", "none", 'stroke="#7BAF5C" stroke-width="3" fill="none"'),
    tail: P("M14,-2 q18,2 16,12 q-4,6 -12,2", "none", 'stroke="#8FBF6F" stroke-width="6" stroke-linecap="round" fill="none"') },
  beaver: { fur: "#B98A62", ears: C(-20, -16, 5.5, "#A87A54") + C(20, -16, 5.5, "#A87A54"),
    muzzle: E(0, 8, 8.5, 6, "#E3C9A8") + P("M-6,10 q6,5 12,0 q-6,3 -12,0", "#fff"), tail: E(18, 2, 8, 12, "#9A7350", 'transform="rotate(20 18 2)"') },
  // เม่น: โดมหนามอยู่หลังหัว + หนามหนา 8 เล่ม (อ่านเป็นหนามจริง ไม่ใช่วงจุด)
  hedgehog: { fur: "#E8CBA8", back: P("M-28,-4 a28,28 0 0 1 56,0 z", "#8C6A4F") +
    Array.from({length:8},(_,i)=>{const a=Math.PI*(1.12+i*0.096);const r0=24,r1=35,w=0.11;
      return P(`M${(Math.cos(a-w)*r0).toFixed(1)},${(Math.sin(a-w)*r0).toFixed(1)} L${(Math.cos(a)*r1).toFixed(1)},${(Math.sin(a)*r1).toFixed(1)} L${(Math.cos(a+w)*r0).toFixed(1)},${(Math.sin(a+w)*r0).toFixed(1)} z`, "#8C6A4F")}).join(""),
    muzzle: E(0, 8, 8, 6, "#F6E2C6") + C(0, 4, 2.8, "#6B4E37"), tail: "" },
  deer: { fur: "#D9A87A", ears: E(-20, -14, 6, 9, "#D9A87A", 'transform="rotate(-20 -20 -14)"') + E(20, -14, 6, 9, "#D9A87A", 'transform="rotate(20 20 -14)"'),
    antlers: P("M-10,-22 q-4,-14 -12,-16 M-13,-30 q-6,-2 -9,-6 M-12,-25 q-7,-1 -10,-5", "none", 'stroke="#8C6239" stroke-width="2.6" stroke-linecap="round" fill="none"') + P("M10,-22 q4,-14 12,-16 M13,-30 q6,-2 9,-6 M12,-25 q7,-1 10,-5", "none", 'stroke="#8C6239" stroke-width="2.6" stroke-linecap="round" fill="none"'),
    muzzle: E(0, 8, 8, 6, "#F2D9B8") + C(0, 4, 2.8, "#6B4E37"), spots: C(-8, 4, 1.6, "#B98A5B") + C(6, 6, 1.6, "#B98A5B"), tail: C(-16, -4, 4, "#F7EBD9") },
  goat: { fur: "#DCD3C3", ears: E(-21, -12, 5, 9, "#CFC4B0", 'transform="rotate(-24 -21 -12)"') + E(21, -12, 5, 9, "#CFC4B0", 'transform="rotate(24 21 -12)"'),
    horns: P("M-9,-22 q-3,-14 -12,-16 q2,10 -2,16 z", "#A99A82") + P("M9,-22 q3,-14 12,-16 q-2,10 2,16 z", "#A99A82"),
    muzzle: E(0, 8, 7, 5, "#EFE9DC") + C(0, 4, 2.6, "#6B6153"), tail: P("M12,-4 q6,-4 4,-9", "none", 'stroke="#DCD3C3" stroke-width="4" stroke-linecap="round" fill="none"') },
  bear: { fur: "#B98A6B", ears: C(-19, -19, 8.5, "#B98A6B") + C(19, -19, 8.5, "#B98A6B") + C(-19, -19, 4.5, "#A87A5B") + C(19, -19, 4.5, "#A87A5B"),
    muzzle: E(0, 8, 9, 6.5, "#E9D3BC") + C(0, 4, 3.2, "#5E4433"), tail: C(-16, -4, 5, "#A87A5B") },
  cat: { fur: "#E8B04B", ears: P("M-19,-13 L-24,-30 L-7,-20 Z", "#E8B04B") + P("M19,-13 L24,-30 L7,-20 Z", "#E8B04B") + P("M-16,-16 L-19,-26 L-10,-20 Z", "#F2B8C0") + P("M16,-16 L19,-26 L10,-20 Z", "#F2B8C0"),
    muzzle: E(0, 7, 7, 5, "#FBEED2") + C(0, 3.5, 2.5, "#B06A3B") + P("M-12,4 q-6,1 -9,3 M12,4 q6,1 9,3", "none", 'stroke="#C79A5B" stroke-width="1.4" fill="none"'),
    tail: P("M14,-4 q16,-4 14,-20 q8,14 -4,24 q-6,4 -10,0", "#E8B04B") },
  turtle: { fur: "#8FB98B", ears: C(-21, -12, 4.5, "#7FAA7B") + C(21, -12, 4.5, "#7FAA7B"),
    muzzle: E(0, 8, 7, 5, "#B7D6B3") + C(0, 4, 2.5, "#4E6B4A"),
    shell: "turtle-body", tail: P("M12,0 q8,1 8,-5", "none", 'stroke="#7FAA7B" stroke-width="4" stroke-linecap="round" fill="none"') },
  otter: { fur: "#A9846B", ears: C(-20, -16, 5.5, "#98765F") + C(20, -16, 5.5, "#98765F"),
    muzzle: P("M-10,2 Q0,15 10,2 Q5,12 0,12 Q-5,12 -10,2 Z", "#F0E0D0") + C(0, 12, 3, "#5E4433"),
    whiskers: P("M-10,5 q-5,0 -8,-1 M10,5 q5,0 8,-1", "none", 'stroke="#C9A98C" stroke-width="1.3" fill="none"'),
    tail: E(18, 2, 6, 12, "#98765F", 'transform="rotate(18 18 2)"') },
  tiger: { fur: "#E89B4B", ears: P("M-19,-13 L-24,-30 L-7,-20 Z", "#E89B4B") + P("M19,-13 L24,-30 L7,-20 Z", "#E89B4B") + C(-17,-21,2.5,"#3E4653")+C(17,-21,2.5,"#3E4653"),
    stripes: P("M-14,-10 q3,3 1,7 M14,-10 q-3,3 -1,7 M0,-24 q2,4 0,7", "none", 'stroke="#3E4653" stroke-width="2.4" stroke-linecap="round" fill="none"'),
    muzzle: E(0, 8, 8.5, 6, "#FBEED2") + C(0, 4, 3, "#5E4433"), tail: P("M16,-4 q16,-2 14,-18 q7,12 -3,22 q-6,5 -11,-4", "none", 'stroke="#E89B4B" stroke-width="7" stroke-linecap="round" fill="none"') },
  horse: { fur: "#D9A05B", ears: P("M-14,-20 q-2,-11 4,-13 q2,7 -1,13 z", "#C98F4E") + P("M14,-20 q2,-11 -4,-13 q-2,7 1,13 z", "#C98F4E"),
    mane: P("M-14,-20 q-8,8 -6,20 q4,-10 10,-14 z", "#8C6239") + P("M0,-25 q-6,10 -5,22 q3,-12 9,-16 z", "#8C6239") + P("M14,-20 q8,8 6,20 q-4,-10 -10,-14 z", "#8C6239"),
    muzzle: E(0, 8, 9, 6.5, "#F0D9B8") + C(0, 4, 3, "#6B4E37"), tail2: P("M14,-4 q18,4 14,24", "none", 'stroke="#8C6239" stroke-width="6" stroke-linecap="round" fill="none"') },
  sheep: { fur: "#F2EAD8", back: C(-16,-14,11,"#EAE0C8")+C(16,-14,11,"#EAE0C8")+C(0,-22,12,"#EAE0C8")+C(-12,-2,10,"#EAE0C8")+C(12,-2,10,"#EAE0C8"),
    face: E(0, 0, 14, 16, "#CBBFA2"), tail: C(-16, -4, 4.5, "#EAE0C8") },
  camel: { fur: "#D9B36E", ears: C(-19, -16, 4.5, "#CBA25D") + C(19, -16, 4.5, "#CBA25D"),
    muzzle: E(0, 7, 8, 6, "#E8D3A3") + C(0, 3.5, 2.6, "#8C6239"), humps: true, tail: P("M12,-2 q8,2 6,10", "none", 'stroke="#CBA25D" stroke-width="3" stroke-linecap="round" fill="none"') },
  // ลิง: แผ่นหน้าสีอ่อนรูปหัวใจ + ปากกระบอกชัด + รูจมูก 2 จุด (จุดจำสปีชีส์)
  monkey: { fur: "#B08968", ears: C(-23, -6, 8.5, "#B08968") + C(23, -6, 8.5, "#B08968") + C(-23, -6, 4.5, "#E8CDB0") + C(23, -6, 4.5, "#E8CDB0"),
    face: P("M-18,-6 q0,-16 18,-14 q18,-2 18,14 q0,20 -18,20 q-18,0 -18,-20 z", "#E8CDB0"),
    muzzle: E(0, 9, 10, 7, "#DDBF9E") + C(-2.8, 7.5, 1.1, "#8C6B4F") + C(2.8, 7.5, 1.1, "#8C6B4F"),
    tail: P("M14,-2 q18,-2 14,-16 q10,14 -6,24 q-6,3 -8,-8", "none", 'stroke="#B08968" stroke-width="4.5" stroke-linecap="round" fill="none"') },
  buffalo: { fur: "#8C8C99", ears: E(-22, -12, 6, 9, "#7E7E8C", 'transform="rotate(-20 -22 -12)"') + E(22, -12, 6, 9, "#7E7E8C", 'transform="rotate(20 22 -12)"'),
    horns: P("M-12,-20 q-10,-8 -18,-4 q6,1 8,6 q4,4 10,-2 z", "#D9D3C3") + P("M12,-20 q10,-8 18,-4 q-6,1 -8,6 q-4,4 -10,-2 z", "#D9D3C3"),
    muzzle: E(0, 8, 9, 6.5, "#B8B8C4") + C(0, 4, 3.2, "#4A4A57"), tail: P("M14,-2 q6,4 2,12", "none", 'stroke="#7E7E8C" stroke-width="4" stroke-linecap="round" fill="none"') },
  hippo: { fur: "#9B8FB5", ears: C(-17, -19, 4.5, "#8B7FA5") + C(17, -19, 4.5, "#8B7FA5"),
    muzzle: E(0, 8, 13, 8.5, "#B0A4C9") + C(-4.5, 7, 1.6, "#6B5F85") + C(4.5, 7, 1.6, "#6B5F85") + C(0, 16, 2.6, "#8B7FA5"), tail: P("M12,-2 q7,1 6,-6", "none", 'stroke="#8B7FA5" stroke-width="4" stroke-linecap="round" fill="none"') },
  duck: { fur: "#F7F3E8", bill: E(0, 8, 9, 5, "#E8933E") + E(0, 11, 6, 3, "#D97F2E"),
    hair: P("M-4,-24 q4,-6 8,-2 q-3,1 -4,4 z", "#E8DFC9"), tail: P("M12,-4 q7,-4 5,-9 q-4,3 -8,6 z", "#E8DFC9") },
  hen: { fur: "#F2E3D0", comb: C(-4,-25,3.5,"#E15A4E")+C(1,-27,3.5,"#E15A4E")+C(6,-25,3.5,"#E15A4E"),
    beak: P("M-4,6 L4,6 L0,11 Z", "#E8933E") + C(0, 13, 1.8, "#D97F2E"), wattle: E(0, 15, 2.4, 3.4, "#E15A4E"),
    wings: E(-18, 4, 7, 11, "#E5D5BC") + E(18, 4, 7, 11, "#E5D5BC"), tail: P("M10,-8 q10,-8 14,-2 q-7,0 -10,5 z", "#D9C5A8") },
  // ไรอั้น: สิงโตสไตล์ Ryan ของ Kakao Friends — ไม่มีแผงคอ ตัวสีน้ำตาลอ่อน หูเล็กมน จมูกแท้งกลม (inference จากดีไซน์อ้างอิง)
  ryan: { fur: "#CBA36E",
    ears: C(-18, -16, 8, "#B8905A") + C(18, -16, 8, "#B8905A") + C(-18, -15, 4.2, "#E3C48F") + C(18, -15, 4.2, "#E3C48F"),
    muzzle: E(0, 9, 10, 7.5, "#EEDCB4") + E(0, 5, 3.4, 2.6, "#5E4433"),
    tail: P("M16,-2 q14,-4 12,-16", "none", 'stroke="#B8905A" stroke-width="5" stroke-linecap="round" fill="none"') + C(29, -19, 4, "#B8905A") },
  // ฮูกา: เด็กผู้ชายตัวน้อย — ผมทรงหม้อแกงสีน้ำตาลเข้ม หน้าตาเป็นจุด แก้มแดง
  boy: { fur: "#F5CFA5",
    ears: C(-24.5, -2, 4.6, "#EFC49B") + C(24.5, -2, 4.6, "#EFC49B"),
    hair: P("M-26,-8 a26,26 0 0 1 52,0 z", "#5E4433") + C(-13, -8, 3.8, "#5E4433") + C(0, -8, 4.1, "#5E4433") + C(13, -8, 3.8, "#5E4433") + P("M-2,-33 q4,-8 11,-6 q-6,1 -7,7 z", "#5E4433") },
  leopard: { fur: "#E8B94B", ears: P("M-19,-13 L-24,-30 L-7,-20 Z", "#E8B94B") + P("M19,-13 L24,-30 L7,-20 Z", "#E8B94B") + C(-17,-21,2.4,"#3E4653")+C(17,-21,2.4,"#3E4653"),
    spots: C(-13,-6,1.7,"#3E4653")+C(8,-10,1.7,"#3E4653")+C(14,2,1.7,"#3E4653")+C(-6,12,1.7,"#3E4653"),
    muzzle: E(0, 8, 8, 5.5, "#FBEED2") + C(0, 4, 2.8, "#5E4433"), tail: P("M16,-4 q16,-2 14,-18 q7,12 -3,22 q-6,5 -11,-4", "none", 'stroke="#E8B94B" stroke-width="6.5" stroke-linecap="round" fill="none"')+C(28,-23,2,"#3E4653") },
};

/* ---------- อุปกรณ์ประดับ ---------- */
const ACC = {
  // แว่น: เลนส์โปร่ง ขอบบาง วางให้ตาอยู่กลางเลนส์ (ไม่บังตา)
  glasses: G(0, -2, 1, false, C(-9, 0, 7, "#FFFFFF", 'fill-opacity="0.22" stroke="#5E4433" stroke-width="1.8"') + C(9, 0, 7, "#FFFFFF", 'fill-opacity="0.22" stroke="#5E4433" stroke-width="1.8"') + P("M-2,0 h4", "none", 'stroke="#5E4433" stroke-width="1.8"')),
  // หมวก/มงกุฎยกให้นั่งบนหัว (หัวกลม r26 → ยอดที่ -26)
  cap: G(0, -5, 1, false, P("M-20,-20 q0,-13 20,-13 q20,0 20,13 z", "#4A7FB5") + P("M-20,-20 h44 q2,0 2,3 h-46 z", "#3D6B99")),
  crown: G(0, -4, 1, false, P("M-13,-18 L-13,-30 L-6,-23 L0,-32 L6,-23 L13,-30 L13,-18 Z", "#F2C64B", 'stroke="#C99B2E" stroke-width="1.5"') + C(0, -24, 2, "#E15A4E")),
  scarf: P("M-14,22 q14,8 28,0 l0,6 q-14,8 -28,0 z", "#E15A4E") + P("M8,26 l8,3 l-2,10 l-8,-3 z", "#C74B40"),
  beret: P("M-16,-19 q2,-13 16,-13 q14,0 16,13 z", "#8C6239") + C(0, -32, 3, "#6B4E37"),
  bowtie: P("M-10,24 L-1,20 L-1,28 Z M10,24 L1,20 L1,28 Z", "#E15A4E") + C(0, 24, 2.6, "#C74B40"),
  vest: P("M-16,8 q0,-6 16,-6 q16,0 16,6 l-2,16 q-14,5 -28,0 z", "#4A7FB5", 'opacity="0.9"'),
  tie: P("M0,18 l4,4 l-4,12 l-4,-12 z", "#4A7FB5"),
};

/* ---------- ของถือ (ยกขึ้นระดับอก ~y-14 ไม่ใช่ข้างเท้า) ---------- */
const ITEM = {
  notebook: G(15, -14, 1.1, false, R(-6, -8, 12, 15, 2, "#F7F3E8", 'stroke="#C9BFA8" stroke-width="1.5"') + P("M-4,-4 h8 M-4,0 h8 M-4,4 h5", "none", 'stroke="#B5AA90" stroke-width="1.2"')),
  magnifier: G(16, -12, 1.1, false, C(0, 0, 6, "#BFE3F2", 'stroke="#8a5a2b" stroke-width="2.5"') + P("M4,4 L10,10", "none", 'stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"')),
  lanternStick: G(16, -14, 1.1, false, P("M0,14 L0,-6", "none", 'stroke="#8a5a2b" stroke-width="2.5"') + R(-5, -14, 10, 11, 2, "#F2B441", 'stroke="#8a5a2b" stroke-width="1.5"') + R(-2.6, -11.5, 5.2, 6, 1.5, "#FFF3C4")),
  megaphone: G(16, -14, 1.1, false, P("M-4,-6 L8,-11 L8,11 L-4,6 Z", "#E15A4E") + R(-8, -5, 5, 10, 1.5, "#C74B40") + P("M11,-8 q5,8 0,16", "none", 'stroke="#F2B441" stroke-width="2" fill="none"')),
  bread: G(15, -13, 1.1, false, P("M-8,2 q0,-8 8,-8 q8,0 8,8 q0,4 -8,4 q-8,0 -8,-4 z", "#E8B96B") + P("M-5,-2 q2,-2 4,0 M0,-3 q2,-2 4,0", "none", 'stroke="#C99B4E" stroke-width="1.2" fill="none"')),
  coin: G(15, -12, 1.1, false, C(0, 0, 5.5, "#F2C64B", 'stroke="#C99B2E" stroke-width="1.5"') + P("M0,-2.5 v5 M-2.5,0 h5", "none", 'stroke="#C99B2E" stroke-width="1.4"')),
  scroll: G(15, -14, 1.1, false, R(-7, -9, 14, 18, 2, "#F7F3E8", 'stroke="#C9BFA8" stroke-width="1.5"') + P("M-4,-4 h8 M-4,0 h8 M-4,4 h6", "none", 'stroke="#B5AA90" stroke-width="1.2"') + P("M-7,-9 q-4,0 -3,4 M7,-9 q4,0 3,4", "none", 'stroke="#C99B2E" stroke-width="2.5" fill="none"')),
  spade: G(16, -14, 1.1, false, P("M0,-10 L0,2", "none", 'stroke="#8a5a2b" stroke-width="2.5"') + P("M-4,2 q4,10 8,0 q0,-4 -4,-4 q-4,0 -4,4 z", "#8E9BAE")),
  flowerpot: G(15, -16, 1.1, false, P("M-5,-2 h10 l-2,9 h-6 z", "#C97B4E") + P("M0,-2 v-6", "none", 'stroke="#7FB77E" stroke-width="1.8"') + C(0, -10, 3, "#E15A4E") + C(-3, -8, 2.2, "#F2B441") + C(3, -8, 2.2, "#F2B441")),
  hammer: G(16, -14, 1.1, false, P("M0,-9 L0,6", "none", 'stroke="#8a5a2b" stroke-width="2.6"') + R(-7, -13, 14, 7, 1.5, "#8E9BAE")),
  feather: G(15, -15, 1.1, false, P("M0,10 q-6,-14 2,-20 q6,-4 4,6 q-1,8 -6,14 z", "#4A7FB5") + P("M0,10 q1,-10 3,-16", "none", 'stroke="#3D6B99" stroke-width="1.2"')),
};

/* ---------- ประกอบตัวละครทั้งตัว ---------- */
// วางที่ (x,y)=กลางฐานเท้า scale s
// ลำดับวาดหน้า: หู/หลัง → หัวกลม → หน้า(แกะ/ลิง) แผงคอ(ม้า) หงอน(ไก่) → แผ่นตา/ลาย/จุด → ปาก-จมูก → ตา → แก้ม → ปาก/จะงอย → งวง(ช้าง) → คิ้ว/หงอน/เขา → ของประดับ
function headParts(sp, d, fur, emo, acc) {
  const beakOrMouth = (sp === "owl" || sp === "hen") ? d.beak : sp === "duck" ? d.bill : mouth(emo);
  // ใส่แว่นหรือเป็นแรคคูน (หน้ากากเข้ม) → ตาโตให้เห็นชัดเหนืออุปกรณ์ / ฮูกใส่แว่นก็ใช้ตาชุดแว่น
  const eyeArt = (sp === "owl" && !acc.includes("glasses")) ? owlEyes() : (acc.includes("glasses") || sp === "raccoon") ? eyes("wow") : eyes(emo);
  return (d.ears || "") + (d.back || "") + C(0, 0, 26, fur) +
    (d.face || "") + (d.mane || "") + (d.comb || "") +
    (d.discs || "") + (d.stripes || "") + (d.spots || "") +
    (d.muzzle || "") + (d.whiskers || "") +
    eyeArt + blush + beakOrMouth +
    (d.trunk || "") + (d.brows || "") +
    (d.crest && !acc.includes("crown") ? d.crest : "") + (d.wattle || "") +
    (d.antlers || "") + (d.hair || "") + (d.horns || "") +
    acc.map(a => ACC[a] || "").join("");
}
function chara({ sp, x = 0, y = 0, s = 1, flip = false, emo = "norm", acc = [], item = null, pal = {} }) {
  const d = SPECIES[sp]; const fur = pal.fur || d.fur; const furD = pal.furD || dark(fur);
  const headG = G(0, -62, 1, false, headParts(sp, d, fur, emo, acc));
  // ตัว
  let body = "";
  if (d.shell === "turtle-body") {
    body = E(0, -18, 20, 15, furD) + E(0, -19, 14, 10, fur) + P("M-6,-19 h12", "none", 'stroke="#6B8F68" stroke-width="1.6"') + R(-12, -12, 24, 10, 5, fur);
  } else if (d.humps) {
    body = E(-9, -20, 10, 9, fur) + E(9, -20, 10, 9, fur) + R(-14, -18, 28, 18, 9, fur);
  } else if (sp === "owl") {
    body = E(0, -16, 17, 16, fur) + (d.belly || "") + (d.wings || "");
  } else if (sp === "boy") {
    // เสื้อสีเขียวมิ้นต์ + กางเกงน้ำตาล + ขาเปลือกข้าวบาล
    body = R(-15, -30, 30, 25, 10, "#57A99A") + R(-15, -12, 30, 8, 4, "#8C6239") + R(-10, -8, 8, 8, 3, fur) + R(2, -8, 8, 8, 3, fur);
  } else if (sp === "sheep") {
    body = E(0, -16, 18, 14, "#EAE0C8") + R(-10, -12, 20, 12, 6, "#F2EAD8");
  } else if (sp === "hen" || sp === "duck") {
    body = E(0, -14, 15, 12, fur) + (d.wings || "");
  } else {
    body = R(-16, -30, 32, 26, 12, fur) + (acc.includes("vest") ? ACC.vest : "") + (acc.includes("scarf") ? ACC.scarf : "");
  }
  const feet = (sp === "duck" ? E(-8, -2, 6, 3, "#E8933E") + E(8, -2, 6, 3, "#E8933E")
    : sp === "hen" ? P("M-9,-2 l6,0 l-1,4 l-6,0 z M3,-2 l6,0 l1,4 l-6,0 z", "#E8933E")
    : sp === "boy" ? E(-9, -2, 7, 4.2, "#5E4433") + E(9, -2, 7, 4.2, "#5E4433")
    : E(-9, -2, 7, 4, furD) + E(9, -2, 7, 4, furD));
  const tailG = d.tail || d.tail2 || "";
  const itemG = item && ITEM[item] ? ITEM[item] : "";
  return G(x, y, s, flip,
    E(0, 2, 28, 7, "#3A2E2A", 'opacity="0.10"') +
    G(0, 0, 1, false, tailG + body + feet) + headG + itemG);
}

/* ---------- ฉากพื้นหลัง ---------- */
const cloud = (x, y, s = 1) => G(x, y, s, false, E(0, 0, 22, 13, "#FFFFFF", 'opacity="0.85"') + E(-18, 4, 14, 9, "#FFFFFF", 'opacity="0.85"') + E(18, 4, 15, 10, "#FFFFFF", 'opacity="0.85"'));
const star = (x, y, r = 1.6) => C(x, y, r, "#FFF3C4", 'opacity="0.9"');
function bg(kind) {
  const W = 800, H = 500;
  let sky = "", extra = "", hills = "";
  const hillsDay = P("M0,340 Q200,290 400,330 T800,320 L800,500 L0,500 Z", "#A9D18E") + P("M0,392 Q250,344 500,382 T800,376 L800,500 L0,500 Z", "#7FB77E");
  const hillsNight = P("M0,340 Q200,290 400,330 T800,320 L800,500 L0,500 Z", "#5E7A5A") + P("M0,392 Q250,344 500,382 T800,376 L800,500 L0,500 Z", "#48604A");
  switch (kind) {
    case "day": sky = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE3F2"/><stop offset="1" stop-color="#EAF4E2"/></linearGradient></defs>` + R(0, 0, W, H, 0, "url(#sky)") + C(700, 80, 34, "#FFE9A8") + cloud(140, 70) + cloud(420, 110, 0.7) + cloud(600, 60, 0.55); hills = hillsDay; break;
    case "sunset": sky = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2B490"/><stop offset="0.6" stop-color="#F8D9A8"/><stop offset="1" stop-color="#FDEBD7"/></linearGradient></defs>` + R(0, 0, W, H, 0, "url(#sky)") + C(400, 300, 44, "#FFCE7A") + cloud(150, 80, 0.8) + cloud(560, 120, 0.6); hills = P("M0,340 Q200,290 400,330 T800,320 L800,500 L0,500 Z", "#C4A265") + P("M0,392 Q250,344 500,382 T800,376 L800,500 L0,500 Z", "#A9884E"); break;
    case "night": sky = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2550"/><stop offset="1" stop-color="#4A4370"/></linearGradient></defs>` + R(0, 0, W, H, 0, "url(#sky)") + C(680, 80, 30, "#F8EDC4") + C(668, 72, 26, "#2A2550") + [ [60,50],[120,120],[220,60],[300,150],[520,70],[600,160],[740,140],[80,200],[760,40],[360,90] ].map(([x,y])=>star(x,y)).join("") + C(180, 240, 2.2, "#F2E394", 'opacity="0.8"') + C(540, 210, 2, "#F2E394", 'opacity="0.8"'); hills = hillsNight; break;
    case "town": sky = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9CBE0"/><stop offset="1" stop-color="#F2E2C4"/></linearGradient></defs>` + R(0, 0, W, H, 0, "url(#sky)") + cloud(160, 60, 0.8) + cloud(560, 90, 0.6);
      { const h = (x, w, c, roof) => R(x, 300, w, 100, 4, c) + P(`M${x - 6},302 L${x + w / 2},258 L${x + w + 6},302 Z`, roof) + R(x + w * 0.2, 322, w * 0.22, 24, 2, "#F7E8C8") + R(x + w * 0.58, 322, w * 0.22, 24, 2, "#F7E8C8") + R(x + w * 0.42, 356, w * 0.18, 44, 2, "#8a5a2b");
        hills = h(60, 90, "#F2D8B4", "#E15A4E") + h(200, 110, "#EAD0AE", "#4A7FB5") + h(360, 90, "#F2D8B4", "#7FB77E") + h(500, 120, "#EAD0AE", "#E8933E") + h(660, 90, "#F2D8B4", "#C77B3A") + P("M0,400 Q250,372 500,392 T800,386 L800,500 L0,500 Z", "#8FBE7F"); } break;
    case "industrial": sky = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9AA3AD"/><stop offset="1" stop-color="#D7CFC4"/></linearGradient></defs>` + R(0, 0, W, H, 0, "url(#sky)");
      { const f = (x, s) => G(x, 392, s, false, R(-60, -110, 120, 110, 4, "#A3AEBF") + R(-60, -130, 120, 24, 4, "#8F9BAE") + R(-40, -170, 20, 44, 2, "#8A96A8") + R(10, -190, 20, 64, 2, "#8A96A8") + P("M-40,-172 q8,-18 3,-34 M-18,-192 q8,-20 2,-38 M30,-192 q-8,-18 -2,-36", "none", 'stroke="#D4DAE2" stroke-width="7" stroke-linecap="round" opacity="0.6" fill="none"') + R(-42, -78, 20, 22, 2, "#F2D8A8") + R(-12, -78, 20, 22, 2, "#F2D8A8") + R(18, -78, 20, 22, 2, "#F2D8A8"));
        hills = f(150, 0.9) + f(420, 1.05) + f(670, 0.85) + R(0, 392, 800, 108, 0, "#9EA897") + R(0, 392, 800, 8, 0, "#8A9484"); } break;
    case "sea": sky = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ED0E8"/><stop offset="1" stop-color="#F2E4C8"/></linearGradient></defs>` + R(0, 0, W, H, 0, "url(#sky)") + C(120, 90, 30, "#FFE9A8") + cloud(520, 70, 0.7);
      hills = P("M0,300 Q200,270 420,300 T800,296 L800,500 L0,500 Z", "#4A9BC4") + P("M0,330 Q400,310 800,330 L800,500 L0,500 Z", "#3D86AC") + [1,2,3,4,5,6].map(i => P(`M${i * 120 - 60},${360 + (i % 2) * 30} q30,8 60,0`, "none", 'stroke="#BFE3F2" stroke-width="4" stroke-linecap="round" opacity="0.5" fill="none"')).join(""); break;
    case "island": sky = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9D8EC"/><stop offset="1" stop-color="#FDF0D8"/></linearGradient></defs>` + R(0, 0, W, H, 0, "url(#sky)") + C(690, 80, 32, "#FFE9A8") + cloud(180, 70, 0.7);
      hills = P("M0,340 Q400,300 800,340 L800,500 L0,500 Z", "#4A9BC4") + P("M0,380 Q400,360 800,380 L800,500 L0,500 Z", "#3D86AC") + P("M280,352 Q400,292 520,352 Q400,368 280,352 Z", "#F2E2B4") + P("M330,300 q-6,-50 18,-64", "none", 'stroke="#8a5a2b" stroke-width="6" fill="none"') + [0, 1, 2, 3, 4].map(i => { const a = -2.6 + i * 0.55; return P(`M340,240 q${Math.cos(a) * 55},${Math.sin(a) * 30 + 14} ${Math.cos(a) * 74},${Math.sin(a) * 40 + 8} q${-Math.cos(a) * 26 - 6},2 ${-Math.cos(a) * 60},${-Math.sin(a) * 34 - 6} z`, "#7FB77E"); }).join(""); break;
    case "mountain": sky = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B4CFE0"/><stop offset="1" stop-color="#EDE4D4"/></linearGradient></defs>` + R(0, 0, W, H, 0, "url(#sky)") + cloud(600, 80, 0.6);
      hills = P("M0,360 L180,180 L320,360 Z", "#8EA8B8") + P("M240,360 L430,140 L620,360 Z", "#9EB4C4") + P("M400,208 L430,140 L460,208 Q430,196 400,208 Z", "#F2F6F8") + P("M540,360 L700,220 L800,360 Z", "#8EA8B8") + P("M0,360 L800,360 L800,500 L0,500 Z", "#7FA065") + P("M0,410 Q400,388 800,410 L800,500 L0,500 Z", "#6B8F58"); break;
    case "desert": sky = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2C88E"/><stop offset="1" stop-color="#FBE8C8"/></linearGradient></defs>` + R(0, 0, W, H, 0, "url(#sky)") + C(650, 100, 36, "#FFDD9A");
      hills = P("M0,350 Q200,300 420,350 T800,344 L800,500 L0,500 Z", "#E8C482") + P("M0,410 Q250,372 520,408 T800,400 L800,500 L0,500 Z", "#D9B06B"); break;
  }
  return sky + hills;
}

/* ---------- อุปกรณ์ฉาก (ฐานของทุกชิ้นวางบนเส้นพื้น y≈392–400 ไม่ลอย) ---------- */
const SCHOOL_INNER = R(-80, -80, 160, 80, 6, "#F2D8B4") + P("M-88,-80 L0,-132 L88,-80 Z", "#E15A4E") + R(-14, -50, 28, 50, 12, "#8a5a2b") + R(-58, -60, 26, 22, 3, "#F7E8C8") + R(32, -60, 26, 22, 3, "#F7E8C8") + C(0, -100, 8, "#F2C64B", 'stroke="#C99B2E" stroke-width="2"');
const DOCK_INNER = R(-100, -8, 10, 48, 3, "#7A5C3A") + R(-5, -8, 10, 48, 3, "#7A5C3A") + R(90, -8, 10, 48, 3, "#7A5C3A") +
  R(-110, -8, 220, 14, 5, "#B08968") + P("M-80,-8 v14 M-50,-8 v14 M-20,-8 v14 M10,-8 v14 M40,-8 v14 M70,-8 v14", "none", 'stroke="#9C7A58" stroke-width="2"') +
  E(-95, 42, 15, 4, "#BFE3F2", 'opacity="0.55"') + E(0, 44, 15, 4, "#BFE3F2", 'opacity="0.55"') + E(95, 42, 15, 4, "#BFE3F2", 'opacity="0.55"');
const BOAT_INNER = P("M-60,0 q60,18 120,0 l-16,22 h-88 z", "#C97B4E") + R(-2, -40, 4, 40, 2, "#8a5a2b") + P("M2,-38 L46,-6 L2,-6 Z", "#F7F3E8") + P("M-2,-30 L-36,-4 L-2,-4 Z", "#F2E4C8");
const PROPS = {
  banyan: G(660, 400, 1, false,
    P("M-18,0 q-6,-90 30,-130 M18,0 q8,-80 -10,-128 M0,2 q0,-70 -40,-100 M0,2 q0,-80 44,-96", "none", 'stroke="#8a5a2b" stroke-width="9" stroke-linecap="round" fill="none"') +
    E(0, -140, 130, 62, "#5E8F5C") + E(-80, -110, 70, 40, "#6FA06A") + E(85, -105, 68, 38, "#6FA06A") + E(0, -165, 80, 38, "#7FB77E") +
    E(0, 6, 90, 10, "#3A2E2A", 'opacity="0.10"')),
  bigTree: G(180, 400, 1, false, R(-10, -110, 20, 112, 8, "#8a5a2b") + E(0, -150, 85, 55, "#5E8F5C") + E(-55, -118, 48, 30, "#6FA06A") + E(58, -115, 46, 30, "#6FA06A") + E(0, 6, 60, 8, "#3A2E2A", 'opacity="0.10"')),
  fence: P("M250,388 L250,318 M290,388 L290,318 M330,388 L330,318 M370,388 L370,318 M410,388 L410,318 M450,388 L450,318 M490,388 L490,318 M530,388 L530,318", "none", 'stroke="#B08968" stroke-width="9" stroke-linecap="round"') + R(240, 330, 300, 9, 4, "#C9A26E") + R(240, 360, 300, 9, 4, "#C9A26E"),
  silverGate: P("M400,392 L400,300 M400,300 q-40,10 -52,40 M400,300 q40,10 52,40", "none", 'stroke="#B9C4CF" stroke-width="10" stroke-linecap="round"') + C(400, 296, 14, "#D9E2EA", 'stroke="#B9C4CF" stroke-width="3"') + C(400, 296, 5, "#F2C64B"),
  smallHouses: ((x0) => { let s = ""; for (let i = 0; i < 3; i++) { const x = x0 + i * 90; s += R(x, 330, 64, 58, 4, i % 2 ? "#F2D8B4" : "#EAD0AE") + P(`M${x - 6},332 L${x + 32},300 L${x + 70},332 Z`, i === 1 ? "#E15A4E" : "#C77B3A") + R(x + 12, 344, 14, 14, 2, "#F7E8C8"); } return G(0, 0, 1, false, s); })(470),
  tinyHousesEast: ((x0) => { let s = ""; for (let i = 0; i < 3; i++) { const x = x0 + i * 80; s += R(x, 344, 52, 46, 4, "#D9CBB4") + P(`M${x - 5},346 L${x + 26},320 L${x + 57},346 Z`, "#8B8378") + R(x + 10, 354, 12, 12, 2, "#C4B49A"); } return G(0, 0, 1, false, s); })(120),
  banner: G(400, 330, 1, false, P("M0,-70 v140", "none", 'stroke="#8a5a2b" stroke-width="6"') + P("M4,-40 L86,-28 L70,6 L4,-6 Z", "#E15A4E") + P("M14,-34 L74,-24 M16,-22 L70,-13", "none", 'stroke="#F7E8C8" stroke-width="3"')),
  board: G(400, 398, 1, false, R(-70, -24, 8, 24, 3, "#8a5a2b") + R(62, -24, 8, 24, 3, "#8a5a2b") + R(-90, -108, 180, 84, 8, "#F7EBD3", 'stroke="#B08968" stroke-width="5"') + R(-90, -108, 180, 20, 8, "#B08968") + P("M-60,-68 h70 M-60,-50 h100 M-60,-32 h46", "none", 'stroke="#C9A26E" stroke-width="5" stroke-linecap="round"')),
  chart: G(400, 398, 1, false, R(-70, -24, 8, 24, 3, "#8a5a2b") + R(62, -24, 8, 24, 3, "#8a5a2b") + R(-86, -124, 172, 100, 8, "#FDF8EC", 'stroke="#B08968" stroke-width="5"') + R(-64, -72, 16, 34, 2, "#E15A4E") + R(-34, -88, 16, 50, 2, "#F2B441") + R(-4, -66, 16, 28, 2, "#E15A4E") + R(26, -100, 16, 62, 2, "#7FB77E") + P("M-64,-98 q40,-14 90,-24", "none", 'stroke="#4A7FB5" stroke-width="4" stroke-dasharray="6 5" fill="none"')),
  boats: G(180, 420, 1, false, BOAT_INNER) + G(620, 430, 0.8, false, P("M-60,0 q60,18 120,0 l-16,22 h-88 z", "#8F6B4E") + R(-2, -36, 4, 36, 2, "#8a5a2b") + P("M2,-34 L40,-6 L2,-6 Z", "#EAD9B4")),
  boat1: G(180, 420, 1, false, BOAT_INNER),
  dock: G(560, 402, 1, false, DOCK_INNER),
  dockIsland: G(640, 376, 0.85, false, DOCK_INNER),
  bigShip: G(430, 400, 1.25, false, P("M-95,0 q95,26 190,0 l-22,34 h-146 z", "#5E4433") + R(-2, -78, 5, 78, 2, "#8a5a2b") + P("M5,-74 L70,-12 L5,-12 Z", "#EFE6D2") + P("M-5,-62 L-58,-12 L-5,-12 Z", "#E2D6BC") + R(-40, -34, 30, 22, 3, "#4A7FB5") + C(30, -46, 7, "#E15A4E")),
  gate: G(400, 396, 1, false, R(-70, -120, 16, 120, 4, "#8a5a2b") + R(54, -120, 16, 120, 4, "#8a5a2b") + P("M-76,-120 Q0,-170 76,-120 L76,-96 Q0,-146 -76,-96 Z", "#B08968") + C(0, -134, 10, "#F2C64B", 'stroke="#C99B2E" stroke-width="2"')),
  loom: G(300, 396, 1, false, R(-56, -80, 10, 80, 3, "#8a5a2b") + R(46, -80, 10, 80, 3, "#8a5a2b") + R(-56, -84, 112, 12, 4, "#8a5a2b") + P("M-44,-70 h88 M-44,-56 h88 M-44,-42 h88", "none", 'stroke="#E8933E" stroke-width="4"') + P("M-44,-70 q22,14 0,28 M0,-70 q22,14 0,28 M44,-70 q-22,14 0,28", "none", 'stroke="#F2C64B" stroke-width="4" fill="none"')),
  cloth: G(360, 376, 1, false, R(-70, -50, 140, 76, 6, "#F2C64B") + P("M-70,-30 h140 M-70,-10 h140", "none", 'stroke="#E8933E" stroke-width="5"') + P("M-40,-50 v76 M0,-50 v76 M40,-50 v76", "none", 'stroke="#E15A4E" stroke-width="5"')),
  castle: G(560, 394, 1, false, R(-80, -120, 160, 120, 6, "#B8B2A4") + R(-98, -150, 40, 150, 6, "#A8A294") + R(58, -150, 40, 150, 6, "#A8A294") + P("M-98,-150 h40 l-8,-18 h-24 z M58,-150 h40 l-8,-18 h-24 z", "#8B8578") + R(-18, -60, 36, 60, 16, "#6B655A")),
  throne: G(400, 394, 1.15, false, R(-52, -130, 104, 130, 10, "#8a5a2b") + R(-64, -150, 128, 26, 8, "#C97B4E") + R(-64, -36, 128, 36, 8, "#8a5a2b") + C(0, -160, 12, "#F2C64B", 'stroke="#C99B2E" stroke-width="2"') + R(-42, -110, 20, 26, 6, "#C97B4E") + R(22, -110, 20, 26, 6, "#C97B4E")),
  riverBridge: P("M0,430 Q400,398 800,430 L800,470 Q400,442 0,470 Z", "#4A9BC4") + P("M300,412 h200 M310,424 h180", "none", 'stroke="#BFE3F2" stroke-width="4" opacity="0.6"'),
  breadQueue: G(240, 400, 1, false, R(-46, -60, 92, 60, 8, "#E8B96B", 'stroke="#C99B4E" stroke-width="3"') + P("M-32,-60 q32,-26 64,0", "none", 'stroke="#C97B4E" stroke-width="4" fill="none"') + R(-40, -26, 80, 26, 5, "#F2D8A8") + P("M-20,4 h40", "none", 'stroke="#8a5a2b" stroke-width="5"')),
  moneyPile: G(600, 420, 1, false, [0,1,2,3,4,5].map(i=>R(-52+i*3, -14-i*10, 74, 18, 3, i%2?"#7FB77E":"#6FA065", 'stroke="#5E8F5C" stroke-width="1.5"')).join("") + C(-14, -70, 9, "#F2C64B", 'stroke="#C99B2E" stroke-width="2"')),
  school: G(600, 396, 1, false, SCHOOL_INNER),
  schoolIsland: G(400, 352, 0.72, false, SCHOOL_INNER),
  press: G(300, 390, 1, false, R(-50, -70, 100, 70, 8, "#8E9BAE") + R(-36, -40, 72, 22, 4, "#6B7684") + R(-10, -96, 20, 30, 3, "#7B8798") + P("M-30,-70 v70 M30,-70 v70", "none", 'stroke="#6B7684" stroke-width="6"') + R(-44, -10, 88, 12, 4, "#F7F3E8")),
  paper: ((x,y)=>G(x,y,1,false,P("M0,-22 q14,10 24,0 q-4,16 -12,18 q-10,-2 -12,-18 z","#F7F3E8")+P("M6,-14 l14,14 M12,-8 l7,7","none",'stroke="#B5AA90" stroke-width="1.5"')))(420,400),
  // ลายเซ็นมุมซ้ายล่าง: โคมไฟติดหลักปักบนพื้น (ไม่ลอย)
  lantern: G(52, 446, 1, false, E(0, 2, 14, 5, "#3A2E2A", 'opacity="0.10"') + P("M0,-2 v-16", "none", 'stroke="#8a5a2b" stroke-width="3"') + C(0, -36, 24, "#F8C64B", 'opacity="0.22"') + P("M-8,-48 a8,8 0 0 1 16,0", "none", 'stroke="#8a5a2b" stroke-width="2" fill="none"') + R(-8, -48, 16, 20, 4, "#F2B441", 'stroke="#8a5a2b" stroke-width="2"') + R(-5, -43, 10, 12, 2, "#FFF3C4")),
  hangLantern: G(400, 180, 1, false, P("M0,0 v22", "none", 'stroke="#8a5a2b" stroke-width="2"') + C(0, 40, 34, "#F8C64B", 'opacity="0.30"') + R(-11, 22, 22, 26, 5, "#F2B441", 'stroke="#8a5a2b" stroke-width="2"') + R(-7, 28, 14, 15, 3, "#FFF3C4")),
  campfire: G(400, 420, 1, false, P("M-16,6 L16,-4 M-16,-4 L16,6", "none", 'stroke="#8a5a2b" stroke-width="6" stroke-linecap="round"') + P("M0,-6 q-12,-18 0,-32 q12,14 0,32 z", "#E8933E") + P("M0,-10 q-6,-10 0,-20 q6,10 0,20 z", "#F2C64B")),
  signboard: ((t1="БЕЗ")=>""), // placeholder unused
  railTrack: P("M0,470 L800,430 M0,430 L800,470", "none", 'stroke="#8a5a2b" stroke-width="5"') + [0,1,2,3,4,5,6,7,8].map(i=>P(`M${i*95},476 L${i*95+22},424`, "none", 'stroke="#B08968" stroke-width="7"')).join(""),
  nightWindow: ((x, y) => G(x, y, 1, false, R(-30, -40, 60, 80, 6, "#5E5A78", 'stroke="#8a5a2b" stroke-width="4"') + R(-22, -32, 44, 64, 4, "#F2C64B", 'opacity="0.9"')))(660, 340),
  fogWave: P("M0,300 q100,-24 200,0 t200,0 t200,0 t200,0 v40 q-100,20 -200,0 t-200,0 t-200,0 t-200,0 z", "#D9DCE4", 'opacity="0.45"'),
  diamond: G(0, 0, 1, false, P("M0,-16 L14,-4 L0,16 L-14,-4 Z", "#7FD8E8", 'stroke="#4AB8CC" stroke-width="2"') + P("M0,-16 L0,16 M-14,-4 h28", "none", 'stroke="#BFF0F6" stroke-width="1.5"')),
  busStop: G(240, 398, 1, false, R(-6, -44, 8, 44, 3, "#8a5a2b") + R(-40, -84, 80, 44, 4, "#F7EBD3", 'stroke="#B08968" stroke-width="3"') + R(-50, -98, 100, 14, 4, "#E15A4E") +
    R(-22, -78, 44, 16, 4, "#4A7FB5") + R(-16, -74, 9, 7, 1.5, "#EAF4FF") + R(-3, -74, 9, 7, 1.5, "#EAF4FF") + R(10, -74, 7, 7, 1.5, "#EAF4FF") + C(-11, -60, 3.5, "#3A2E2A") + C(11, -60, 3.5, "#3A2E2A")),
  sapling: G(400, 408, 1, false, P("M0,0 v-34", "none", 'stroke="#7A5C3A" stroke-width="5" stroke-linecap="round"') + E(-11, -40, 12, 9, "#7FB77E") + E(11, -40, 12, 9, "#7FB77E") + E(0, -48, 11, 9, "#8FCB8A") + P("M-16,0 h32 v6 h-32 z", "#C97B4E")),
};

/* ---------- roster ตัวละคร ---------- */
// [id, species, palette-override?, default acc/items]
const ROSTER = {
  dan:   { sp: "owl",      acc: ["glasses", "scarf"] },
  jem:   { sp: "elephant", acc: ["cap"] },
  rian:  { sp: "ryan",     acc: [], item: "magnifier" },
  huka:  { sp: "boy",      acc: [] },
  moji:  { sp: "dog",      acc: [] },
  timmy: { sp: "rabbit" },
  pippo: { sp: "pig" },
  max:   { sp: "wolf",     acc: ["cap"] },
  mali:  { sp: "mouse",    pal: { fur: "#D9B98C" } },
  ben:   { sp: "squirrel" },
  goldo: { sp: "lizard",   pal: { fur: "#C9A94B" }, acc: ["crown"] },
  otto:  { sp: "beaver",   acc: ["glasses"] },
  freeda:{ sp: "hedgehog", pal: { fur: "#E8D8C4" } },
  noah:  { sp: "deer" },
  baron: { sp: "goat",     acc: ["beret"] },
  maxim: { sp: "bear",     pal: { fur: "#8E9BAE" }, acc: ["cap"] },
  yena:  { sp: "cat",      pal: { fur: "#D98A94" } },
  boris: { sp: "turtle",   acc: ["glasses"] },
  marco: { sp: "otter",    acc: ["scarf"] },
  eldercat: { sp: "cat", pal: { fur: "#B8AEC4" }, acc: ["glasses"] },
  john:  { sp: "wolf",     acc: ["crown"] },
  will:  { sp: "raccoon" || "cat", pal: { fur: "#B8AEC4" } },
  franz: { sp: "tiger",    acc: ["crown"] },
  seb:   { sp: "horse",    pal: { fur: "#C98F5E" } },
  kalum: { sp: "sheep",    acc: ["scarf"] },
  leela: { sp: "rabbit",   pal: { fur: "#E8D8A8" }, acc: ["bowtie"] },
  anchormeow: { sp: "cat", pal: { fur: "#4E6B8C" }, acc: ["cap"] },
  tommy: { sp: "dog",      pal: { fur: "#E8E0D0" } },
  pasha: { sp: "camel",    acc: ["cap"] },
  matsu: { sp: "monkey",   acc: ["beret"] },
  sam:   { sp: "raccoon" || "mouse", pal: { fur: "#C4B49A" } },
  frank: { sp: "buffalo",  pal: { fur: "#9A9BAC" }, acc: ["tie"] },
  jojo:  { sp: "monkey",   pal: { fur: "#C49A6B" }, acc: ["bowtie"] },
  cleo:  { sp: "mouse",    pal: { fur: "#A8B8D8" } },
  eva:   { sp: "turtle",   pal: { fur: "#B8C4A8" }, acc: ["glasses"] },
  seretse: { sp: "leopard", acc: ["glasses"] },
  rosa:  { sp: "hen",      acc: ["scarf"] },
  farmer: { sp: "goat",    pal: { fur: "#D9CBB4" }, acc: ["beret"] },
  sailor: { sp: "duck",    acc: ["cap"] },
  miner: { sp: "hippo",    acc: ["cap"] },
};
// แก้ species ที่ยังอ้างชื่อไม่ตรง
ROSTER.will = { sp: "raccoon", pal: { fur: "#B8AEC4" } };
ROSTER.sam = { sp: "raccoon", pal: { fur: "#C4B49A" }, acc: ["beret"] };
// เพิ่ม raccoon ให้ SPECIES (ลืมไว้)
SPECIES.raccoon = { fur: "#B8AEC4",
  ears: P("M-17,-16 L-22,-30 L-8,-21 Z", "#B8AEC4") + P("M17,-16 L22,-30 L8,-21 Z", "#B8AEC4"),
  mask: P("M-16,-8 q7,-8 14,0 q8,8 14,0 q2,12 -14,10 q-16,2 -14,-10 z", "#6E6A84", 'opacity="0.75"'),
  muzzle: E(0, 8, 8, 6, "#E5DCC9") + C(0, 4, 2.8, "#4E4658"),
  tail: P("M14,-4 q18,-4 15,-20 q9,14 -4,26 q-6,4 -11,-2", "none", 'stroke="#B8AEC4" stroke-width="7" stroke-linecap="round" fill="none"') + P("M16,-6 q10,0 12,-8 q3,7 -4,11", "#5E5A6E") };
// ใส่ mask กลับเข้า headIn ของ raccoon ผ่าน discs slot
const _origDiscsRaccoon = SPECIES.raccoon.mask;

function actor(id, opt = {}) {
  const r = ROSTER[id] || ROSTER.dan;
  const sp = r.sp === "raccoon" ? "raccoon" : r.sp;
  const d = SPECIES[sp];
  // raccoon: ใส่ mask ผ่าน discs slot ชั่วคราว
  const saveDiscs = d.discs; if (sp === "raccoon") d.discs = _origDiscsRaccoon + (saveDiscs || "");
  const g = chara({ sp, x: opt.x || 0, y: opt.y || 0, s: opt.s || 1, flip: !!opt.flip, emo: opt.emo || "norm",
    acc: opt.acc !== undefined ? opt.acc : (r.acc || []), item: opt.item !== undefined ? opt.item : (r.item || null), pal: { ...(r.pal || {}), ...(opt.pal || {}) } });
  if (sp === "raccoon") d.discs = saveDiscs;
  return g;
}

/* ---------- ประกอบภาพเต็ม ---------- */
function scene({ bg: bgk = "day", chars = [], props = [], above = [] }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">` +
    bg(bgk) +
    props.map(p => PROPS[p] || "").join("") +
    chars.map(c => actor(c.id, c)).join("") +
    above.join("") +
    PROPS.lantern +
    `</svg>`;
}

/* ---------- นิยามฉากทั้ง 45 ตอน + ปก ---------- */
const S = {
  "1-1": { bg: "day", props: ["bigTree"], chars: [
    { id: "timmy", x: 300, y: 412, s: 1, emo: "happy" },
    { id: "pippo", x: 470, y: 415, s: 1, emo: "happy", flip: true },
    { id: "rian", x: 600, y: 420, s: 0.9, emo: "norm" },
    { id: "huka", x: 690, y: 428, s: 0.72, emo: "sleepy" } ] },
  "1-2": { bg: "sunset", props: ["fence", "silverGate"], chars: [
    { id: "max", x: 560, y: 408, s: 1.05, emo: "norm", item: "scroll" },
    { id: "timmy", x: 300, y: 415, s: 1, emo: "sad" },
    { id: "pippo", x: 200, y: 420, s: 1, emo: "wow" } ] },
  "1-3": { bg: "day", props: ["smallHouses", "tinyHousesEast"], chars: [
    { id: "timmy", x: 620, y: 418, s: 1, emo: "happy", item: "bread" },
    { id: "max", x: 160, y: 420, s: 1, emo: "norm", flip: true },
    { id: "pippo", x: 240, y: 426, s: 0.85, emo: "sad" } ] },
  "2-1": { bg: "mountain", props: ["board"], chars: [
    { id: "rian", x: 400, y: 420, s: 1, emo: "norm", item: "magnifier" },
    { id: "dan", x: 560, y: 415, s: 1.05, acc: ["glasses", "scarf"] },
    { id: "jem", x: 250, y: 420, s: 1.05, emo: "happy", flip: true } ] },
  "2-2": { bg: "day", props: ["banner"], chars: [
    { id: "rian", x: 300, y: 420, s: 1, emo: "wow" },
    { id: "baron", x: 520, y: 418, s: 1, emo: "norm", flip: true },
    { id: "huka", x: 630, y: 428, s: 0.72, emo: "sleepy" } ] },
  "2-3": { bg: "night", props: ["campfire"], chars: [
    { id: "rian", x: 340, y: 420, s: 1, emo: "norm", item: "notebook" },
    { id: "dan", x: 470, y: 415, s: 1.05 },
    { id: "moji", x: 250, y: 425, s: 0.85, emo: "happy" },
    { id: "huka", x: 560, y: 430, s: 0.72, emo: "sleepy" } ] },
  "3-1": { bg: "day", props: ["bigTree"], chars: [
    { id: "mali", x: 330, y: 420, s: 0.95, emo: "happy", item: "bread" },
    { id: "ben", x: 480, y: 415, s: 1, emo: "happy", flip: true, item: "notebook" },
    { id: "freeda", x: 600, y: 425, s: 0.85, emo: "norm" } ] },
  "3-2": { bg: "sunset", props: ["fence", "silverGate"], chars: [
    { id: "goldo", x: 580, y: 405, s: 1.15, emo: "norm", item: "coin" },
    { id: "otto", x: 300, y: 418, s: 1, emo: "sad", flip: true },
    { id: "mali", x: 200, y: 424, s: 0.9, emo: "sad" } ] },
  "3-3": { bg: "island", props: [], chars: [   // ยืนบนหาดทราย (x 300–500, y≈352)
    { id: "mali", x: 400, y: 354, s: 0.85, emo: "happy", item: "notebook" },
    { id: "ben", x: 480, y: 356, s: 0.85, emo: "happy", flip: true },
    { id: "freeda", x: 320, y: 358, s: 0.78, emo: "wow" } ] },
  "4-1": { bg: "day", props: ["riverBridge"], chars: [
    { id: "noah", x: 300, y: 415, s: 1, emo: "happy" },
    { id: "baron", x: 490, y: 418, s: 1, emo: "happy", flip: true },
    { id: "rian", x: 620, y: 424, s: 0.85, emo: "norm" } ] },
  "4-2": { bg: "night", props: ["fogWave"], chars: [
    { id: "noah", x: 400, y: 420, s: 1, emo: "sad" },
    { id: "baron", x: 540, y: 422, s: 1, emo: "sad", flip: true },
    { id: "huka", x: 240, y: 428, s: 0.72, emo: "sleepy" } ] },
  "4-3": { bg: "mountain", props: ["signboard"].slice(0,0), chars: [
    { id: "noah", x: 620, y: 400, s: 1, emo: "happy", item: "notebook" },
    { id: "baron", x: 180, y: 420, s: 1, emo: "sad", flip: true },
    { id: "dan", x: 400, y: 418, s: 1.05 } ] },
  "5-1": { bg: "industrial", props: ["banner"], chars: [
    { id: "maxim", x: 290, y: 416, s: 1.2, emo: "norm", item: "megaphone" },
    { id: "boris", x: 160, y: 428, s: 0.85, emo: "wow", flip: true },
    { id: "yena", x: 580, y: 428, s: 0.85, emo: "norm" } ] },
  "5-2": { bg: "industrial", props: ["chart"], chars: [
    { id: "maxim", x: 600, y: 410, s: 1.2, emo: "happy" },
    { id: "yena", x: 250, y: 424, s: 0.85, emo: "sad", flip: true, item: "bread" },
    { id: "boris", x: 160, y: 428, s: 0.85, emo: "sad" } ] },
  "5-3": { bg: "sunset", props: ["railTrack"], chars: [
    { id: "boris", x: 300, y: 420, s: 0.95, emo: "norm", item: "notebook" },
    { id: "yena", x: 460, y: 424, s: 0.85, emo: "norm", flip: true },
    { id: "dan", x: 620, y: 415, s: 1.05 } ] },
  "6-1": { bg: "sea", props: ["boat1", "dock"], chars: [   // ยืนบนท่าเรือ (x 450–670, y≈402)
    { id: "marco", x: 500, y: 402, s: 1, emo: "happy", item: "scroll" },
    { id: "sailor", x: 630, y: 404, s: 0.9, emo: "happy", flip: true },
    { id: "moji", x: 460, y: 406, s: 0.75, emo: "happy" } ] },
  "6-2": { bg: "day", props: ["gate"], chars: [
    { id: "eldercat", x: 560, y: 415, s: 1.05, emo: "norm", flip: true },
    { id: "marco", x: 250, y: 420, s: 1, emo: "sad" },
    { id: "rian", x: 150, y: 426, s: 0.85, emo: "norm" } ] },
  "6-3": { bg: "sea", props: ["boat1", "dock"], chars: [
    { id: "marco", x: 490, y: 402, s: 1, emo: "sad", item: "scroll" },
    { id: "sailor", x: 630, y: 404, s: 0.9, emo: "sad", flip: true },
    { id: "huka", x: 560, y: 406, s: 0.72, emo: "sleepy" } ] },
  "7-1": { bg: "town", props: ["castle"], chars: [
    { id: "john", x: 600, y: 400, s: 1.15, emo: "norm", item: "coin" },
    { id: "will", x: 250, y: 420, s: 1, emo: "sad", flip: true },
    { id: "freeda", x: 160, y: 426, s: 0.85, emo: "sad" } ] },
  "7-2": { bg: "night", props: ["hangLantern"], chars: [
    { id: "john", x: 560, y: 410, s: 1.15, emo: "sad", item: "scroll" },
    { id: "will", x: 300, y: 420, s: 1, emo: "norm" },
    { id: "freeda", x: 400, y: 426, s: 0.85, emo: "wow" },
    { id: "ben", x: 200, y: 424, s: 0.9, emo: "norm" } ] },
  "7-3": { bg: "day", props: ["press"], chars: [
    { id: "will", x: 330, y: 418, s: 1, emo: "happy", item: "feather" },
    { id: "freeda", x: 500, y: 424, s: 0.85, emo: "happy", flip: true },
    { id: "jem", x: 630, y: 415, s: 1.05, emo: "happy" } ] },
  "8-1": { bg: "mountain", props: [], chars: [
    { id: "seb", x: 300, y: 415, s: 1, emo: "happy", item: "scroll" },
    { id: "sailor", x: 480, y: 420, s: 0.9, emo: "happy", flip: true },
    { id: "rian", x: 620, y: 424, s: 0.85, emo: "norm" } ] },
  "8-2": { bg: "mountain", props: ["gate"], chars: [
    { id: "franz", x: 580, y: 405, s: 1.2, emo: "norm" },
    { id: "seb", x: 250, y: 418, s: 1, emo: "sad", flip: true, item: "scroll" },
    { id: "moji", x: 160, y: 426, s: 0.8, emo: "sad" } ] },
  "8-3": { bg: "night", props: ["campfire"], chars: [
    { id: "franz", x: 580, y: 415, s: 1.15, emo: "sad" },
    { id: "dan", x: 330, y: 418, s: 1.05 },
    { id: "rian", x: 460, y: 424, s: 0.85, emo: "norm" } ] },
  "9-1": { bg: "day", props: ["loom", "cloth"], chars: [
    { id: "kalum", x: 200, y: 415, s: 1, emo: "happy" },
    { id: "leela", x: 480, y: 420, s: 0.95, emo: "happy", flip: true, item: "notebook" },
    { id: "ben", x: 600, y: 424, s: 0.85, emo: "happy" } ] },
  "9-2": { bg: "sea", props: ["bigShip", "dock"], chars: [   // เรือเทียบท่า: แกะ+กระต่ายบนดาดฟ้า แมวบนท่า
    { id: "kalum", x: 380, y: 404, s: 0.85, emo: "wow" },
    { id: "leela", x: 470, y: 408, s: 0.78, emo: "wow", flip: true },
    { id: "anchormeow", x: 650, y: 402, s: 1, emo: "norm", flip: true } ] },
  "9-3": { bg: "sunset", props: ["loom"], chars: [
    { id: "kalum", x: 240, y: 418, s: 1, emo: "sad" },
    { id: "leela", x: 380, y: 424, s: 0.9, emo: "sad", flip: true },
    { id: "anchormeow", x: 600, y: 422, s: 1, emo: "norm" } ] },
  "10-1": { bg: "island", props: ["dockIsland"], chars: [
    { id: "tommy", x: 340, y: 354, s: 0.85, emo: "happy", item: "spade" },
    { id: "miner", x: 460, y: 356, s: 0.85, emo: "happy", flip: true },
    { id: "rian", x: 640, y: 376, s: 0.8, emo: "norm" } ] },
  "10-2": { bg: "desert", props: ["railTrack"], chars: [
    { id: "pasha", x: 580, y: 415, s: 1.15, emo: "norm", item: "coin" },
    { id: "sailor", x: 250, y: 425, s: 0.9, emo: "sad", flip: true },
    { id: "moji", x: 170, y: 430, s: 0.8, emo: "sad" } ] },
  "10-3": { bg: "island", props: ["schoolIsland", "dockIsland"], chars: [
    { id: "matsu", x: 300, y: 356, s: 0.8, emo: "happy", item: "notebook" },
    { id: "matsu", x: 500, y: 358, s: 0.75, emo: "happy", flip: true, acc: ["cap"] },
    { id: "dan", x: 640, y: 376, s: 0.9, emo: "happy" } ] },
  "11-1": { bg: "night", props: ["press", "nightWindow"], chars: [
    { id: "sam", x: 250, y: 418, s: 1, emo: "wow", item: "feather" },
    { id: "miner", x: 420, y: 420, s: 1, emo: "norm", flip: true },
    { id: "leela", x: 540, y: 426, s: 0.85, emo: "wow" } ] },
  "11-2": { bg: "day", props: ["board"], chars: [
    { id: "frank", x: 560, y: 410, s: 1.2, emo: "sad" },
    { id: "sam", x: 260, y: 420, s: 1, emo: "happy", flip: true },
    { id: "miner", x: 380, y: 424, s: 0.95, emo: "happy" } ] },
  "11-3": { bg: "day", props: ["banner"], chars: [
    { id: "sam", x: 280, y: 420, s: 1, emo: "happy", item: "scroll" },
    { id: "frank", x: 520, y: 418, s: 1.15, emo: "norm", flip: true, acc: [] },
    { id: "rian", x: 640, y: 426, s: 0.85, emo: "happy" } ] },
  "12-1": { bg: "town", props: ["riverBridge"], chars: [
    { id: "jojo", x: 300, y: 420, s: 0.95, emo: "happy" },
    { id: "franz", x: 520, y: 418, s: 1.1, emo: "norm", flip: true, acc: ["cap"] },
    { id: "huka", x: 630, y: 430, s: 0.72, emo: "sleepy" } ] },
  "12-2": { bg: "town", props: ["throne"], chars: [
    { id: "franz", x: 400, y: 398, s: 1.1, emo: "norm", acc: [] },
    { id: "jojo", x: 590, y: 424, s: 0.95, emo: "wow", flip: true },
    { id: "moji", x: 200, y: 428, s: 0.8, emo: "sad" } ] },
  "12-3": { bg: "night", props: ["throne"], chars: [
    { id: "jojo", x: 400, y: 400, s: 0.95, emo: "sad", acc: ["beret"] },
    { id: "dan", x: 230, y: 420, s: 1.05 },
    { id: "huka", x: 600, y: 428, s: 0.72, emo: "sleepy" } ] },
  "13-1": { bg: "town", props: ["breadQueue"], chars: [
    { id: "cleo", x: 180, y: 426, s: 0.85, emo: "sad" },
    { id: "eva", x: 320, y: 424, s: 0.9, emo: "sad" },
    { id: "baron", x: 420, y: 420, s: 0.95, emo: "norm", flip: true, acc: ["cap"] } ] },
  "13-2": { bg: "day", props: ["moneyPile"], chars: [
    { id: "miner", x: 300, y: 422, s: 1, emo: "sad" },
    { id: "eva", x: 450, y: 424, s: 0.9, emo: "wow", flip: true },
    { id: "rian", x: 160, y: 426, s: 0.85, emo: "norm" } ] },
  "13-3": { bg: "sunset", props: ["smallHouses"], chars: [
    { id: "eva", x: 300, y: 418, s: 0.95, emo: "sad", item: "notebook" },
    { id: "sailor", x: 520, y: 424, s: 0.9, emo: "sad", flip: true },
    { id: "dan", x: 640, y: 415, s: 1.05 } ] },
  "14-1": { bg: "desert", props: ["school"], chars: [
    { id: "seretse", x: 300, y: 412, s: 1.05, emo: "happy" },
    { id: "miner", x: 500, y: 420, s: 0.95, emo: "happy", flip: true, item: "notebook" },
    { id: "rian", x: 630, y: 426, s: 0.85, emo: "happy" } ] },
  "14-2": { bg: "day", props: ["busStop"], chars: [
    { id: "rosa", x: 300, y: 418, s: 1, emo: "norm" },
    { id: "frank", x: 520, y: 418, s: 1.15, emo: "sad", flip: true },
    { id: "leela", x: 180, y: 424, s: 0.85, emo: "wow" } ] },
  "14-3": { bg: "night", props: ["campfire", "bigTree"], chars: [
    { id: "farmer", x: 260, y: 420, s: 1 },
    { id: "farmer", x: 500, y: 422, s: 0.95, flip: true, acc: ["cap"] },
    { id: "eva", x: 620, y: 426, s: 0.9, emo: "happy", acc: [] },
    { id: "moji", x: 160, y: 430, s: 0.8, emo: "happy" } ] },
  "15-1": { bg: "night", props: ["banyan", "hangLantern"], chars: [
    { id: "dan", x: 280, y: 415, s: 1.05 },
    { id: "jem", x: 480, y: 415, s: 1.05, emo: "happy" },
    { id: "rian", x: 360, y: 424, s: 0.85, emo: "norm" },
    { id: "huka", x: 560, y: 430, s: 0.72, emo: "sleepy" },
    { id: "moji", x: 200, y: 428, s: 0.8, emo: "happy" } ] },
  "15-2": { bg: "night", props: ["banyan"], chars: [
    { id: "rian", x: 300, y: 420, s: 0.9, emo: "wow", item: "notebook" },
    { id: "dan", x: 470, y: 415, s: 1.05 },
    { id: "huka", x: 580, y: 430, s: 0.72, emo: "norm" } ] },
  "15-3": { bg: "night", props: ["banyan", "sapling"], chars: [
    { id: "rian", x: 330, y: 422, s: 0.85, emo: "happy", item: "flowerpot" },
    { id: "huka", x: 470, y: 428, s: 0.72, emo: "happy" },
    { id: "dan", x: 200, y: 420, s: 1.05 },
    { id: "jem", x: 580, y: 418, s: 1.05, emo: "happy" },
    { id: "moji", x: 630, y: 428, s: 0.8, emo: "happy" } ] },
};

/* ---------- เขียนไฟล์ ---------- */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "assets");
fs.mkdirSync(path.join(assets, "c"), { recursive: true });
let count = 0;
for (const [key, cfg] of Object.entries(S)) {
  fs.writeFileSync(path.join(assets, `p${key}.svg`), scene(cfg));
  count++;
}
// ปก
fs.writeFileSync(path.join(assets, "cover.svg"), scene({
  bg: "night", props: ["banyan", "hangLantern", "sapling"], chars: [
    { id: "dan", x: 300, y: 400, s: 1.25 },
    { id: "jem", x: 540, y: 400, s: 1.25, emo: "happy" },
    { id: "rian", x: 390, y: 415, s: 1.0, emo: "happy" },
    { id: "huka", x: 480, y: 422, s: 0.9, emo: "happy" },
    { id: "moji", x: 230, y: 420, s: 1.0, emo: "happy" },
  ] }));
// avatar ตัวละคร (หัวเดี่ยว) — ใช้ลำดับวาดเดียวกับฉาก + ชิ้นบอกสปีชีส์ที่หัวเดี่ยวมองไม่เห็น (โหนกอูฐ กระดองเต่า หางกระรอก)
for (const [id, r] of Object.entries(ROSTER)) {
  const d = SPECIES[r.sp]; const saveDiscs = d.discs;
  if (r.sp === "raccoon") d.discs = _origDiscsRaccoon + (saveDiscs || "");
  const fur = r.pal?.fur || d.fur, furD = dark(fur);
  const behind =
    r.sp === "camel" ? E(-15, 27, 11, 9, furD) + E(15, 27, 11, 9, furD) :
    r.sp === "turtle" ? E(0, 30, 34, 15, furD) + E(0, 29, 26, 10, fur) + P("M-12,29 h24", "none", 'stroke="#6B8F68" stroke-width="1.6"') :
    r.sp === "squirrel" ? G(6, 14, 1, false, d.tail) :
    r.sp === "fox" ? G(4, 16, 0.9, false, d.tail) : "";
  const inner = behind + headParts(r.sp, d, fur, "norm", r.acc || []);
  if (r.sp === "raccoon") d.discs = saveDiscs;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-48 -52 96 104">` +
    C(0, 0, 47, "#FDF6E8", 'stroke="#E8D9B8" stroke-width="3"') + G(0, 4, 1.15, false, inner) + `</svg>`;
  fs.writeFileSync(path.join(assets, "c", `${id}.svg`), svg);
  count++;
}
console.log(`สร้างแล้ว ${count} ไฟล์ (45 ตอน + ปก + ${Object.keys(ROSTER).length} avatars) ที่ ${assets}`);
