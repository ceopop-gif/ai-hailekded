"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SOUND_STORAGE_KEY = "lucky_sound_enabled";
const VOICE_STORAGE_KEY = "lucky_voice_enabled_v2";
const THAI_DIGIT_WORDS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];

const MENU_ITEMS = [
  {
    id: "daily",
    label: "เลขประจำวัน",
    hint: "พลังเลขจากวันที่",
    icon: "📅",
    tone: "violet",
  },
  {
    id: "dream",
    label: "เลขความฝัน",
    hint: "แปลสัญลักษณ์ในฝัน",
    icon: "🌙",
    tone: "indigo",
  },
  {
    id: "social",
    label: "เลขเด่น Social",
    hint: "วิเคราะห์ข้อความกระแส",
    icon: "📈",
    tone: "cyan",
  },
  {
    id: "ai",
    label: "เลขจาก AI",
    hint: "ผสานข้อมูลของคุณ",
    icon: "🧠",
    tone: "pink",
  },
  {
    id: "temple",
    label: "เลขจากวัดดัง",
    hint: "รวมข้อมูลพร้อมแหล่งที่มา",
    icon: "🏯",
    tone: "gold",
  },
  {
    id: "member",
    label: "ดวงสมาชิก",
    hint: "ดวงเฉพาะบุคคล",
    icon: "♈",
    tone: "amber",
  },
];

const VIEW_META = Object.fromEntries(MENU_ITEMS.map((item) => [item.id, item]));

const THAI_DAYS = [
  { name: "วันอาทิตย์", color: "แดง", accent: "#ef4444", digit: 1 },
  { name: "วันจันทร์", color: "เหลือง", accent: "#facc15", digit: 2 },
  { name: "วันอังคาร", color: "ชมพู", accent: "#f472b6", digit: 3 },
  { name: "วันพุธ", color: "เขียว", accent: "#34d399", digit: 4 },
  { name: "วันพฤหัสบดี", color: "ส้ม", accent: "#fb923c", digit: 5 },
  { name: "วันศุกร์", color: "ฟ้า", accent: "#38bdf8", digit: 6 },
  { name: "วันเสาร์", color: "ม่วง", accent: "#a78bfa", digit: 7 },
];

const DREAM_SYMBOLS = [
  { words: ["งู", "พญานาค"], label: "งู / พญานาค", digits: [5, 6, 9] },
  { words: ["น้ำ", "ฝน", "ทะเล", "แม่น้ำ"], label: "น้ำ / ฝน", digits: [2, 7] },
  { words: ["ปลา", "กุ้ง", "สัตว์น้ำ"], label: "ปลา / สัตว์น้ำ", digits: [7, 8] },
  { words: ["เด็ก", "ทารก", "ลูก"], label: "เด็ก / ทารก", digits: [1, 3] },
  { words: ["พระ", "วัด", "เจดีย์"], label: "พระ / วัด", digits: [5, 9] },
  { words: ["รถ", "ขับรถ", "เดินทาง"], label: "รถ / การเดินทาง", digits: [4, 7] },
  { words: ["เงิน", "ทอง", "แหวน", "สร้อย"], label: "เงิน / ทอง", digits: [8, 9] },
  { words: ["บ้าน", "ห้อง", "ประตู"], label: "บ้าน / ที่พัก", digits: [4] },
  { words: ["ไฟ", "เทียน", "แสง"], label: "ไฟ / แสง", digits: [4, 7] },
  { words: ["คนตาย", "ผู้ตาย", "ศพ", "งานศพ"], label: "ผู้ล่วงลับ", digits: [0, 4, 7] },
  { words: ["สุนัข", "หมา"], label: "สุนัข", digits: [4, 6] },
  { words: ["แมว"], label: "แมว", digits: [3, 4] },
  { words: ["นก", "บิน"], label: "นก / การบิน", digits: [1, 6] },
  { words: ["ช้าง"], label: "ช้าง", digits: [9] },
];

const FAVORITE_COLORS = ["ม่วง", "แดง", "ทอง", "เขียว", "ฟ้า", "ชมพู", "ขาว", "ดำ"];
const COLOR_DIGITS = {
  แดง: 1,
  เหลือง: 2,
  ครีม: 2,
  ชมพู: 3,
  เขียว: 4,
  ส้ม: 5,
  น้ำตาล: 5,
  ฟ้า: 6,
  น้ำเงิน: 6,
  ม่วง: 7,
  เทา: 8,
  ดำ: 8,
  ขาว: 9,
  ทอง: 9,
  เงิน: 9,
};

function todayInputValue() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatThaiDate(value) {
  const date = value instanceof Date ? value : new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "ไม่ระบุวันที่";
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function hashText(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFromSeed(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function digitRoot(value) {
  const digits = String(value).match(/\d/g) || [];
  if (!digits.length) return 0;
  let total = digits.reduce((sum, digit) => sum + Number(digit), 0);
  while (total > 9) {
    total = String(total)
      .split("")
      .reduce((sum, digit) => sum + Number(digit), 0);
  }
  return total;
}

function makeNumberSet(seed, preferredDigits = [], preferredSequences = {}) {
  const next = randomFromSeed(seed || 1);
  const digits = [];
  preferredDigits.forEach((digit) => {
    const normalized = Math.abs(Number(digit)) % 10;
    if (Number.isFinite(normalized) && !digits.includes(normalized)) digits.push(normalized);
  });
  let guard = 0;
  while (digits.length < 3 && guard < 60) {
    const digit = Math.floor(next() * 10);
    if (!digits.includes(digit)) digits.push(digit);
    guard += 1;
  }
  const topDigits = digits.slice(0, 3);
  const [a, b, c] = topDigits.map(String);
  const pairCandidates = [`${a}${b}`, `${b}${a}`, `${a}${c}`, `${c}${a}`, `${b}${c}`, `${c}${b}`];
  const tripleCandidates = [`${a}${b}${c}`, `${a}${c}${b}`, `${b}${a}${c}`, `${c}${b}${a}`];
  const pairOffset = Math.floor(next() * pairCandidates.length);
  const tripleOffset = Math.floor(next() * tripleCandidates.length);
  const explicitTwo = (preferredSequences.two || []).map(String).filter((value) => /^\d{2}$/.test(value));
  const explicitThree = (preferredSequences.three || [])
    .map(String)
    .filter((value) => /^\d{3}$/.test(value));
  const two = [
    ...new Set([
      ...explicitTwo,
      ...pairCandidates.slice(pairOffset),
      ...pairCandidates.slice(0, pairOffset),
    ]),
  ].slice(0, 5);
  const three = [
    ...new Set([
      ...explicitThree,
      ...tripleCandidates.slice(tripleOffset),
      ...tripleCandidates.slice(0, tripleOffset),
    ]),
  ].slice(0, 3);
  return { digits: topDigits, two, three };
}

function addNumberExplanation(result, { source, digitReason, evidence = "สูตรจำลอง", limitation = "" }) {
  const featured = result.digits.join(" • ");
  return {
    ...result,
    explanation: {
      source,
      evidence,
      rows: [
        {
          label: `เลขเด่น ${featured}`,
          detail: digitReason,
        },
        {
          label: `เลข 2 ตัว ${result.two.join(", ")}`,
          detail: `คงเลข 2 ตัวที่ปรากฏตรงในข้อมูลก่อน (ถ้ามี) แล้วเติมชุดที่จับคู่จากเลขเด่น ${featured} ด้วยลำดับสูตรจำลองคงที่`,
        },
        {
          label: `เลข 3 ตัว ${result.three.join(", ")}`,
          detail: `คงเลข 3 ตัวที่ปรากฏตรงในข้อมูลก่อน (ถ้ามี) แล้วเติมชุดที่เรียงจากเลขเด่นทั้ง 3 ตัว โดยไม่สร้างเลขทุกแบบ`,
        },
      ],
      limitation,
      speech: digitReason,
    },
  };
}

function dateSignals(dateValue) {
  const parsed = new Date(`${dateValue}T12:00:00`);
  const [year = "", month = "", dayOfMonth = ""] = String(dateValue).split("-");
  return {
    parsed,
    weekday: THAI_DAYS[parsed.getDay()],
    dayText: dayOfMonth,
    monthText: month,
    yearText: year,
    dayDigit: Number(dayOfMonth) % 10,
    monthDigit: Number(month) % 10,
    root: digitRoot(dateValue),
  };
}

function makeMemberNumberResult(profile) {
  const signals = dateSignals(profile.birthDate);
  const colorDigit = COLOR_DIGITS[profile.color] ?? 9;
  const result = makeNumberSet(
    hashText(JSON.stringify(profile)),
    [signals.root, signals.weekday.digit, colorDigit],
    {
      two: [signals.dayText, signals.monthText, signals.yearText.slice(-2)],
      three: [signals.yearText.slice(-3)],
    }
  );
  return addNumberExplanation(result, {
    source: `ใช้วันเกิด สีที่เลือก “${profile.color}” และคำตั้งใจที่สมาชิกกรอกไว้ในอุปกรณ์นี้`,
    digitReason: `เลข ${signals.root} มาจากผลรวมวันเกิดลดเหลือหลักเดียว, เลข ${signals.weekday.digit} มาจาก${signals.weekday.name} และเลข ${colorDigit} มาจากตารางสี-เลขของระบบ`,
    evidence: "ข้อมูลสมาชิก",
    limitation: "วันเกิดและสีเป็นการตีความเชิงความเชื่อ ส่วนคำตั้งใจใช้กำหนดลำดับด้วยสูตรจำลองเท่านั้น",
  });
}

function isLineInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  return /\bLine\//i.test(navigator.userAgent || "");
}

function makeExternalBrowserUrl(value) {
  if (!value) return "";
  const url = new URL(value);
  url.searchParams.set("openExternalBrowser", "1");
  return url.toString();
}

function extractDigitRanking(text) {
  const counts = Array(10).fill(0);
  for (const char of String(text)) {
    if (/\d/.test(char)) counts[Number(char)] += 1;
  }
  return counts
    .map((count, digit) => ({ digit, count }))
    .sort((a, b) => b.count - a.count || a.digit - b.digit);
}

function resultSummary(result) {
  if (!result) return "";
  return `เลขเด่น ${result.digits.join(" • ")} | 2 ตัว ${result.two.join(", ")} | 3 ตัว ${result.three.join(", ")}`;
}

function pronounceDigits(value) {
  return String(value)
    .split("")
    .map((digit) => THAI_DIGIT_WORDS[Number(digit)] ?? digit)
    .join(" ");
}

function resultSpeech(title, result) {
  if (!result) return "";
  const featured = result.digits.map(pronounceDigits).join(", ");
  const twoDigits = result.two.map(pronounceDigits).join(", ");
  const threeDigits = result.three.map(pronounceDigits).join(", ");
  const reason = result.explanation?.speech ? `. เหตุผล ${result.explanation.speech}` : "";
  return `ผล${title}ออกแล้ว เลขเด่น ${featured}. เลขสองตัว ${twoDigits}. และเลขสามตัว ${threeDigits}${reason}`;
}

function buttonSpeechLabel(button) {
  const label =
    button.dataset.speechLabel || button.getAttribute("aria-label") || button.textContent || "";
  return label
    .replace(/[^\p{L}\p{N}\s–-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function speechFailureMessage(code) {
  if (code === "language-unavailable" || code === "voice-unavailable") {
    return "ไม่พบเสียงภาษาไทยในเครื่อง กรุณาเปิดบริการอ่านข้อความเป็นเสียงภาษาไทย";
  }
  if (code === "not-allowed") {
    return "เบราว์เซอร์ยังไม่อนุญาตให้พูด กดปุ่มทดสอบเสียงอีกครั้ง";
  }
  if (code === "audio-busy" || code === "audio-hardware") {
    return "อุปกรณ์เสียงไม่พร้อม กรุณาตรวจระดับเสียงและลองใหม่";
  }
  return "ไม่สามารถเริ่มเสียงพูดได้ กรุณากดทดสอบเสียงอีกครั้ง";
}

function readLocal(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function playTone(audioContext, frequency, startOffset, duration, volume) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const startAt = audioContext.currentTime + startOffset;
  const stopAt = startAt + duration;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.08, stopAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startAt);
  oscillator.stop(stopAt + 0.01);
  oscillator.addEventListener(
    "ended",
    () => {
      oscillator.disconnect();
      gain.disconnect();
    },
    { once: true }
  );
}

function NumberResult({ result, title, note, onSave, onShare, onRead }) {
  if (!result) return null;
  return (
    <section className="result-panel" aria-live="polite">
      <div className="result-heading">
        <div>
          <span className="eyebrow">ผลการวิเคราะห์</span>
          <h3>{title}</h3>
        </div>
        <span className="spark-badge">✦</span>
      </div>

      <div className="digit-block">
        <span className="result-label">เลขเด่น</span>
        <div className="digit-orbs">
          {result.digits.map((digit) => (
            <span className="digit-orb" key={digit}>
              {digit}
            </span>
          ))}
        </div>
      </div>

      <div className="number-groups">
        <div className="number-group">
          <span className="result-label">เลข 2 ตัว</span>
          <div className="number-chips">
            {result.two.map((number) => (
              <span key={number}>{number}</span>
            ))}
          </div>
        </div>
        <div className="number-group">
          <span className="result-label">เลข 3 ตัว</span>
          <div className="number-chips compact">
            {result.three.map((number) => (
              <span key={number}>{number}</span>
            ))}
          </div>
        </div>
      </div>

      {result.explanation ? (
        <section className="reason-panel" aria-label="เหตุผลของเลขที่ได้">
          <div className="reason-heading">
            <div>
              <span className="eyebrow">WHY THESE NUMBERS</span>
              <h4>เหตุผลที่ได้เลขชุดนี้</h4>
            </div>
            <span className="evidence-badge">{result.explanation.evidence}</span>
          </div>
          <p className="reason-source">{result.explanation.source}</p>
          <div className="reason-list">
            {result.explanation.rows.map((row) => (
              <article className="reason-row" key={row.label}>
                <strong>{row.label}</strong>
                <p>{row.detail}</p>
              </article>
            ))}
          </div>
          {result.explanation.limitation ? (
            <p className="reason-limitation">ข้อจำกัด: {result.explanation.limitation}</p>
          ) : null}
        </section>
      ) : null}

      {note ? <p className="result-note">{note}</p> : null}

      {onRead ? (
        <button
          className="read-result-button"
          type="button"
          onClick={onRead}
          aria-label="อ่านเลขออกเสียงอีกครั้ง"
          data-speech-handled="true"
        >
          <span aria-hidden="true">🔊</span>
          อ่านเลขออกเสียง
        </button>
      ) : null}

      <div className="action-row">
        {onSave ? (
          <button className="secondary-button" type="button" onClick={onSave}>
            ♡ บันทึกผล
          </button>
        ) : null}
        {onShare ? (
          <button className="secondary-button" type="button" onClick={onShare}>
            ↗ แชร์
          </button>
        ) : null}
      </div>
    </section>
  );
}

function PageIntro({ icon, title, subtitle }) {
  return (
    <div className="page-intro">
      <span className="page-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <span className="eyebrow">AI ให้เลขเด็ด</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function DailyPage({ saveResult, share, announceResult }) {
  const [date, setDate] = useState(todayInputValue());
  const [result, setResult] = useState(null);

  const analyze = () => {
    const signals = dateSignals(date);
    const day = signals.weekday;
    const seed = hashText(`${date}-${day.name}-daily`);
    const numberSet = makeNumberSet(
      seed,
      [day.digit, signals.dayDigit, signals.monthDigit],
      { two: [signals.dayText, signals.monthText] }
    );
    const nextResult = {
      ...addNumberExplanation(numberSet, {
        source: `ใช้วันที่ ${formatThaiDate(date)} และวันในสัปดาห์เป็นสัญญาณตั้งต้น`,
        digitReason: `เลข ${day.digit} มาจาก${day.name}, เลข ${signals.dayDigit} มาจากหลักหน่วยของวันที่ และเลข ${signals.monthDigit} มาจากหลักหน่วยของเดือน หากมีเลขซ้ำ ระบบจะเติมหลักที่ขาดจากค่าแฮชของวันที่`,
        evidence: "วันที่เลือก",
        limitation: "เป็นการจับคู่เชิงความเชื่อและสูตรจำลอง ไม่ได้เพิ่มโอกาสถูกรางวัล",
      }),
      day,
    };
    setResult(nextResult);
    announceResult("เลขประจำวัน", nextResult, "วิเคราะห์เลขประจำวัน");
  };

  return (
    <>
      <PageIntro
        icon="📅"
        title="เลขประจำวัน"
        subtitle="คำนวณพลังเลขจากวันที่และวันในสัปดาห์"
      />
      <section className="form-card">
        <label className="field-label" htmlFor="daily-date">
          เลือกวันที่ต้องการดู
        </label>
        <input
          id="daily-date"
          className="input-control"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <button
          className="primary-button"
          type="button"
          onClick={analyze}
          disabled={!date}
          data-speech-handled="true"
        >
          ✦ วิเคราะห์เลขประจำวัน
        </button>
      </section>

      {result ? (
        <div className="insight-strip">
          <span className="color-dot" style={{ background: result.day.accent }} />
          <div>
            <strong>{result.day.name}</strong>
            <span>สีเสริมพลังตามความเชื่อ: {result.day.color}</span>
          </div>
          <time>{formatThaiDate(date)}</time>
        </div>
      ) : null}

      <NumberResult
        result={result}
        title={`ชุดเลขของ${result?.day?.name || "วันนี้"}`}
        note="คำนวณจากวันที่ด้วยสูตรจำลอง ไม่ใช่การรับรองผล"
        onSave={
          result
            ? () => saveResult("เลขประจำวัน", result, `${result.day.name} • ${formatThaiDate(date)}`)
            : null
        }
        onShare={result ? () => share("เลขประจำวัน", result) : null}
        onRead={result ? () => announceResult("เลขประจำวัน", result, "อ่านเลขออกเสียง") : null}
      />
    </>
  );
}

function DreamPage({ saveResult, share, announceResult }) {
  const [dream, setDream] = useState("");
  const [result, setResult] = useState(null);
  const [matches, setMatches] = useState([]);

  const analyze = () => {
    const normalized = dream.trim().toLowerCase();
    const found = DREAM_SYMBOLS.filter((symbol) =>
      symbol.words.some((word) => normalized.includes(word))
    );
    const directNumbers = normalized.match(/\d+/g) || [];
    const directDigits = [...new Set(directNumbers.flatMap((number) => number.split("").map(Number)))];
    const preferred = [...directDigits, ...found.flatMap((item) => item.digits)];
    const symbolReason = found
      .map((item) => `${item.label} → ${item.digits.join("/")}`)
      .join(", ");
    const numberSet = makeNumberSet(hashText(`${normalized}-dream`), preferred, {
      two: directNumbers.filter((number) => number.length === 2),
      three: directNumbers.filter((number) => number.length === 3),
    });
    const nextResult = addNumberExplanation(numberSet, {
      source: "ใช้เฉพาะรายละเอียดความฝันที่กรอกในครั้งนี้ ไม่ค้นข้อมูลส่วนตัวจากภายนอก",
      digitReason: directDigits.length
        ? `พบตัวเลขตรงในความฝัน ${directNumbers.join(", ")} จึงคงลำดับและเลขศูนย์นำหน้าก่อน${symbolReason ? ` และพบสัญลักษณ์ตามตารางสำรอง: ${symbolReason}` : ""}`
        : symbolReason
          ? `พบสัญลักษณ์ตามตารางสำรองความเชื่อของระบบ: ${symbolReason}`
          : "ไม่พบตัวเลขตรงหรือสัญลักษณ์ในตาราง เลขเด่นจึงมาจากค่าแฮชของข้อความและถือว่าหลักฐานจำกัด",
      evidence: directDigits.length ? "เลขตรงในฝัน" : found.length ? "ตารางความเชื่อ" : "หลักฐานจำกัด",
      limitation: "ความหมายของความฝันแตกต่างกันตามบุคคลและวัฒนธรรม ตารางนี้ใช้เพื่อความบันเทิงเท่านั้น",
    });
    setMatches(found);
    setResult(nextResult);
    announceResult("เลขความฝัน", nextResult, "แปลความฝันเป็นเลข");
  };

  const useExample = () =>
    setDream("ฝันว่าเดินทางไปวัด เห็นพญานาคอยู่ใกล้แม่น้ำและมีแสงสว่าง");

  return (
    <>
      <PageIntro
        icon="🌙"
        title="เลขความฝัน"
        subtitle="เล่าความฝัน แล้วระบบจะค้นหาสัญลักษณ์สำคัญ"
      />
      <section className="form-card">
        <label className="field-label" htmlFor="dream-text">
          เมื่อคืนคุณฝันว่าอะไร?
        </label>
        <textarea
          id="dream-text"
          className="input-control textarea-control"
          value={dream}
          onChange={(event) => setDream(event.target.value)}
          placeholder="เช่น ฝันว่าเห็นงูอยู่ริมน้ำ..."
          maxLength={500}
          rows={5}
        />
        <div className="helper-row">
          <span>{dream.length}/500 ตัวอักษร</span>
          <button className="text-button" type="button" onClick={useExample}>
            ใส่ตัวอย่าง
          </button>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={analyze}
          disabled={dream.trim().length < 3}
          data-speech-handled="true"
        >
          🌙 แปลความฝันเป็นเลข
        </button>
      </section>

      {result ? (
        <section className="symbol-card">
          <span className="result-label">สัญลักษณ์ที่พบ</span>
          {matches.length ? (
            <div className="tag-list">
              {matches.map((match) => (
                <span key={match.label}>✦ {match.label}</span>
              ))}
            </div>
          ) : (
            <p>ไม่พบคำตรงกับพจนานุกรม ระบบจึงสร้างชุดเลขจากข้อความโดยรวม</p>
          )}
        </section>
      ) : null}

      <NumberResult
        result={result}
        title="ชุดเลขจากความฝัน"
        note="การตีความความฝันแตกต่างกันตามความเชื่อและวัฒนธรรม"
        onSave={
          result ? () => saveResult("เลขความฝัน", result, matches.map((item) => item.label).join(", ")) : null
        }
        onShare={result ? () => share("เลขความฝัน", result) : null}
        onRead={result ? () => announceResult("เลขความฝัน", result, "อ่านเลขออกเสียง") : null}
      />
    </>
  );
}

function SocialPage({ saveResult, share, announceResult }) {
  const [content, setContent] = useState("");
  const [analysis, setAnalysis] = useState(null);

  const analyze = () => {
    const ranking = extractDigitRanking(content);
    const hasDigits = ranking.some((item) => item.count > 0);
    const fallback = makeNumberSet(hashText(`${content}-social`));
    const preferred = hasDigits
      ? ranking.filter((item) => item.count > 0).slice(0, 3).map((item) => item.digit)
      : fallback.digits;
    const topMentions = ranking.filter((item) => item.count > 0).slice(0, 3);
    const directNumbers = content.match(/\d+/g) || [];
    const numberSet = makeNumberSet(hashText(`${content}-social-result`), preferred, {
      two: directNumbers.filter((number) => number.length === 2),
      three: directNumbers.filter((number) => number.length === 3),
    });
    const nextAnalysis = {
      ranking,
      hasDigits,
      result: addNumberExplanation(numberSet, {
        source: "วิเคราะห์เฉพาะข้อความ Social ที่ผู้ใช้นำมาวาง ระบบไม่ได้ดึงข้อมูลสดจากแพลตฟอร์ม",
        digitReason: hasDigits
          ? `จัดอันดับตามจำนวนครั้งที่พบในข้อความ: ${topMentions
              .map((item) => `เลข ${item.digit} พบ ${item.count} ครั้ง`)
              .join(", ")}`
          : "ไม่พบตัวเลขในข้อความ เลขเด่นจึงมาจากค่าแฮชของข้อความและถือว่าหลักฐานจำกัด",
        evidence: hasDigits ? "ความถี่ในข้อความ" : "หลักฐานจำกัด",
        limitation: "ความถี่ในข้อความหนึ่งชุดไม่ใช่กระแส Social ทั้งหมด และไม่ใช่ความน่าจะเป็นของผลรางวัล",
      }),
    };
    setAnalysis(nextAnalysis);
    announceResult("เลขเด่นโซเชียล", nextAnalysis.result, "วิเคราะห์กระแสเลข");
  };

  const useExample = () =>
    setContent(
      "ข้อความตัวอย่าง: คนพูดถึงเลข 2 จำนวน 5 ครั้ง, เลข 7 จำนวน 3 ครั้ง และเลข 9 จำนวน 2 ครั้ง — 2 2 2 2 2 7 7 7 9 9"
    );

  const maxCount = analysis ? Math.max(1, ...analysis.ranking.map((item) => item.count)) : 1;

  return (
    <>
      <PageIntro
        icon="📈"
        title="เลขเด่น Social"
        subtitle="วางข้อความหรือแฮชแท็ก เพื่อดูตัวเลขที่ถูกกล่าวถึงบ่อย"
      />
      <div className="mode-notice">
        <span>โหมดปัจจุบัน</span>
        <strong>วิเคราะห์ข้อความที่คุณนำมาวาง</strong>
        <p>ระบบยังไม่ได้ดึงข้อมูลสดจากแพลตฟอร์ม Social โดยอัตโนมัติ</p>
      </div>
      <section className="form-card">
        <label className="field-label" htmlFor="social-content">
          วางข้อความจาก Social
        </label>
        <textarea
          id="social-content"
          className="input-control textarea-control"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="วางโพสต์ คอมเมนต์ หรือข้อความรวมที่นี่..."
          rows={6}
        />
        <div className="helper-row">
          <span>ระบบนับความถี่เลข 0–9</span>
          <button className="text-button" type="button" onClick={useExample}>
            ใส่ข้อความตัวอย่าง
          </button>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={analyze}
          disabled={content.trim().length < 3}
          data-speech-handled="true"
        >
          📊 วิเคราะห์กระแสเลข
        </button>
      </section>

      {analysis ? (
        <section className="chart-card">
          <div className="section-title-row">
            <div>
              <span className="eyebrow">DIGIT FREQUENCY</span>
              <h3>ความถี่ตัวเลขในข้อความ</h3>
            </div>
            <span>{content.match(/\d/g)?.length || 0} ตัวเลข</span>
          </div>
          <div className="bar-list">
            {analysis.ranking.slice(0, 5).map((item) => (
              <div className="bar-row" key={item.digit}>
                <strong>{item.digit}</strong>
                <div className="bar-track">
                  <span style={{ width: `${(item.count / maxCount) * 100}%` }} />
                </div>
                <span>{item.count}</span>
              </div>
            ))}
          </div>
          {!analysis.hasDigits ? (
            <p className="micro-copy">ไม่พบตัวเลข ระบบสร้างผลจากรูปแบบข้อความแทน</p>
          ) : null}
        </section>
      ) : null}

      <NumberResult
        result={analysis?.result}
        title="ชุดเลขจากกระแสข้อความ"
        note="ผลสะท้อนเฉพาะข้อความที่นำมาวิเคราะห์ ไม่ใช่ข้อมูล Social ทั้งหมด"
        onSave={
          analysis ? () => saveResult("เลขเด่น Social", analysis.result, "วิเคราะห์จากข้อความที่ผู้ใช้วาง") : null
        }
        onShare={analysis ? () => share("เลขเด่น Social", analysis.result) : null}
        onRead={
          analysis ? () => announceResult("เลขเด่นโซเชียล", analysis.result, "อ่านเลขออกเสียง") : null
        }
      />
    </>
  );
}

function AIPage({ saveResult, share, announceResult }) {
  const [birthDate, setBirthDate] = useState("");
  const [color, setColor] = useState("ม่วง");
  const [focus, setFocus] = useState("โชคลาภ");
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState(null);

  const analyze = () => {
    const dateValue = birthDate || todayInputValue();
    const signals = dateSignals(dateValue);
    const colorDigit = COLOR_DIGITS[color] ?? 7;
    const seedSource = [dateValue, color, focus, keyword.trim(), todayInputValue()].join("|");
    const preferred = birthDate
      ? [signals.root, signals.weekday.digit, colorDigit]
      : [colorDigit, signals.weekday.digit, signals.root];
    const numberSet = makeNumberSet(hashText(seedSource), preferred, {
      two: birthDate
        ? [signals.dayText, signals.monthText, signals.yearText.slice(-2)]
        : [signals.dayText, signals.monthText],
      three: birthDate ? [signals.yearText.slice(-3)] : [],
    });
    const nextResult = addNumberExplanation(numberSet, {
      source: birthDate
        ? `ใช้วันเกิด สีที่ชอบ “${color}” เป้าหมายด้าน${focus}${keyword.trim() ? ` และคำ “${keyword.trim()}”` : ""}`
        : `ไม่ได้กรอกวันเกิด จึงใช้วันที่ปัจจุบันร่วมกับสี “${color}” และเป้าหมายด้าน${focus}`,
      digitReason: birthDate
        ? `เลข ${signals.root} มาจากผลรวมวันเกิดลดเหลือหลักเดียว, เลข ${signals.weekday.digit} มาจาก${signals.weekday.name} และเลข ${colorDigit} มาจากตารางสี-เลข`
        : `เลข ${colorDigit} มาจากตารางสี-เลข, เลข ${signals.weekday.digit} มาจาก${signals.weekday.name} และเลข ${signals.root} มาจากผลรวมวันที่ปัจจุบัน`,
      evidence: birthDate ? "วันเกิด + สี" : "วันที่ + สี",
      limitation: "เป้าหมายและคำที่กรอกใช้กำหนดลำดับด้วยสูตรจำลอง ไม่มีการอ้างว่า AI ทำนายผลจริง",
    });
    setResult(nextResult);
    announceResult("เลขจากเอไอ", nextResult, "สร้างชุดเลขของฉัน");
  };

  return (
    <>
      <PageIntro
        icon="🧠"
        title="เลขจาก AI"
        subtitle="ผสานวันเกิด สีที่ชอบ และสิ่งที่คุณอยากโฟกัส"
      />
      <section className="form-card">
        <div className="field-grid">
          <div>
            <label className="field-label" htmlFor="ai-birth">
              วันเกิด (ไม่บังคับ)
            </label>
            <input
              id="ai-birth"
              className="input-control"
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="ai-color">
              สีที่ชอบ
            </label>
            <select
              id="ai-color"
              className="input-control"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            >
              {FAVORITE_COLORS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="field-label">เรื่องที่อยากโฟกัส</label>
        <div className="choice-grid">
          {["โชคลาภ", "การเงิน", "การงาน", "ความรัก"].map((item) => (
            <button
              className={focus === item ? "choice active" : "choice"}
              type="button"
              key={item}
              onClick={() => setFocus(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <label className="field-label" htmlFor="ai-keyword">
          คำที่นึกถึงวันนี้
        </label>
        <input
          id="ai-keyword"
          className="input-control"
          type="text"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value.slice(0, 60))}
          placeholder="เช่น เริ่มต้น ความสำเร็จ ครอบครัว"
        />

        <button
          className="primary-button ai-button"
          type="button"
          onClick={analyze}
          data-speech-handled="true"
        >
          <span>AI</span> สร้างชุดเลขของฉัน
        </button>
      </section>

      <NumberResult
        result={result}
        title={`ชุดเลขโฟกัสด้าน${focus}`}
        note="AI เวอร์ชันนี้ใช้สูตรจำลองในอุปกรณ์ และไม่ส่งข้อมูลส่วนตัวออกไปภายนอก"
        onSave={result ? () => saveResult("เลขจาก AI", result, `โฟกัส: ${focus} • สี: ${color}`) : null}
        onShare={result ? () => share("เลขจาก AI", result) : null}
        onRead={result ? () => announceResult("เลขจากเอไอ", result, "อ่านเลขออกเสียง") : null}
      />
    </>
  );
}

function TemplePage({ saveResult, share, notify, announceResult }) {
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [province, setProvince] = useState("");
  const [numbers, setNumbers] = useState("");
  const [source, setSource] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => setRecords(readLocal("lucky_temple_records", [])), []);

  const addRecord = (event) => {
    event.preventDefault();
    const cleanNumbers = numbers.match(/\d+/g)?.join(", ") || "";
    if (!name.trim() || !cleanNumbers) {
      notify("กรุณาใส่ชื่อวัดและตัวเลข");
      return;
    }
    const next = [
      {
        id: Date.now(),
        name: name.trim(),
        province: province.trim(),
        numbers: cleanNumbers,
        source: source.trim(),
        createdAt: new Date().toISOString(),
      },
      ...records,
    ].slice(0, 30);
    setRecords(next);
    writeLocal("lucky_temple_records", next);
    setName("");
    setProvince("");
    setNumbers("");
    setSource("");
    setShowForm(false);
    notify("บันทึกข้อมูลแล้ว");
  };

  const removeRecord = (id) => {
    const next = records.filter((item) => item.id !== id);
    setRecords(next);
    writeLocal("lucky_temple_records", next);
    notify("ลบรายการแล้ว");
  };

  const analyze = () => {
    const allNumbers = records.map((item) => item.numbers).join(" ");
    const ranked = extractDigitRanking(allNumbers).filter((item) => item.count > 0);
    const directNumbers = allNumbers.match(/\d+/g) || [];
    const numberSet = makeNumberSet(
      hashText(`${allNumbers}-${todayInputValue()}-temple`),
      ranked.slice(0, 3).map((item) => item.digit),
      {
        two: directNumbers.filter((number) => number.length === 2),
        three: directNumbers.filter((number) => number.length === 3),
      }
    );
    const nextResult = addNumberExplanation(numberSet, {
      source: `ใช้ตัวเลขจาก ${records.length} รายการที่ผู้ใช้บันทึกไว้ในอุปกรณ์ พร้อมชื่อสถานที่และที่มาที่กรอกเอง`,
      digitReason: `เรียงเลขเด่นตามความถี่: ${ranked
        .slice(0, 3)
        .map((item) => `เลข ${item.digit} พบ ${item.count} ครั้ง`)
        .join(", ")}`,
      evidence: `${records.length} รายการบันทึก`,
      limitation: "ระบบไม่ได้ตรวจสอบหรือสร้างข่าวจากวัด และจำนวนครั้งที่พบไม่ใช่ความน่าจะเป็นของผลรางวัล",
    });
    setResult(nextResult);
    announceResult("เลขจากวัดดัง", nextResult, "วิเคราะห์เลขจากข้อมูลทั้งหมด");
  };

  return (
    <>
      <PageIntro
        icon="🏯"
        title="เลขจากวัดดัง"
        subtitle="รวบรวมข้อมูลที่พบ พร้อมบันทึกแหล่งที่มาเพื่อตรวจสอบ"
      />
      <div className="mode-notice gold-mode">
        <span>หลักการของระบบ</span>
        <strong>ไม่สร้างข่าวหรืออ้างชื่อวัดแทนผู้ใช้</strong>
        <p>ทุกรายการด้านล่างเป็นข้อมูลที่คุณบันทึกไว้ในอุปกรณ์นี้</p>
      </div>

      <div className="section-title-row source-title">
        <div>
          <span className="eyebrow">SAVED SOURCES</span>
          <h2>ข้อมูลเลขที่บันทึก</h2>
        </div>
        <button className="small-gold-button" type="button" onClick={() => setShowForm((value) => !value)}>
          {showForm ? "ปิด" : "+ เพิ่มข้อมูล"}
        </button>
      </div>

      {showForm ? (
        <form className="form-card source-form" onSubmit={addRecord}>
          <label className="field-label" htmlFor="temple-name">
            ชื่อวัดหรือสถานที่
          </label>
          <input
            id="temple-name"
            className="input-control"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="ระบุชื่อที่ตรวจสอบได้"
          />
          <div className="field-grid">
            <div>
              <label className="field-label" htmlFor="temple-province">
                จังหวัด
              </label>
              <input
                id="temple-province"
                className="input-control"
                value={province}
                onChange={(event) => setProvince(event.target.value)}
                placeholder="จังหวัด"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="temple-number">
                ตัวเลขที่พบ
              </label>
              <input
                id="temple-number"
                className="input-control"
                value={numbers}
                onChange={(event) => setNumbers(event.target.value)}
                inputMode="numeric"
                placeholder="เช่น 27, 729"
              />
            </div>
          </div>
          <label className="field-label" htmlFor="temple-source">
            ลิงก์หรือหมายเหตุแหล่งที่มา
          </label>
          <input
            id="temple-source"
            className="input-control"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="เช่น URL โพสต์หรือชื่อผู้บันทึก"
          />
          <button className="primary-button" type="submit">
            บันทึกข้อมูล
          </button>
        </form>
      ) : null}

      {records.length ? (
        <div className="source-list">
          {records.map((record) => (
            <article className="source-card" key={record.id}>
              <div className="temple-mark">🏯</div>
              <div className="source-content">
                <span className="source-date">บันทึก {formatThaiDate(new Date(record.createdAt))}</span>
                <h3>{record.name}</h3>
                <p>{record.province || "ไม่ระบุจังหวัด"}</p>
                <div className="source-numbers">{record.numbers}</div>
                {record.source ? <small>ที่มา: {record.source}</small> : null}
              </div>
              <button
                className="icon-button danger"
                type="button"
                onClick={() => removeRecord(record.id)}
                aria-label={`ลบ ${record.name}`}
              >
                ×
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span>🏯</span>
          <h3>ยังไม่มีข้อมูลที่บันทึก</h3>
          <p>กด “เพิ่มข้อมูล” แล้วใส่ตัวเลขพร้อมแหล่งที่มา</p>
        </div>
      )}

      {records.length ? (
        <button
          className="primary-button standalone"
          type="button"
          onClick={analyze}
          data-speech-handled="true"
        >
          ✦ วิเคราะห์เลขจากข้อมูลทั้งหมด
        </button>
      ) : null}

      <NumberResult
        result={result}
        title="เลขเด่นจากข้อมูลที่บันทึก"
        note={`วิเคราะห์จาก ${records.length} แหล่งข้อมูลที่บันทึกไว้ในอุปกรณ์นี้`}
        onSave={result ? () => saveResult("เลขจากวัดดัง", result, `${records.length} แหล่งข้อมูล`) : null}
        onShare={result ? () => share("เลขจากวัดดัง", result) : null}
        onRead={result ? () => announceResult("เลขจากวัดดัง", result, "อ่านเลขออกเสียง") : null}
      />
    </>
  );
}

function MemberPage({ saveResult, share, notify, announceResult }) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [color, setColor] = useState("ทอง");
  const [keyword, setKeyword] = useState("");
  const [profile, setProfile] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const saved = readLocal("lucky_member_profile", null);
    if (saved) {
      setName(saved.name || "");
      setBirthDate(saved.birthDate || "");
      setColor(saved.color || "ทอง");
      setKeyword(saved.keyword || "");
      setProfile(saved);
      setResult(makeMemberNumberResult(saved));
    }
  }, []);

  const saveProfile = (event) => {
    event.preventDefault();
    if (!name.trim() || !birthDate) {
      notify("กรุณาใส่ชื่อและวันเกิด");
      return;
    }
    const nextProfile = {
      name: name.trim(),
      birthDate,
      color,
      keyword: keyword.trim(),
      updatedAt: new Date().toISOString(),
    };
    const nextResult = makeMemberNumberResult(nextProfile);
    setProfile(nextProfile);
    setResult(nextResult);
    writeLocal("lucky_member_profile", nextProfile);
    notify("บันทึกดวงสมาชิกแล้ว");
    announceResult(
      "ดวงสมาชิก",
      nextResult,
      profile ? "อัปเดตดวงสมาชิก" : "สร้างดวงสมาชิก"
    );
  };

  const bornDay = profile?.birthDate
    ? THAI_DAYS[new Date(`${profile.birthDate}T12:00:00`).getDay()]
    : null;

  return (
    <>
      <PageIntro
        icon="♈"
        title="ดวงสมาชิก"
        subtitle="บันทึกข้อมูลครั้งเดียว เพื่อสร้างดวงเลขเฉพาะบุคคล"
      />

      {profile ? (
        <section className="member-banner">
          <div className="member-avatar">{profile.name.charAt(0).toUpperCase()}</div>
          <div>
            <span className="member-tier">สมาชิกทั่วไป</span>
            <h2>สวัสดี คุณ{profile.name}</h2>
            <p>
              เกิด{bornDay?.name} • สีที่ชอบ {profile.color}
            </p>
          </div>
          <span className="member-star">✦</span>
        </section>
      ) : null}

      <form className="form-card" onSubmit={saveProfile}>
        <label className="field-label" htmlFor="member-name">
          ชื่อที่ใช้แสดง
        </label>
        <input
          id="member-name"
          className="input-control"
          value={name}
          onChange={(event) => setName(event.target.value.slice(0, 40))}
          placeholder="ชื่อของคุณ"
          autoComplete="name"
        />
        <div className="field-grid">
          <div>
            <label className="field-label" htmlFor="member-birth">
              วัน เดือน ปีเกิด
            </label>
            <input
              id="member-birth"
              className="input-control"
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="member-color">
              สีที่ชอบ
            </label>
            <select
              id="member-color"
              className="input-control"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            >
              {FAVORITE_COLORS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
        <label className="field-label" htmlFor="member-keyword">
          สิ่งที่อยากให้เกิดขึ้น
        </label>
        <input
          id="member-keyword"
          className="input-control"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value.slice(0, 80))}
          placeholder="เช่น งานใหม่ สุขภาพดี ความสำเร็จ"
        />
        <button className="primary-button" type="submit" data-speech-handled="true">
          {profile ? "อัปเดตดวงสมาชิก" : "สร้างดวงสมาชิก"}
        </button>
        <p className="privacy-copy">🔒 ข้อมูลถูกเก็บไว้เฉพาะในอุปกรณ์นี้</p>
      </form>

      <NumberResult
        result={result}
        title={profile ? `ชุดเลขประจำตัวของคุณ${profile.name}` : "ชุดเลขสมาชิก"}
        note={bornDay ? `${bornDay.name} • สีเสริมพลังตามความเชื่อ ${bornDay.color}` : ""}
        onSave={result ? () => saveResult("ดวงสมาชิก", result, profile?.name || "สมาชิก") : null}
        onShare={result ? () => share("ดวงสมาชิก", result) : null}
        onRead={result ? () => announceResult("ดวงสมาชิก", result, "อ่านเลขออกเสียง") : null}
      />
    </>
  );
}

function HistoryPage({ history, clearHistory, share, announceResult }) {
  return (
    <>
      <PageIntro
        icon="♡"
        title="เลขที่บันทึกไว้"
        subtitle="ประวัติผลวิเคราะห์ล่าสุดในอุปกรณ์นี้"
      />
      {history.length ? (
        <>
          <div className="history-list">
            {history.map((item) => (
              <article className="history-card" key={item.id}>
                <div className="history-topline">
                  <span>{item.title}</span>
                  <time>{formatThaiDate(new Date(item.createdAt))}</time>
                </div>
                <div className="history-digits">
                  {item.result.digits.map((digit) => (
                    <strong key={digit}>{digit}</strong>
                  ))}
                </div>
                <p>{item.context || "ผลที่บันทึกไว้"}</p>
                {item.result.explanation?.rows?.[0]?.detail ? (
                  <p className="history-reason">
                    <strong>เหตุผล:</strong> {item.result.explanation.rows[0].detail}
                  </p>
                ) : null}
                <div className="history-bottom">
                  <span>2 ตัว: {item.result.two.join(" • ")}</span>
                  <div className="history-actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => announceResult(item.title, item.result, "อ่านเลขที่บันทึกไว้")}
                      data-speech-handled="true"
                    >
                      🔊 อ่านเลข
                    </button>
                    <button className="text-button" type="button" onClick={() => share(item.title, item.result)}>
                      แชร์ ↗
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <button className="clear-button" type="button" onClick={clearHistory}>
            ล้างประวัติทั้งหมด
          </button>
        </>
      ) : (
        <div className="empty-state">
          <span>♡</span>
          <h3>ยังไม่มีเลขที่บันทึก</h3>
          <p>เมื่อวิเคราะห์เลขแล้ว กด “บันทึกผล” เพื่อเก็บไว้ที่นี่</p>
        </div>
      )}
    </>
  );
}

function VoiceGuide({ status, error, onTest, lineBrowser, externalBrowserUrl }) {
  const isProblem = status === "unsupported" || status === "error";
  const isLineNotice = lineBrowser || status === "line-browser";
  let statusText = "พร้อมบอกชื่อปุ่มและอ่านผลเลขให้ฟัง";
  if (status === "speaking") statusText = "กำลังพูดภาษาไทย…";
  if (status === "starting") statusText = "กำลังเริ่มเสียง…";
  if (status === "loading") statusText = "กำลังค้นหาเสียงภาษาไทยในเครื่อง";
  if (isProblem) statusText = error || "อุปกรณ์นี้ยังไม่พร้อมอ่านออกเสียง";
  if (isLineNotice && status !== "speaking" && status !== "starting") {
    statusText = isProblem && error
      ? `${error} เปิดผ่าน Chrome หรือ Safari เพื่อใช้เสียงอ่าน`
      : "เว็บใน LINE อาจไม่เปิดบริการอ่านข้อความ กดเปิดเบราว์เซอร์ภายนอกเพื่อใช้เสียงอ่านเต็มรูปแบบ";
  }

  return (
    <section
      className={`voice-guide ${isLineNotice ? "line-browser" : isProblem ? "has-error" : status}`}
      aria-live="polite"
    >
      <div className="voice-guide-icon" aria-hidden="true">
        {isLineNotice ? "LINE" : isProblem ? "!" : "🔊"}
        <span />
      </div>
      <div className="voice-guide-copy">
        <strong>
          {isLineNotice ? "เปิดผ่าน LINE" : isProblem ? "ตรวจพบปัญหาเสียงพูด" : "เสียงอ่านภาษาไทย"}
        </strong>
        <p>{statusText}</p>
      </div>
      <div className="voice-guide-actions">
        <button
          className="voice-test-button"
          type="button"
          onClick={onTest}
          data-speech-handled="true"
        >
          ▶ {isLineNotice ? "ลองเสียงใน LINE" : "ทดสอบเสียง"}
        </button>
        {isLineNotice && externalBrowserUrl ? (
          <a className="external-browser-button" href={externalBrowserUrl} rel="noreferrer">
            เปิด Chrome / Safari ↗
          </a>
        ) : null}
      </div>
    </section>
  );
}

function HomePage({
  openView,
  speechStatus,
  speechError,
  testSpeech,
  lineBrowser,
  externalBrowserUrl,
}) {
  const today = useMemo(() => formatThaiDate(new Date()), []);
  return (
    <>
      <section className="hero">
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <span className="hero-star star-one">✦</span>
        <span className="hero-star star-two">✧</span>
        <span className="hero-star star-three">✦</span>
        <div className="hero-copy">
          <span className="hero-kicker">YOUR LUCKY NUMBER</span>
          <h1>ระบบทำนายเลข</h1>
          <p>ค้นหาเลขนำโชคของคุณ</p>
          <time>{today}</time>
        </div>
        <div className="crystal-ball" aria-hidden="true">
          <span>9</span>
        </div>
      </section>

      <VoiceGuide
        status={speechStatus}
        error={speechError}
        onTest={testSpeech}
        lineBrowser={lineBrowser}
        externalBrowserUrl={externalBrowserUrl}
      />

      <div className="home-heading">
        <div>
          <span className="eyebrow">เลือกคำทำนาย</span>
          <h2>วันนี้อยากดูเลขจากอะไร?</h2>
        </div>
        <span className="six-badge">6 เมนู</span>
      </div>

      <section className="menu-grid" aria-label="เมนูระบบทำนายเลข">
        {MENU_ITEMS.map((item, index) => (
          <button
            className={`menu-card ${item.tone}`}
            type="button"
            key={item.id}
            onClick={() => openView(item.id)}
            data-speech-label={item.label}
            style={{ "--delay": `${index * 70}ms` }}
          >
            <span className="menu-glow" />
            <span className="menu-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="menu-copy">
              <strong>{item.label}</strong>
              <small>{item.hint}</small>
            </span>
            <span className="menu-arrow" aria-hidden="true">
              ›
            </span>
          </button>
        ))}
      </section>

      <section className="trust-note">
        <span>✦</span>
        <div>
          <strong>สนุกอย่างมีสติ</strong>
          <p>ผลทั้งหมดสร้างเพื่อความบันเทิงและความเชื่อส่วนบุคคลเท่านั้น</p>
        </div>
      </section>
    </>
  );
}

export default function LuckyNumberApp() {
  const [view, setView] = useState("home");
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechStatus, setSpeechStatus] = useState("checking");
  const [speechError, setSpeechError] = useState("");
  const [lineBrowser, setLineBrowser] = useState(false);
  const [externalBrowserUrl, setExternalBrowserUrl] = useState("");
  const appShellRef = useRef(null);
  const audioContextRef = useRef(null);
  const speechVoiceRef = useRef(null);
  const speechUtterancesRef = useRef(new Set());
  const speechWatchdogRef = useRef(null);
  const speechRestartTimerRef = useRef(null);
  const speechGenerationRef = useRef(0);

  useEffect(() => {
    const openedInLine = isLineInAppBrowser();
    setHistory(readLocal("lucky_number_history", []));
    setSoundEnabled(readLocal(SOUND_STORAGE_KEY, true) !== false);
    setVoiceEnabled(readLocal(VOICE_STORAGE_KEY, true) !== false);
    setLineBrowser(openedInLine);
    setExternalBrowserUrl(makeExternalBrowserUrl(window.location.href));
    if (openedInLine) {
      setSpeechStatus("line-browser");
      setSpeechError("LINE อาจจำกัดระบบอ่านข้อความของหน้าเว็บ");
    }
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance !== "function") {
      setSpeechStatus("unsupported");
      setSpeechError("เบราว์เซอร์นี้ไม่รองรับเสียงพูด กรุณาเปิดด้วย Chrome หรือ Samsung Internet");
      return undefined;
    }

    const updateThaiVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      speechVoiceRef.current =
        voices.find((voice) => /^th(?:-|_)/i.test(voice.lang)) ||
        voices.find((voice) => /thai|ไทย/i.test(voice.name)) ||
        null;
      setSpeechStatus((current) => {
        if (isLineInAppBrowser()) return "line-browser";
        if (current !== "checking" && current !== "loading") return current;
        return voices.length ? "ready" : "loading";
      });
    };

    updateThaiVoice();
    window.speechSynthesis.addEventListener?.("voiceschanged", updateThaiVoice);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", updateThaiVoice);
    };
  }, []);

  const playButtonSound = useCallback(
    (kind = "tap", force = false) => {
      if (!soundEnabled && !force) return;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      try {
        if (!audioContextRef.current || audioContextRef.current.state === "closed") {
          audioContextRef.current = new AudioContextClass();
        }

        const audioContext = audioContextRef.current;
        const startTone = () => {
          if (kind === "magic") {
            playTone(audioContext, 523.25, 0, 0.1, 0.075);
            playTone(audioContext, 783.99, 0.045, 0.13, 0.052);
          } else if (kind === "toggle") {
            playTone(audioContext, 659.25, 0, 0.11, 0.065);
          } else {
            playTone(audioContext, 440, 0, 0.075, 0.045);
          }
        };

        if (audioContext.state === "suspended") {
          audioContext.resume().then(startTone).catch(() => undefined);
        } else {
          startTone();
        }
      } catch {
        // Some embedded browsers block Web Audio. Buttons still work normally.
      }
    },
    [soundEnabled]
  );

  const speakText = useCallback(
    (text, { interrupt = true, force = false } = {}) => {
      if ((!voiceEnabled && !force) || !text) return false;
      if (!("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance !== "function") {
        setSpeechStatus("unsupported");
        setSpeechError("เบราว์เซอร์นี้ไม่รองรับเสียงพูด กรุณาเปิดด้วย Chrome หรือ Samsung Internet");
        return false;
      }

      try {
        const synthesizer = window.speechSynthesis;
        const hasActiveSpeech = synthesizer.speaking || synthesizer.pending;
        const generation = speechGenerationRef.current + 1;
        speechGenerationRef.current = generation;

        if (speechRestartTimerRef.current) {
          window.clearTimeout(speechRestartTimerRef.current);
          speechRestartTimerRef.current = null;
        }
        if (speechWatchdogRef.current) {
          window.clearTimeout(speechWatchdogRef.current);
          speechWatchdogRef.current = null;
        }
        if (interrupt && hasActiveSpeech) {
          synthesizer.cancel();
          speechUtterancesRef.current.clear();
        }

        const startSpeech = () => {
          speechRestartTimerRef.current = null;
          const availableVoices = synthesizer.getVoices();
          const thaiVoice =
            speechVoiceRef.current ||
            availableVoices.find((voice) => /^th(?:-|_)/i.test(voice.lang)) ||
            availableVoices.find((voice) => /thai|ไทย/i.test(voice.name)) ||
            null;
          const utterance = new window.SpeechSynthesisUtterance(text);
          let started = false;

          utterance.lang = "th-TH";
          utterance.rate = 0.88;
          utterance.pitch = 1;
          utterance.volume = 1;
          if (thaiVoice) {
            speechVoiceRef.current = thaiVoice;
            utterance.voice = thaiVoice;
          }

          const releaseUtterance = () => {
            if (speechGenerationRef.current === generation && speechWatchdogRef.current) {
              window.clearTimeout(speechWatchdogRef.current);
              speechWatchdogRef.current = null;
            }
            speechUtterancesRef.current.delete(utterance);
          };

          utterance.onstart = () => {
            started = true;
            if (speechGenerationRef.current !== generation) return;
            setSpeechStatus("speaking");
            setSpeechError("");
          };
          utterance.onend = () => {
            releaseUtterance();
            if (speechGenerationRef.current !== generation) return;
            setSpeechStatus("ready");
          };
          utterance.onerror = (event) => {
            releaseUtterance();
            if (speechGenerationRef.current !== generation) return;
            if (event.error === "canceled" || event.error === "interrupted") return;
            setSpeechStatus("error");
            setSpeechError(speechFailureMessage(event.error));
          };

          speechUtterancesRef.current.add(utterance);
          setSpeechStatus("starting");
          setSpeechError("");
          synthesizer.resume();
          synthesizer.speak(utterance);

          speechWatchdogRef.current = window.setTimeout(() => {
            if (speechGenerationRef.current !== generation) return;
            if (started || !speechUtterancesRef.current.has(utterance)) return;
            synthesizer.cancel();
            releaseUtterance();
            setSpeechStatus("error");
            setSpeechError("เครื่องไม่เริ่มเสียงพูด กรุณากดทดสอบเสียงหรือตรวจบริการเสียงภาษาไทย");
          }, 3500);
        };

        if (interrupt && hasActiveSpeech) {
          speechRestartTimerRef.current = window.setTimeout(startSpeech, 90);
        } else {
          startSpeech();
        }
        return true;
      } catch {
        setSpeechStatus("error");
        setSpeechError("ไม่สามารถเปิดระบบเสียงพูดได้ กรุณากดทดสอบเสียงอีกครั้ง");
        return false;
      }
    },
    [voiceEnabled]
  );

  const announceResult = useCallback(
    (resultTitle, result, actionLabel = "อ่านผลเลข") => {
      speakText(`กดปุ่ม ${actionLabel}. ${resultSpeech(resultTitle, result)}`, { interrupt: true });
    },
    [speakText]
  );

  const testSpeech = useCallback(() => {
    speakText("ทดสอบเสียงภาษาไทย ระบบพร้อมอ่านเลข หนึ่ง สอง สาม", {
      interrupt: true,
      force: true,
    });
  }, [speakText]);

  useEffect(() => {
    const shell = appShellRef.current;
    if (!shell) return undefined;

    const handleButtonClick = (event) => {
      const button = event.target instanceof Element ? event.target.closest("button") : null;
      if (!button || !shell.contains(button) || button.disabled) return;

      const isSoundToggle = button.dataset.soundToggle === "true";
      const isSpeechHandled = button.dataset.speechHandled === "true";
      const isMagicAction = button.matches(
        ".menu-card, .primary-button, .read-result-button, .voice-test-button"
      );
      playButtonSound(
        isSoundToggle ? "toggle" : isMagicAction ? "magic" : "tap",
        isSoundToggle && !soundEnabled
      );

      if (!isSoundToggle && !isSpeechHandled) {
        const spokenLabel = buttonSpeechLabel(button);
        if (spokenLabel) speakText(`กดปุ่ม ${spokenLabel}`, { interrupt: true });
      }

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduceMotion) {
        const bounds = button.getBoundingClientRect();
        const burst = document.createElement("span");
        const x = event.clientX || bounds.left + bounds.width / 2;
        const y = event.clientY || bounds.top + bounds.height / 2;

        burst.className = isMagicAction ? "tap-burst magic" : "tap-burst";
        burst.style.left = `${x}px`;
        burst.style.top = `${y}px`;
        burst.setAttribute("aria-hidden", "true");
        document.body.appendChild(burst);
        burst.addEventListener("animationend", () => burst.remove(), { once: true });
        window.setTimeout(() => burst.remove(), 700);

        button.classList.remove("is-tapped");
        window.requestAnimationFrame(() => button.classList.add("is-tapped"));
        window.setTimeout(() => button.classList.remove("is-tapped"), 430);
      }

      if (isMagicAction && typeof navigator.vibrate === "function") {
        navigator.vibrate(8);
      }
    };

    shell.addEventListener("click", handleButtonClick);
    return () => shell.removeEventListener("click", handleButtonClick);
  }, [playButtonSound, soundEnabled, speakText]);

  useEffect(
    () => () => {
      const audioContext = audioContextRef.current;
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => undefined);
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        speechUtterancesRef.current.clear();
      }
      if (speechWatchdogRef.current) window.clearTimeout(speechWatchdogRef.current);
      if (speechRestartTimerRef.current) window.clearTimeout(speechRestartTimerRef.current);
    },
    []
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2300);
  };

  const audioEnabled = soundEnabled || voiceEnabled;

  const toggleSound = () => {
    const nextValue = !audioEnabled;
    speakText(nextValue ? "เปิดเสียงและคำอ่านแล้ว" : "ปิดเสียงและคำอ่านแล้ว", {
      interrupt: true,
      force: true,
    });
    setSoundEnabled(nextValue);
    setVoiceEnabled(nextValue);
    writeLocal(SOUND_STORAGE_KEY, nextValue);
    writeLocal(VOICE_STORAGE_KEY, nextValue);
    notify(nextValue ? "เปิดเสียงและคำอ่านแล้ว" : "ปิดเสียงและคำอ่านแล้ว");
  };

  const saveResult = (title, result, context = "") => {
    const next = [
      { id: Date.now(), title, result, context, createdAt: new Date().toISOString() },
      ...history,
    ].slice(0, 20);
    setHistory(next);
    writeLocal("lucky_number_history", next);
    notify("บันทึกผลแล้ว");
  };

  const clearHistory = () => {
    setHistory([]);
    writeLocal("lucky_number_history", []);
    notify("ล้างประวัติแล้ว");
  };

  const share = async (title, result) => {
    const reason = result.explanation?.rows?.[0]?.detail || "สร้างจากสูตรจำลองเพื่อความบันเทิง";
    const url = externalBrowserUrl || makeExternalBrowserUrl(window.location.href);
    const text = `${title}\n${resultSummary(result)}\nเหตุผล: ${reason}\nเพื่อความบันเทิงและความเชื่อส่วนบุคคล`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "AI ให้เลขเด็ด", text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        notify("คัดลอกผลแล้ว");
      }
    } catch (error) {
      if (error?.name !== "AbortError") notify("ไม่สามารถแชร์ได้ในขณะนี้");
    }
  };

  const title = view === "history" ? "เลขที่บันทึก" : VIEW_META[view]?.label;

  return (
    <main className="app-shell" ref={appShellRef}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        {view !== "home" ? (
          <button className="topbar-button" type="button" onClick={() => setView("home")} aria-label="กลับหน้าแรก">
            ‹
          </button>
        ) : (
          <div className="brand-mark" aria-hidden="true">
            9
          </div>
        )}
        <div className="topbar-title">
          <strong>{view === "home" ? "AI ให้เลขเด็ด" : title}</strong>
          <span>{view === "home" ? "Lucky Number Studio" : "ระบบทำนายเลข"}</span>
        </div>
        <div className="topbar-actions">
          <button
            className={audioEnabled ? "topbar-button sound-toggle active" : "topbar-button sound-toggle"}
            type="button"
            onClick={toggleSound}
            aria-label={audioEnabled ? "ปิดเสียงและคำอ่าน" : "เปิดเสียงและคำอ่าน"}
            aria-pressed={audioEnabled}
            data-sound-toggle="true"
            title={audioEnabled ? "ปิดเสียงและคำอ่าน" : "เปิดเสียงและคำอ่าน"}
          >
            <span aria-hidden="true">{audioEnabled ? "🔊" : "🔇"}</span>
          </button>
          <button
            className={view === "history" ? "topbar-button active" : "topbar-button"}
            type="button"
            onClick={() => setView("history")}
            aria-label="ดูเลขที่บันทึก"
          >
            ♡
            {history.length ? <span className="history-count">{history.length}</span> : null}
          </button>
        </div>
      </header>

      <div className="content-area">
        {view === "home" ? (
          <HomePage
            openView={setView}
            speechStatus={speechStatus}
            speechError={speechError}
            testSpeech={testSpeech}
            lineBrowser={lineBrowser}
            externalBrowserUrl={externalBrowserUrl}
          />
        ) : null}
        {view === "daily" ? (
          <DailyPage saveResult={saveResult} share={share} announceResult={announceResult} />
        ) : null}
        {view === "dream" ? (
          <DreamPage saveResult={saveResult} share={share} announceResult={announceResult} />
        ) : null}
        {view === "social" ? (
          <SocialPage saveResult={saveResult} share={share} announceResult={announceResult} />
        ) : null}
        {view === "ai" ? (
          <AIPage saveResult={saveResult} share={share} announceResult={announceResult} />
        ) : null}
        {view === "temple" ? (
          <TemplePage
            saveResult={saveResult}
            share={share}
            notify={notify}
            announceResult={announceResult}
          />
        ) : null}
        {view === "member" ? (
          <MemberPage
            saveResult={saveResult}
            share={share}
            notify={notify}
            announceResult={announceResult}
          />
        ) : null}
        {view === "history" ? (
          <HistoryPage
            history={history}
            clearHistory={clearHistory}
            share={share}
            announceResult={announceResult}
          />
        ) : null}
      </div>

      <footer className="app-footer">
        <span>✦</span>
        <p>เพื่อความบันเทิงและความเชื่อส่วนบุคคล ไม่รับรองผลการเสี่ยงโชค</p>
        <span>✦</span>
      </footer>

      {toast ? (
        <div className="toast" role="status">
          ✓ {toast}
        </div>
      ) : null}
    </main>
  );
}
