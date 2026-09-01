import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/page.jsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const manifest = JSON.parse(
  await readFile(new URL("../public/manifest.json", import.meta.url), "utf8")
);
const hosting = JSON.parse(
  await readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8")
);
const viteConfig = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
const wrangler = JSON.parse(
  (await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"))
    .replace(/^\s*\/\/.*$/gm, "")
);

const requiredMenus = [
  "เลขประจำวัน",
  "เลขความฝัน",
  "เลขเด่น Social",
  "เลขจาก AI",
  "เลขจากวัดดัง",
  "ดวงสมาชิก",
];

for (const label of requiredMenus) {
  assert.ok(page.includes(`label: "${label}"`), `Missing home menu: ${label}`);
}

const menuBlock = page.slice(page.indexOf("const MENU_ITEMS"), page.indexOf("const VIEW_META"));
assert.equal((menuBlock.match(/\n\s+id: "/g) || []).length, 6, "Home must have exactly six menu definitions");
assert.ok(page.includes("เพื่อความบันเทิงและความเชื่อส่วนบุคคล"), "Missing entertainment disclaimer");
assert.ok(page.includes("ไม่ได้ดึงข้อมูลสด"), "Social mode must disclose that data is not live");
assert.ok(page.includes("ไม่สร้างข่าวหรืออ้างชื่อวัดแทนผู้ใช้"), "Temple data must not be presented as invented news");
assert.ok(!page.includes("dangerouslySetInnerHTML"), "Untrusted content must remain React-escaped");
assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"), "Missing reduced-motion support");
assert.equal(manifest.display, "standalone", "PWA should open as a standalone app");
assert.ok(hosting.project_id.startsWith("appgprj_"), "Missing Sites project binding");
assert.ok(viteConfig.includes("cloudflare({"), "Missing Cloudflare Worker build adapter");
assert.equal(wrangler.main, "vinext/server/app-router-entry", "Missing vinext Worker entry");
assert.equal(wrangler.name, "server", "Sites Worker output must use the server target");

console.log("Smoke checks passed: 6 menus, disclosures, PWA, accessibility, and Worker hosting config.");
