"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SOUND_STORAGE_KEY = "lucky_sound_enabled";

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
  { words: ["งู", "พญานาค"], label: "งู / พญานาค", digits: [5, 6] },
  { words: ["น้ำ", "ฝน", "ทะเล", "แม่น้ำ"], label: "น้ำ / ฝน", digits: [2, 9] },
  { words: ["ปลา", "กุ้ง", "สัตว์น้ำ"], label: "ปลา / สัตว์น้ำ", digits: [8, 9] },
  { words: ["เด็ก", "ทารก", "ลูก"], label: "เด็ก / ทารก", digits: [1, 7] },
  { words: ["พระ", "วัด", "เจดีย์"], label: "พระ / วัด", digits: [0, 9] },
  { words: ["รถ", "ขับรถ", "เดินทาง"], label: "รถ / การเดินทาง", digits: [4, 1] },
  { words: ["เงิน", "ทอง", "แหวน", "สร้อย"], label: "เงิน / ทอง", digits: [3, 8] },
  { words: ["บ้าน", "ห้อง", "ประตู"], label: "บ้าน / ที่พัก", digits: [4, 7] },
  { words: ["ไฟ", "เทียน", "แสง"], label: "ไฟ / แสง", digits: [5, 8] },
  { words: ["คนตาย", "ผู้ตาย", "ศพ", "งานศพ"], label: "ผู้ล่วงลับ", digits: [0, 4] },
  { words: ["สุนัข", "หมา"], label: "สุนัข", digits: [2, 6] },
  { words: ["แมว"], label: "แมว", digits: [3, 4] },
  { words: ["นก", "บิน"], label: "นก / การบิน", digits: [1, 5] },
  { words: ["ช้าง"], label: "ช้าง", digits: [7, 9] },
];

const FAVORITE_COLORS = ["ม่วง", "แดง", "ทอง", "เขียว", "ฟ้า", "ชมพู", "ขาว", "ดำ"];

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

function uniqueValues(makeValue, count, limit = 100) {
  const values = new Set();
  let guard = 0;
  while (values.size < count && guard < limit) {
    values.add(makeValue());
    guard += 1;
  }
  return [...values];
}

function makeNumberSet(seed, preferredDigits = []) {
  const next = randomFromSeed(seed || 1);
  const digits = uniqueValues(
    () => Math.floor(next() * 10),
    3,
    60
  );
  preferredDigits.forEach((digit) => {
    const normalized = Math.abs(Number(digit)) % 10;
    if (!digits.includes(normalized)) digits.unshift(normalized);
  });
  const topDigits = digits.slice(0, 3);
  const two = uniqueValues(
    () => String(Math.floor(next() * 100)).padStart(2, "0"),
    6,
    120
  );
  const three = uniqueValues(
    () => String(Math.floor(next() * 1000)).padStart(3, "0"),
    4,
    120
  );
  return { digits: topDigits, two, three };
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

function NumberResult({ result, title, note, onSave, onShare }) {
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

      {note ? <p className="result-note">{note}</p> : null}

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

function DailyPage({ saveResult, share }) {
  const [date, setDate] = useState(todayInputValue());
  const [result, setResult] = useState(null);

  const analyze = () => {
    const parsed = new Date(`${date}T12:00:00`);
    const day = THAI_DAYS[parsed.getDay()];
    const seed = hashText(`${date}-${day.name}-daily`);
    setResult({ ...makeNumberSet(seed, [day.digit]), day });
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
        <button className="primary-button" type="button" onClick={analyze} disabled={!date}>
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
      />
    </>
  );
}

function DreamPage({ saveResult, share }) {
  const [dream, setDream] = useState("");
  const [result, setResult] = useState(null);
  const [matches, setMatches] = useState([]);

  const analyze = () => {
    const normalized = dream.trim().toLowerCase();
    const found = DREAM_SYMBOLS.filter((symbol) =>
      symbol.words.some((word) => normalized.includes(word))
    );
    const preferred = found.flatMap((item) => item.digits);
    setMatches(found);
    setResult(makeNumberSet(hashText(`${normalized}-dream`), preferred));
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
      />
    </>
  );
}

function SocialPage({ saveResult, share }) {
  const [content, setContent] = useState("");
  const [analysis, setAnalysis] = useState(null);

  const analyze = () => {
    const ranking = extractDigitRanking(content);
    const hasDigits = ranking.some((item) => item.count > 0);
    const fallback = makeNumberSet(hashText(`${content}-social`));
    const preferred = hasDigits
      ? ranking.filter((item) => item.count > 0).slice(0, 3).map((item) => item.digit)
      : fallback.digits;
    setAnalysis({
      ranking,
      hasDigits,
      result: makeNumberSet(hashText(`${content}-social-result`), preferred),
    });
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
      />
    </>
  );
}

function AIPage({ saveResult, share }) {
  const [birthDate, setBirthDate] = useState("");
  const [color, setColor] = useState("ม่วง");
  const [focus, setFocus] = useState("โชคลาภ");
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState(null);

  const analyze = () => {
    const seedSource = [birthDate || todayInputValue(), color, focus, keyword.trim(), todayInputValue()].join("|");
    setResult(makeNumberSet(hashText(seedSource)));
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

        <button className="primary-button ai-button" type="button" onClick={analyze}>
          <span>AI</span> สร้างชุดเลขของฉัน
        </button>
      </section>

      <NumberResult
        result={result}
        title={`ชุดเลขโฟกัสด้าน${focus}`}
        note="AI เวอร์ชันนี้ใช้สูตรจำลองในอุปกรณ์ และไม่ส่งข้อมูลส่วนตัวออกไปภายนอก"
        onSave={result ? () => saveResult("เลขจาก AI", result, `โฟกัส: ${focus} • สี: ${color}`) : null}
        onShare={result ? () => share("เลขจาก AI", result) : null}
      />
    </>
  );
}

function TemplePage({ saveResult, share, notify }) {
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
    setResult(
      makeNumberSet(
        hashText(`${allNumbers}-${todayInputValue()}-temple`),
        ranked.slice(0, 3).map((item) => item.digit)
      )
    );
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
        <button className="primary-button standalone" type="button" onClick={analyze}>
          ✦ วิเคราะห์เลขจากข้อมูลทั้งหมด
        </button>
      ) : null}

      <NumberResult
        result={result}
        title="เลขเด่นจากข้อมูลที่บันทึก"
        note={`วิเคราะห์จาก ${records.length} แหล่งข้อมูลที่บันทึกไว้ในอุปกรณ์นี้`}
        onSave={result ? () => saveResult("เลขจากวัดดัง", result, `${records.length} แหล่งข้อมูล`) : null}
        onShare={result ? () => share("เลขจากวัดดัง", result) : null}
      />
    </>
  );
}

function MemberPage({ saveResult, share, notify }) {
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
      const parsed = saved.birthDate ? new Date(`${saved.birthDate}T12:00:00`) : new Date();
      const day = THAI_DAYS[parsed.getDay()];
      setResult(makeNumberSet(hashText(JSON.stringify(saved)), [day.digit]));
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
    const parsed = new Date(`${birthDate}T12:00:00`);
    const day = THAI_DAYS[parsed.getDay()];
    const nextResult = makeNumberSet(hashText(JSON.stringify(nextProfile)), [day.digit]);
    setProfile(nextProfile);
    setResult(nextResult);
    writeLocal("lucky_member_profile", nextProfile);
    notify("บันทึกดวงสมาชิกแล้ว");
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
        <button className="primary-button" type="submit">
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
      />
    </>
  );
}

function HistoryPage({ history, clearHistory, share }) {
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
                <div className="history-bottom">
                  <span>2 ตัว: {item.result.two.join(" • ")}</span>
                  <button className="text-button" type="button" onClick={() => share(item.title, item.result)}>
                    แชร์ ↗
                  </button>
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

function HomePage({ openView }) {
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
  const appShellRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    setHistory(readLocal("lucky_number_history", []));
    setSoundEnabled(readLocal(SOUND_STORAGE_KEY, true) !== false);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
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
        if (audioContext.state === "suspended") {
          audioContext.resume().catch(() => undefined);
        }

        if (kind === "magic") {
          playTone(audioContext, 523.25, 0, 0.1, 0.075);
          playTone(audioContext, 783.99, 0.045, 0.13, 0.052);
        } else if (kind === "toggle") {
          playTone(audioContext, 659.25, 0, 0.11, 0.065);
        } else {
          playTone(audioContext, 440, 0, 0.075, 0.045);
        }
      } catch {
        // Some embedded browsers block Web Audio. Buttons still work normally.
      }
    },
    [soundEnabled]
  );

  useEffect(() => {
    const shell = appShellRef.current;
    if (!shell) return undefined;

    const handleButtonClick = (event) => {
      const button = event.target instanceof Element ? event.target.closest("button") : null;
      if (!button || !shell.contains(button) || button.disabled) return;

      const isSoundToggle = button.dataset.soundToggle === "true";
      const isMagicAction = button.matches(".menu-card, .primary-button");
      playButtonSound(
        isSoundToggle ? "toggle" : isMagicAction ? "magic" : "tap",
        isSoundToggle && !soundEnabled
      );

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
  }, [playButtonSound, soundEnabled]);

  useEffect(
    () => () => {
      const audioContext = audioContextRef.current;
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => undefined);
      }
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

  const toggleSound = () => {
    const nextValue = !soundEnabled;
    setSoundEnabled(nextValue);
    writeLocal(SOUND_STORAGE_KEY, nextValue);
    notify(nextValue ? "เปิดเสียงเอฟเฟกต์แล้ว" : "ปิดเสียงเอฟเฟกต์แล้ว");
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
    const text = `${title}\n${resultSummary(result)}\nเพื่อความบันเทิงและความเชื่อส่วนบุคคล`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "AI ให้เลขเด็ด", text });
      } else {
        await navigator.clipboard.writeText(text);
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
            className={soundEnabled ? "topbar-button sound-toggle active" : "topbar-button sound-toggle"}
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? "ปิดเสียงเอฟเฟกต์" : "เปิดเสียงเอฟเฟกต์"}
            aria-pressed={soundEnabled}
            data-sound-toggle="true"
            title={soundEnabled ? "ปิดเสียง" : "เปิดเสียง"}
          >
            <span aria-hidden="true">{soundEnabled ? "🔊" : "🔇"}</span>
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
        {view === "home" ? <HomePage openView={setView} /> : null}
        {view === "daily" ? <DailyPage saveResult={saveResult} share={share} /> : null}
        {view === "dream" ? <DreamPage saveResult={saveResult} share={share} /> : null}
        {view === "social" ? <SocialPage saveResult={saveResult} share={share} /> : null}
        {view === "ai" ? <AIPage saveResult={saveResult} share={share} /> : null}
        {view === "temple" ? (
          <TemplePage saveResult={saveResult} share={share} notify={notify} />
        ) : null}
        {view === "member" ? (
          <MemberPage saveResult={saveResult} share={share} notify={notify} />
        ) : null}
        {view === "history" ? (
          <HistoryPage history={history} clearHistory={clearHistory} share={share} />
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
