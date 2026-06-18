// scripts/fetch-data.mjs
// GitHub Actions(서버)에서 실행 → public/data.json 생성.
// 데이터: Finnhub (시세+뉴스), 분석: Claude(선택, 시크릿 있을 때).
// 실패해도 죽지 않는다: 부분 데이터라도 항상 data.json을 쓴다.
//
// 필요한 시크릿:
//   FINNHUB_API_KEY    (필수: 시세·뉴스)   https://finnhub.io 무료 가입
//   ANTHROPIC_API_KEY  (선택: AI 분석)
//   CLAUDE_MODEL       (선택: 기본 claude-sonnet-4-6, 더 높은 버전은 claude-opus-4-8)

import { writeFileSync, mkdirSync } from "node:fs";

const FINNHUB = process.env.FINNHUB_API_KEY;
const FH = "https://finnhub.io/api/v1";

// Finnhub 무료는 지수 원본을 잘 안 줌 → 미국 상장 ETF를 지수 프록시로 사용.
// (실제로 매수 가능한 종목이라 초보에겐 더 직관적)
const SYMBOLS = [
  { sym: "SPY", name: "S&P 500 (SPY)" },
  { sym: "QQQ", name: "나스닥100 (QQQ)" },
  { sym: "EWY", name: "한국 (EWY)" },
  { sym: "EEM", name: "신흥국 (EEM)" },
];

/* ---------- 시세: Finnhub /quote ---------- */
async function fetchQuote({ sym, name }) {
  try {
    if (!FINNHUB) throw new Error("FINNHUB_API_KEY 없음");
    const r = await fetch(`${FH}/quote?symbol=${sym}&token=${FINNHUB}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const q = await r.json(); // { c, d, dp, h, l, o, pc }
    if (q.c == null || q.c === 0) throw new Error("no price");
    // 무료 티어는 과거 캔들 제한 → 당일 흐름만 간이 스파크로 (pc→o→l/h→c)
    const spark = [q.pc, q.o, q.l, q.h, q.c].filter((v) => typeof v === "number" && v > 0);
    return { name, value: q.c, change: +(q.dp ?? 0).toFixed(2), spark: spark.length ? spark : [q.c] };
  } catch (e) {
    console.warn(`[market] ${name}(${sym}) 실패:`, e.message);
    return null;
  }
}
async function getMarket() {
  const out = await Promise.all(SYMBOLS.map(fetchQuote));
  return out.filter(Boolean);
}

/* ---------- 뉴스: Finnhub /news (general) + 24h 필터 ---------- */
function relTime(unixSec) {
  const diffH = Math.round((Date.now() - unixSec * 1000) / 36e5);
  if (diffH < 1) return "방금 전";
  if (diffH < 24) return `${diffH}시간 전`;
  return `${Math.round(diffH / 24)}일 전`;
}
async function getNews(limit = 6) {
  try {
    if (!FINNHUB) throw new Error("FINNHUB_API_KEY 없음");
    const r = await fetch(`${FH}/news?category=general&token=${FINNHUB}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const arr = await r.json();
    const cutoff = Date.now() / 1000 - 24 * 3600; // 24시간
    return (Array.isArray(arr) ? arr : [])
      .filter((n) => n.headline && n.datetime >= cutoff)
      .slice(0, limit)
      .map((n) => ({
        title: n.headline,
        source: n.source || "출처 미상",
        time: relTime(n.datetime),
        tag: (n.category || "시장"),
        summary: n.summary || "",
        why: "",
      }));
  } catch (e) {
    console.warn("[news] 실패:", e.message);
    return [];
  }
}

/* ---------- 관심종목 자동 시세: watchlist.json 의 티커들 ---------- */
import { readFileSync, existsSync } from "node:fs";
async function getQuotes() {
  const quotes = {};
  try {
    if (!FINNHUB || !existsSync("watchlist.json")) return quotes;
    const list = JSON.parse(readFileSync("watchlist.json", "utf8"));
    for (const item of Array.isArray(list) ? list : []) {
      const sym = (item.symbol || "").toUpperCase();
      if (!sym) continue;
      try {
        const r = await fetch(`${FH}/quote?symbol=${sym}&token=${FINNHUB}`);
        if (!r.ok) continue;
        const q = await r.json();
        if (q.c != null && q.c !== 0) quotes[sym] = { price: q.c, change: +(q.dp ?? 0).toFixed(2) };
      } catch { /* 개별 실패 무시 */ }
    }
  } catch (e) {
    console.warn("[quotes] 실패:", e.message);
  }
  return quotes;
}

/* ---------- 환율 USD/KRW (무료·키 없음) ---------- */
async function getFx() {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    return j?.rates?.KRW || 0;
  } catch (e) {
    console.warn("[fx] 실패:", e.message);
    return 0;
  }
}

/* ---------- AI: 시장 자세 분석 (선택) ---------- */
// 결과 스키마: { posture, confidence, summary, reasons[], risks[], watch[] }
// posture ∈ 관망 | 분할매수 | 비중축소 | 회피
async function translateNews(news) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || news.length === 0) return news;
  try {
    const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
    const list = news.slice(0, 6).map((n, i) => `${i + 1}. ${n.title}`).join("\n");
    const prompt =
`다음 영문 증시 뉴스 헤드라인을 한국어로 번역하고, 각 항목이 한국 주식 초보에게 왜 중요한지 한 문장(40자 내외)으로 덧붙여라.
반드시 JSON 배열만 출력: [{"i":1,"title":"한국어 제목","why":"왜 중요한지"}, ...]. 다른 텍스트 금지.

${list}`;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const text = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    const arr = JSON.parse(text.replace(/```json|```/g, "").trim());
    for (const item of arr) {
      const n = news[item.i - 1];
      if (n) { if (item.title) n.title = item.title; if (item.why) n.why = item.why; n.summary = ""; }
    }
  } catch (e) {
    console.warn("[news translate] 생략:", e.message);
  }
  return news;
}

/* ---------- 실행 ---------- */
async function main() {
  const [market, rawNews, quotes, fxUsdKrw] = await Promise.all([getMarket(), getNews(), getQuotes(), getFx()]);
  const news = await translateNews(rawNews);
  const data = { updatedAt: new Date().toISOString(), market, news, quotes, fxUsdKrw };
  mkdirSync("public", { recursive: true });
  writeFileSync("public/data.json", JSON.stringify(data, null, 2));
  console.log(`data.json 완료: 시세 ${market.length}, 뉴스 ${news.length}, 관심종목 ${Object.keys(quotes).length}, 환율 ${fxUsdKrw || "X"}`);
}
main();
