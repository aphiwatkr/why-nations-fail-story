// ai_images.mjs — สร้างภาพประกอบ AI ทั้ง 46 ภาพ (45 ตอน + ปก) จาก tools/prompts.json
// ใช้: OPENAI_API_KEY=sk-... node tools/ai_images.mjs [--force] [--only 1-1,2-3] [--model gpt-image-1]
// เมื่อครบ 46 ภาพ → เขียน js/ai.js (window.WNF_AI = true) reader สลับไปใช้ภาพ AI อัตโนมัติ
// ต้องการแค่ Node 26+ (fetch ในตัว) + sips (macOS) — ไม่มี dependency
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx >= 0 ? args[onlyIdx + 1]?.split(",") : null;
const model = process.env.AI_MODEL || "gpt-image-1";
const size = "1536x1024";

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ ต้องตั้ง OPENAI_API_KEY ก่อน:  export OPENAI_API_KEY=sk-... แล้วรันใหม่");
  process.exit(1);
}

const prompts = JSON.parse(fs.readFileSync(path.join(root, "tools", "prompts.json"), "utf8"));
const outDir = path.join(root, "assets", "ai");
fs.mkdirSync(outDir, { recursive: true });

let ok = 0, skip = 0, fail = 0;
for (const { key, prompt } of prompts) {
  if (only && !only.includes(key)) continue;
  const dest = path.join(outDir, `${key}.jpg`);
  if (fs.existsSync(dest) && !force) { skip++; continue; }
  const tmp = path.join(outDir, `${key}.png`);
  try {
    process.stdout.write(`🖼  ${key} … `);
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, prompt, size, n: 1 }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`API ${res.status}: ${t.slice(0, 300)}`);
    }
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) throw new Error("ไม่ได้รับ b64_json: " + JSON.stringify(data).slice(0, 200));
    fs.writeFileSync(tmp, Buffer.from(b64, "base64"));
    // บีบเป็น jpg (โหลดเร็ว) — กว้าง 1400 พอสำหรับ hero
    execSync(`sips -s format jpeg -s formatOptions 82 --resampleWidth 1400 "${tmp}" --out "${dest}" >/dev/null 2>&1`);
    fs.rmSync(tmp, { force: true });
    ok++;
    console.log("✓");
    await new Promise(r => setTimeout(r, 1500)); // เว้นจังหวะกัน rate limit
  } catch (e) {
    fail++;
    console.log(`✗ ${e.message}`);
  }
}

const made = prompts.filter(p => fs.existsSync(path.join(outDir, `${p.key}.jpg`))).length;
console.log(`\nสรุป: ใหม่ ${ok} · ข้าม ${skip} · พลาด ${fail} · รวมมีแล้ว ${made}/${prompts.length}`);
if (made === prompts.length) {
  fs.writeFileSync(path.join(root, "js", "ai.js"),
    "// สร้างโดย tools/ai_images.mjs — ภาพ AI ครบทุกภาพแล้ว reader ใช้ assets/ai/*.jpg\nwindow.WNF_AI = true;\n");
  console.log("🎉 ครบทุกภาพ — เปิด js/ai.js เป็น true แล้ว (deploy ต่อ: npx wrangler pages deploy _site --project-name=khomkaew)");
} else {
  console.log(`ยังขาด ${prompts.length - made} ภาพ — รันซ้ำอีกรอบจะสร้างเฉพาะที่ขาด`);
}
