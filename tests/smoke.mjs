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
const serviceWorker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
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
assert.ok(page.includes("window.AudioContext"), "Missing Web Audio button feedback");
assert.ok(page.includes("lucky_sound_enabled"), "Sound preference must persist on the device");
assert.ok(page.includes('data-sound-toggle="true"'), "Missing accessible sound toggle");
assert.ok(page.includes("speechSynthesis"), "Missing spoken Thai button feedback");
assert.ok(page.includes("SpeechSynthesisUtterance"), "Missing browser speech utterance support");
assert.ok(page.includes('utterance.lang = "th-TH"'), "Spoken feedback must request a Thai voice");
assert.ok(page.includes("THAI_DIGIT_WORDS"), "Result numbers must be pronounced digit by digit");
assert.ok(page.includes("lucky_voice_enabled_v2"), "Voice preference must default independently from old sound settings");
assert.ok(page.includes("interrupt && hasActiveSpeech"), "Speech cancellation must only run for an active queue");
assert.ok(page.includes("speechWatchdogRef"), "Silent speech failures need a visible timeout state");
assert.ok(
  (page.match(/data-speech-handled="true"/g) || []).length >= 9,
  "Prediction, replay, history, and voice-test actions must use one combined utterance"
);
assert.equal((page.match(/onRead=/g) || []).length, 6, "Every prediction result needs a replay button");
assert.ok(page.includes("อ่านเลขออกเสียง"), "Missing visible replay control for result numbers");
assert.ok(page.includes("ทดสอบเสียงภาษาไทย"), "Missing direct Thai voice test");
assert.ok(page.includes("openExternalBrowser"), "LINE links must offer an external-browser speech path");
assert.ok(page.includes("isLineInAppBrowser"), "Missing LINE in-app browser detection");
assert.ok(page.includes("audioContext.resume().then(startTone)"), "Web Audio must start after in-app audio unlock");
assert.ok(page.includes("เหตุผลที่ได้เลขชุดนี้"), "Prediction results must explain why numbers were generated");
assert.ok(
  (page.match(/addNumberExplanation\(/g) || []).length >= 7,
  "All six prediction modes must attach traceable explanations"
);
assert.ok(page.includes(".slice(0, 5)"), "Two-digit guidance must be limited to five sets");
assert.ok(page.includes(".slice(0, 3)"), "Three-digit guidance must be limited to three sets");
assert.ok(css.includes(".tap-burst"), "Missing visual tap effect");
assert.ok(css.includes(".read-result-button"), "Missing replay button styling");
assert.ok(css.includes(".voice-test-button"), "Missing visible speech diagnostic control");
assert.ok(css.includes(".external-browser-button"), "Missing LINE external-browser action styling");
assert.ok(css.includes(".reason-panel"), "Missing number explanation styling");
assert.ok(serviceWorker.includes('ai-hailekded-v2'), "Service worker cache must refresh the LINE-compatible build");
assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"), "Missing reduced-motion support");
assert.equal(manifest.display, "standalone", "PWA should open as a standalone app");
assert.ok(hosting.project_id.startsWith("appgprj_"), "Missing Sites project binding");
assert.ok(viteConfig.includes("cloudflare({"), "Missing Cloudflare Worker build adapter");
assert.equal(wrangler.main, "vinext/server/app-router-entry", "Missing vinext Worker entry");
assert.equal(wrangler.name, "server", "Sites Worker output must use the server target");

console.log("Smoke checks passed: 6 explained prediction modes, LINE speech fallback, sound effects, disclosures, PWA, accessibility, and Worker hosting config.");
