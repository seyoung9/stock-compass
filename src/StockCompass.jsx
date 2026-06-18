import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  AreaChart, Area, XAxis, YAxis,
} from "recharts";
import {
  ArrowUpRight, ArrowDownRight, Plus, Trash2, ChevronDown,
  Circle, Settings, Sparkles, AlertTriangle, X,
} from "lucide-react";

/* ============================================================
   디자인 토큰 — 화이트 극단 미니멀 (Linear/Notion 계열)
   그레이스케일 베이스 + 인디고 단색 액센트, 손익만 녹/적
   ============================================================ */
const C = {
  bg: "#FFFFFF",
  panel: "#FFFFFF",
  tint: "#F7F8FA",      // 옅은 섹션 틴트
  tint2: "#F1F2F5",
  border: "#EAEBEF",    // 헤어라인
  ink: "#17181B",       // 거의 검정 텍스트
  soft: "#6B6F76",      // 보조 텍스트
  faint: "#9CA1A9",     // 흐린 라벨
  accent: "#5B5BD6",    // 인디고 (브랜드/AI)
  accentSoft: "#EEEEFB",
  up: "#15936B",        // 수익
  upSoft: "#E7F4EE",
  down: "#DC4B46",      // 손실
  downSoft: "#FBE9E9",
  amber: "#B0791B",
  amberSoft: "#F8F0DD",
  white: "#FFFFFF",
};
const FONT = "'Inter', system-ui, -apple-system, 'Apple SD Gothic Neo', 'Pretendard', 'Malgun Gothic', sans-serif";
const NUM = { fontVariantNumeric: "tabular-nums" };

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n) => krw.format(Math.round(n || 0));
const pct = (n) => `${n >= 0 ? "+" : ""}${(n || 0).toFixed(2)}%`;
const todayStr = () =>
  new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });

/* ============================================================
   예시 데이터 (data.json 없을 때 폴백)
   ============================================================ */
const SAMPLE_MARKET = [
  { name: "S&P 500", value: 5478.1, change: 0.28, spark: [5440, 5455, 5448, 5470, 5462, 5475, 5478] },
  { name: "나스닥100", value: 19320, change: 0.41, spark: [19180, 19250, 19210, 19300, 19280, 19310, 19320] },
  { name: "한국 ETF", value: 62.4, change: -0.32, spark: [62.9, 62.7, 62.8, 62.5, 62.6, 62.3, 62.4] },
  { name: "신흥국", value: 44.1, change: 0.12, spark: [43.9, 44.0, 43.95, 44.05, 44.0, 44.08, 44.1] },
];
const SAMPLE_NEWS = [
  { title: "미 연준, 금리 동결… 연내 인하 가능성 시사", source: "예시 출처", time: "2시간 전", tag: "거시", why: "금리는 주가의 중력. 인하 신호는 위험자산에 우호적이지만 '시사'는 확정이 아니다." },
  { title: "반도체 수출 3개월 연속 증가", source: "예시 출처", time: "5시간 전", tag: "산업", why: "한국 시장은 반도체 비중이 크다. 수출 개선은 대형주 심리에 영향." },
  { title: "개인 신용융자 잔고 다시 증가세", source: "예시 출처", time: "8시간 전", tag: "수급", why: "빚투가 늘면 변동성↑. 초보에겐 과열 경고 신호로 읽는다." },
];

const KNOWLEDGE = [
  { cat: "기본", term: "분산투자", body: "한 종목에 몰빵하지 않고 여러 자산에 나누는 것. 100만원이면 1~2종목 몰빵이 가장 흔한 초보 실수다. 한 종목이 망해도 전체가 안 죽게 만드는 게 핵심." },
  { cat: "기본", term: "ETF", body: "여러 종목을 한 바구니에 담아 통째로 사는 상품. 개별주 고르는 부담 없이 시장 전체에 분산투자하는 가장 쉬운 방법. 예: KODEX 200." },
  { cat: "기본", term: "평단가", body: "내가 산 평균 가격. 10주를 1만원, 10주를 2만원에 샀다면 평단가는 1만 5천원. 수익·손실의 기준점." },
  { cat: "기본", term: "수익률 계산", body: "(현재가 − 평단가) ÷ 평단가 × 100. 평단가 1만원, 현재가 1만 1천원이면 +10%. 단, 수수료·세금 빼면 실수익은 더 작다." },
  { cat: "리스크", term: "손절(스톱)", body: "정해둔 손실 선에서 파는 것. '얼마 떨어지면 판다'를 사기 전에 정하지 않으면, 떨어질 때 감정으로 버티다 더 크게 잃는다." },
  { cat: "리스크", term: "물타기", body: "떨어진 종목을 더 사서 평단가를 낮추는 행위. 초보에겐 위험. 떨어지는 칼날을 잡는 것일 수 있다. 산 이유가 살아있을 때만 신중히." },
  { cat: "리스크", term: "변동성", body: "가격이 출렁이는 정도. 크면 빨리 벌 수도, 빨리 잃을 수도 있다. 초보는 변동성 큰 테마주·소형주부터 멀리." },
  { cat: "리스크", term: "공매도", body: "주식을 빌려 팔고 나중에 싸게 사서 갚아 차익을 노리는 것. 가격이 내릴 때 돈을 번다. '공매도 많은 종목=하락 베팅 많음' 신호로 읽는다." },
  { cat: "주문", term: "시장가 vs 지정가", body: "시장가는 '지금 값에 무조건 체결', 지정가는 '내가 정한 값에만 체결'. 초보는 급할 때 시장가로 비싸게 사는 실수가 잦다. 웬만하면 지정가." },
  { cat: "주문", term: "호가·체결", body: "호가는 사려는·팔려는 사람들이 줄 선 가격표. 그 사이를 오가며 거래가 체결된다. 거래량 적은 종목은 원하는 값에 안 팔릴 수 있다." },
  { cat: "주문", term: "거래량", body: "하루에 사고팔린 수량. 너무 적으면 내가 팔고 싶을 때 사줄 사람이 없어 못 팔 수 있다(유동성 위험)." },
  { cat: "지표", term: "PER", body: "주가 ÷ 주당순이익. '이익 대비 주가가 비싼가'를 보는 잣대. 같은 업종끼리 비교할 때 의미. 무조건 낮다고 좋은 건 아니다." },
  { cat: "지표", term: "PBR", body: "주가 ÷ 주당순자산. '회사가 가진 것 대비 주가'. 1 미만이면 자산보다 싸게 거래되는 셈이지만 싼 데는 이유가 있을 수 있다." },
  { cat: "지표", term: "시가총액", body: "주가 × 총 주식 수 = 회사의 시장 가격표. 클수록 대체로 안정적·덜 출렁. 초보는 대형주부터 익히는 게 안전." },
  { cat: "지표", term: "배당", body: "회사가 이익을 주주에게 나눠주는 돈. 배당주는 주가가 안 올라도 현금이 들어온다. 장기·안정 지향 초보에게 우호적." },
  { cat: "전략", term: "분할매수", body: "한 번에 다 사지 않고 여러 번 나눠 사는 것. 비싸게 한 번에 다 사는 위험을 줄인다. 100만원이면 3~4회 나눠 진입." },
  { cat: "전략", term: "적립식·달러비용평균", body: "매달 같은 금액을 꾸준히 사는 방식. 쌀 때 더 많이, 비쌀 때 덜 사게 돼 평단가가 평탄해진다. 타이밍 못 잡는 초보에게 강력." },
  { cat: "전략", term: "복리", body: "번 돈에 또 이자가 붙는 눈덩이 효과. 시간이 길수록 위력이 커진다. 100만원이 작아 보여도 꾸준함+시간이 핵심." },
  { cat: "전략", term: "리밸런싱", body: "한쪽이 너무 커지면 비중을 원래대로 되돌리는 정리. 오른 걸 일부 팔고 빠진 걸 채워 위험을 일정하게 유지." },
  { cat: "심리", term: "공포·탐욕", body: "남들 살 때 사고 싶고(탐욕), 떨어지면 팔고 싶다(공포). 이 감정이 초보를 '비싸게 사서 싸게 팔게' 만든다. 규칙으로 감정을 이긴다." },
];
const GLOSSARY = [
  { q: "평단가가 뭐죠?", a: "내가 산 평균 가격. 10주를 1만원, 10주를 2만원에 샀다면 평단가는 1만 5천원." },
  { q: "수익률은 어떻게 계산?", a: "(현재가 − 평단가) ÷ 평단가 × 100. 평단가 1만원, 현재가 1만 1천원이면 +10%." },
  { q: "수수료·세금은요?", a: "살 때·팔 때 수수료, 팔 때 거래세가 붙는다. 단기로 자주 사고팔면 이게 수익을 갉아먹는다." },
  { q: "왜 ETF부터 권하나요?", a: "개별 종목은 회사 하나가 망하면 큰 타격. ETF는 수십~수백 종목에 자동 분산돼 초보 리스크가 낮다." },
];

/* ============================================================
   스토리지 심 — 환경 자동 대응
   실제 사이트: localStorage / 미리보기: window.storage / 최후: 메모리
   ============================================================ */
const _mem = {};
const storage = {
  async get(k) {
    try { if (typeof window !== "undefined" && window.storage) return await window.storage.get(k); } catch { /* */ }
    try { const v = localStorage.getItem(k); return v == null ? null : { value: v }; } catch { /* */ }
    return k in _mem ? { value: _mem[k] } : null;
  },
  async set(k, v) {
    try { if (typeof window !== "undefined" && window.storage) return await window.storage.set(k, v); } catch { /* */ }
    try { localStorage.setItem(k, v); return; } catch { /* */ }
    _mem[k] = v;
  },
};

/* ============================================================
   데이터 로더 (상대경로 → Pages·미리보기·PWA 모두 호환)
   ============================================================ */
const DATA_URL = "data.json";

/* ★ 소유자가 1회만 설정: 배포한 Cloudflare Worker 주소를 여기 붙여넣고 push.
   비워두면 AI 코칭 대신 규칙 기반으로 동작(가족도 그대로 사용 가능).
   이 주소 하나면 너도 가족도 추가 설정 없이 각자 종목으로 코칭을 받는다. */
const WORKER_URL = "";
async function loadData() {
  try {
    const r = await fetch(DATA_URL, { cache: "no-store" });
    if (!r.ok) return null;
    const d = await r.json();
    return (d && (d.market || d.news)) ? d : null;
  } catch { return null; }
}

/* 매도 판정 (규칙 노출형) */
function sellVerdict(h) {
  const { price, target, stop } = h;
  if (stop && price <= stop) return { tone: "down", label: "손절 도달", msg: "정한 손절가 이하. 감정 빼고 매도 검토." };
  if (target && price >= target) return { tone: "up", label: "목표 도달", msg: "목표가 달성. 일부 익절 또는 목표 재설정 검토." };
  if (!target && !stop) return { tone: "amber", label: "기준 없음", msg: "목표가·손절가 둘 다 없음 = 가장 위험. 먼저 정해라." };
  return { tone: "soft", label: "보유 중", msg: "정한 기준 안. 그대로 유지." };
}

/* ============================================================
   상태 훅
   ============================================================ */
function usePortfolio() {
  const [holdings, setHoldings] = useState([]);
  const [cash, setCash] = useState(1000000);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await storage.get("compass:portfolio");
        if (alive && r?.value) {
          const d = JSON.parse(r.value);
          setHoldings(d.holdings || []);
          setCash(typeof d.cash === "number" ? d.cash : 1000000);
        }
      } catch { /* 첫 사용 */ }
      if (alive) setLoaded(true);
    })();
    return () => { alive = false; };
  }, []);
  const update = useCallback((nextHoldings, nextCash) => {
    setHoldings(nextHoldings); setCash(nextCash);
    storage.set("compass:portfolio", JSON.stringify({ holdings: nextHoldings, cash: nextCash })).catch(() => {});
  }, []);
  return { holdings, cash, loaded, update };
}

function useHistory(totalValue, loaded) {
  const [history, setHistory] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try { const r = await storage.get("compass:history"); if (alive && r?.value) setHistory(JSON.parse(r.value)); }
      catch { /* 없음 */ }
    })();
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!loaded || totalValue <= 0) return;
    const today = new Date().toISOString().slice(0, 10);
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      const next = last && last.date === today
        ? [...prev.slice(0, -1), { date: today, value: Math.round(totalValue) }]
        : [...prev, { date: today, value: Math.round(totalValue) }];
      const trimmed = next.slice(-180);
      storage.set("compass:history", JSON.stringify(trimmed)).catch(() => {});
      return trimmed;
    });
  }, [totalValue, loaded]);
  return history;
}

function useSettings() {
  const [analyzeUrl, setAnalyzeUrl] = useState("");
  const [notify, setNotify] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try { const r = await storage.get("compass:settings"); if (alive && r?.value) { const s = JSON.parse(r.value); setAnalyzeUrl(s.analyzeUrl || ""); setNotify(!!s.notify); } }
      catch { /* 없음 */ }
    })();
    return () => { alive = false; };
  }, []);
  const save = useCallback((s) => {
    setAnalyzeUrl(s.analyzeUrl ?? ""); setNotify(!!s.notify);
    storage.set("compass:settings", JSON.stringify(s)).catch(() => {});
  }, []);
  return { analyzeUrl, notify, save };
}

/* AI 코칭: Worker 호출 → 하루+종목 단위 캐시 (가족 포함 자동) */
function useCoaching({ market, news, enriched, cashPct, ready }) {
  const [coaching, setCoaching] = useState(null);
  const [loading, setLoading] = useState(false);

  const sig = useMemo(() => {
    const day = new Date().toISOString().slice(0, 10);
    const h = enriched.map((x) => `${x.name}:${x.qty}:${x.avg}:${x.target}:${x.stop}`).join("|");
    return `${day}#${Math.round(cashPct)}#${h}`;
  }, [enriched, cashPct]);

  useEffect(() => {
    if (!ready || !WORKER_URL) return;
    let alive = true;
    (async () => {
      // 캐시 확인
      try {
        const r = await storage.get("compass:coach");
        if (r?.value) {
          const c = JSON.parse(r.value);
          if (c.sig === sig && c.data) { if (alive) setCoaching(c.data); return; }
        }
      } catch { /* */ }
      // 새로 호출
      if (alive) setLoading(true);
      try {
        const body = {
          market,
          news: (news || []).slice(0, 6).map((n) => n.title),
          holdings: enriched.map((h) => ({ name: h.name, symbol: h.symbol, qty: h.qty, avg: h.avg, price: h.price, target: h.target, stop: h.stop, currency: h.currency })),
          cashPct: Math.round(cashPct),
        };
        const res = await fetch(WORKER_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!alive) return;
        setCoaching(data);
        storage.set("compass:coach", JSON.stringify({ sig, data })).catch(() => {});
      } catch { /* 실패 시 규칙 기반 폴백 */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [sig, ready, market, news]);

  return { coaching, coachLoading: loading };
}

/* 규칙 진단 */
function buildAdvice({ holdings, cash, totalValue }) {
  const invested = totalValue - cash;
  const cashPct = totalValue > 0 ? (cash / totalValue) * 100 : 100;
  const rules = [];
  if (cashPct < 15) rules.push({ tone: "down", rule: "현금 비중 15% 미만", msg: "거의 다 투자됨. 떨어질 때 받칠 여력도 기회도 없다. 추격매수 자제." });
  else if (cashPct > 80 && invested > 0) rules.push({ tone: "soft", rule: "현금 비중 80% 초과", msg: "아직 거의 안 들어감. 한 번에 다 넣지 말고 나눠서 진입 고려." });
  const maxStock = holdings.reduce((m, h) => Math.max(m, h.wonValue ?? h.qty * h.price), 0);
  const concPct = invested > 0 ? (maxStock / invested) * 100 : 0;
  if (concPct > 40 && holdings.length >= 1) rules.push({ tone: "amber", rule: "한 종목이 투자금의 40% 초과", msg: "집중 위험. 그 종목 하나가 무너지면 전체가 흔들린다. 분산 고려." });
  if (invested > 0 && holdings.length === 1) rules.push({ tone: "amber", rule: "보유 종목 1개", msg: "분산 안 됨. 초보 100만원이면 ETF 1~2개가 개별주 몰빵보다 안전." });
  if (totalValue <= 1500000) rules.push({ tone: "soft", rule: "소액(150만원 이하) 운용", msg: "잦은 매매는 수수료·세금에 먹힌다. 단기 회전보다 적립·분산이 유리." });

  let headline, tone, posture;
  if (rules.some((r) => r.tone === "down")) { headline = "새로 사기 전에 현금부터 확보."; tone = "down"; posture = "비중축소"; }
  else if (rules.some((r) => r.tone === "amber")) { headline = "보유는 OK. 단, 분산을 손봐라."; tone = "amber"; posture = "관망"; }
  else if (invested === 0) { headline = "오늘은 고르는 날. 한 번에 다 넣지 말고 ETF부터 나눠서."; tone = "accent"; posture = "분할매수"; }
  else { headline = "특별한 경고 없음. 정한 원칙대로 유지."; tone = "up"; posture = "관망"; }
  return { headline, tone, posture, rules, cashPct, concPct, invested };
}

const POSTURE_TONE = { 분할매수: "up", 관망: "accent", 비중축소: "amber", 회피: "down" };
const toneColor = (t) => ({ up: C.up, down: C.down, amber: C.amber, accent: C.accent, soft: C.soft }[t] || C.soft);
const toneSoft = (t) => ({ up: C.upSoft, down: C.downSoft, amber: C.amberSoft, accent: C.accentSoft, soft: C.tint2 }[t] || C.tint2);

/* ============================================================
   원자 UI
   ============================================================ */
function Panel({ children, style }) {
  return <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, boxShadow: "0 1px 2px rgba(16,17,26,0.03), 0 2px 8px rgba(16,17,26,0.04)", ...style }}>{children}</div>;
}
function Eye({ children, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: C.faint }}>{children}</span>
      {right}
    </div>
  );
}
function Chip({ tone = "soft", children, solid }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
      padding: "3px 9px", borderRadius: 7,
      background: solid ? toneColor(tone) : toneSoft(tone), color: solid ? C.white : toneColor(tone),
    }}>{children}</span>
  );
}
function Spark({ data, tone }) {
  const d = data.map((v, i) => ({ i, v }));
  const col = toneColor(tone);
  return (
    <ResponsiveContainer width="100%" height={28}>
      <AreaChart data={d} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <defs>
          <linearGradient id={`sp-${tone}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity={0.18} />
            <stop offset="100%" stopColor={col} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={col} strokeWidth={1.5} fill={`url(#sp-${tone})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
const inputStyle = { border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 12px", fontSize: 14, width: "100%", color: C.ink, background: C.panel, fontFamily: FONT, boxSizing: "border-box" };
function Btn({ children, onClick, kind = "primary", disabled, style }) {
  const base = { border: "none", borderRadius: 9, padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: disabled ? "default" : "pointer", fontFamily: FONT, opacity: disabled ? 0.5 : 1 };
  const kinds = {
    primary: { background: C.ink, color: C.white },
    accent: { background: C.accent, color: C.white },
    ghost: { background: C.tint, color: C.ink, border: `1px solid ${C.border}` },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...kinds[kind], ...style }}>{children}</button>;
}

/* ============================================================
   브리핑 만들기
   ============================================================ */
function buildBrief(advice, enriched, analysis) {
  const posture = analysis?.posture || advice.posture;
  const confidence = analysis?.confidence || "낮음";
  const headline = analysis?.summary || advice.headline;

  let impact;
  if (advice.invested === 0) impact = "아직 보유 종목이 없다. 오늘은 사는 날이 아니라 고르는 날.";
  else {
    const totCost = enriched.reduce((s, h) => s + h.wonCost, 0);
    const totVal = enriched.reduce((s, h) => s + h.wonValue, 0);
    const pl = totCost > 0 ? ((totVal - totCost) / totCost) * 100 : 0;
    const hit = enriched.map((h) => sellVerdict(h)).filter((v) => v.tone === "down" || v.tone === "up").length;
    impact = `보유 ${enriched.length}종목 · 평가손익 ${pct(pl)} · 현금 ${advice.cashPct.toFixed(0)}%` + (hit ? ` · 기준 도달 ${hit}건` : "");
  }
  let actions = [];
  if (analysis) actions = [...(analysis.reasons || []), ...(analysis.watch || [])].slice(0, 3);
  if (actions.length === 0) actions = advice.rules.map((r) => r.msg).slice(0, 3);
  if (actions.length === 0) actions = ["종목마다 목표가·손절가부터 정하기", "한 번에 다 넣지 말고 나눠 사기", "모르는 종목은 사지 않기"];
  return { posture, confidence, headline, impact, actions };
}

function BriefTab({ market, news, advice, coaching, coachLoading, enriched, fx, goLearn }) {
  const fb = buildBrief(advice, enriched, null); // 폴백(규칙 기반)
  const posture = coaching?.posture || fb.posture;
  const confidence = coaching?.confidence || fb.confidence;
  const headline = coaching?.headline || fb.headline;
  const impact = coaching?.impact || fb.impact;
  const actions = (coaching?.actions?.length ? coaching.actions : fb.actions).slice(0, 3);
  const knowledge = coaching?.knowledge?.term ? coaching.knowledge : KNOWLEDGE[new Date().getDate() % KNOWLEDGE.length];
  const ptone = POSTURE_TONE[posture] || "accent";
  const wb = { wordBreak: "keep-all" };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* 시그니처: 오늘의 브리핑 */}
      <Panel style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <Chip tone={ptone} solid><Sparkles size={12} /> {posture}</Chip>
          <span style={{ fontSize: 12, color: C.faint }}>확신도 {confidence}</span>
          {coaching && <span style={{ fontSize: 11, color: C.accent, background: C.accentSoft, padding: "2px 7px", borderRadius: 6, fontWeight: 600 }}>AI 코칭</span>}
          <span style={{ fontSize: 12, color: C.faint, marginLeft: "auto" }}>{todayStr()}</span>
        </div>
        <div style={{ fontSize: 21, fontWeight: 680, lineHeight: 1.45, letterSpacing: -0.3, color: C.ink, ...wb }}>
          {coachLoading && !coaching ? "오늘의 코칭을 불러오는 중…" : headline}
        </div>
        <div style={{ fontSize: 14, color: C.soft, marginTop: 12, lineHeight: 1.6, ...wb, ...NUM }}>{impact}</div>

        <div style={{ marginTop: 18, borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "grid", gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: C.faint }}>오늘 할 일</span>
          {actions.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, background: C.accentSoft, width: 19, height: 19, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
              <span style={{ fontSize: 14, color: C.ink, lineHeight: 1.55, ...wb }}>{a}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.faint, marginTop: 16, lineHeight: 1.5, ...wb }}>
          교육용 의견. 미래 예측·매매 권유 아님. 체결은 증권사 앱에서, 판단은 여기서.
        </div>
      </Panel>

      {/* 시장 */}
      <Panel>
        <Eye right={fx > 0 ? <span style={{ fontSize: 11, color: C.faint, ...NUM }}>환율 {fmt(fx)}</span> : null}>시장</Eye>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 16 }}>
          {market.map((m) => {
            const t = m.change >= 0 ? "up" : "down";
            return (
              <div key={m.name}>
                <div style={{ fontSize: 12, color: C.soft, ...wb }}>{m.name}</div>
                <div style={{ fontSize: 18, fontWeight: 680, color: C.ink, ...NUM }}>{fmt(m.value)}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: toneColor(t), display: "flex", alignItems: "center", gap: 2, ...NUM }}>
                  {m.change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{pct(m.change)}
                </div>
                <div style={{ marginTop: 3 }}><Spark data={m.spark} tone={t} /></div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* 뉴스 */}
      <Panel>
        <Eye>오늘의 뉴스 · 왜 중요한가</Eye>
        <div style={{ display: "grid", gap: 16 }}>
          {news.map((n, i) => (
            <div key={i} style={{ paddingBottom: i < news.length - 1 ? 16 : 0, borderBottom: i < news.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 5 }}>
                <Chip>{n.tag}</Chip>
                <span style={{ fontSize: 11, color: C.faint }}>{n.source} · {n.time}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 620, color: C.ink, lineHeight: 1.45, ...wb }}>{n.title}</div>
              {(n.why || n.summary) && <div style={{ fontSize: 13, color: C.soft, marginTop: 5, lineHeight: 1.55, ...wb }}>{n.why || n.summary}</div>}
            </div>
          ))}
        </div>
      </Panel>

      {/* 오늘의 지식 */}
      <Panel style={{ background: C.tint, border: "none", boxShadow: "none" }}>
        <Eye right={<button onClick={goLearn} style={{ fontSize: 12, color: C.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: FONT }}>사전 →</button>}>
          오늘의 지식{coaching?.knowledge?.term ? " · AI 추천" : ""}
        </Eye>
        <div style={{ fontSize: 16, fontWeight: 680, color: C.ink }}>{knowledge.term}</div>
        <div style={{ fontSize: 14, color: C.soft, marginTop: 7, lineHeight: 1.65, ...wb }}>{knowledge.body}</div>
      </Panel>
    </div>
  );
}

/* ============================================================
   포지션 (자산 + 판단 통합)
   ============================================================ */
function PositionTab({ holdings, enriched, cash, update, totalValue, history, advice, hasExitPlan, setHasExitPlan }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", symbol: "", currency: "KRW", qty: "", avg: "", price: "", target: "", stop: "" });

  const rows = useMemo(() => enriched.map((h) => {
    const value = h.wonValue, cost = h.wonCost;
    const plPct = cost > 0 ? ((value - cost) / cost) * 100 : 0;
    return { ...h, value, plAmt: value - cost, plPct, verdict: sellVerdict(h) };
  }), [enriched]);

  const totCost = rows.reduce((s, r) => s + r.wonCost, 0);
  const totPlPct = totCost > 0 ? ((totalValue - cash - totCost) / totCost) * 100 : 0;
  const pie = useMemo(() => {
    const arr = rows.map((r) => ({ name: r.name, value: r.value }));
    if (cash > 0) arr.push({ name: "현금", value: cash });
    return arr;
  }, [rows, cash]);
  const PIE = [C.accent, C.up, "#8B8BE6", "#5FB99A", C.amber, C.tint2];

  const add = () => {
    const qty = +form.qty, avg = +form.avg, price = +form.price || +form.avg;
    if (!form.name || !qty || !avg) return;
    update([...holdings, { id: Date.now(), name: form.name, symbol: form.symbol.trim().toUpperCase(), currency: form.currency, qty, avg, price, target: +form.target || 0, stop: +form.stop || 0 }], cash);
    setForm({ name: "", symbol: "", currency: "KRW", qty: "", avg: "", price: "", target: "", stop: "" });
    setShowForm(false);
  };
  const remove = (id) => update(holdings.filter((h) => h.id !== id), cash);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* 요약 */}
      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 12, color: C.faint }}>총 평가액</div>
            <div style={{ fontSize: 28, fontWeight: 680, color: C.ink, letterSpacing: -0.5, ...NUM }}>{fmt(totalValue)}<span style={{ fontSize: 15, color: C.soft, marginLeft: 2 }}>원</span></div>
            {rows.length > 0 && <div style={{ fontSize: 13, fontWeight: 600, color: toneColor(totPlPct >= 0 ? "up" : "down"), marginTop: 2, ...NUM }}>{pct(totPlPct)} 평가손익</div>}
          </div>
          <div style={{ width: 96, height: 96 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={28} outerRadius={46} paddingAngle={2} isAnimationActive={false} stroke="none">
                  {pie.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Pie>
                <RTooltip formatter={(v) => `${fmt(v)}원`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
          <span style={{ fontSize: 12, color: C.soft, whiteSpace: "nowrap" }}>현금</span>
          <input style={{ ...inputStyle, padding: "7px 10px" }} type="number" value={cash} onChange={(e) => update(holdings, +e.target.value || 0)} />
        </div>
      </Panel>

      {/* 보유 종목 */}
      <Panel>
        <Eye right={<button onClick={() => setShowForm((s) => !s)} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: C.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: FONT }}>{showForm ? <><X size={13} /> 닫기</> : <><Plus size={13} /> 종목 추가</>}</button>}>보유 종목 {rows.length > 0 && `· ${rows.length}`}</Eye>

        {showForm && (
          <div style={{ display: "grid", gap: 8, marginBottom: 16, padding: 14, background: C.tint, borderRadius: 10 }}>
            <input style={inputStyle} placeholder="종목명 (예: KODEX 200)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
              <input style={inputStyle} placeholder="티커 (예: AAPL · 선택)" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
              <select style={inputStyle} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option value="KRW">원</option><option value="USD">달러</option></select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <input style={inputStyle} type="number" placeholder="수량" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
              <input style={inputStyle} type="number" placeholder="평단가" value={form.avg} onChange={(e) => setForm({ ...form, avg: e.target.value })} />
              <input style={inputStyle} type="number" placeholder="현재가" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input style={inputStyle} type="number" placeholder="목표가" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
              <input style={inputStyle} type="number" placeholder="손절가" value={form.stop} onChange={(e) => setForm({ ...form, stop: e.target.value })} />
            </div>
            <Btn onClick={add}>추가하기</Btn>
            <div style={{ fontSize: 11.5, color: C.faint, lineHeight: 1.5 }}>티커를 넣고 watchlist.json에 등록하면 현재가 자동 갱신(미국 종목). 달러 종목은 환율로 원화 환산.</div>
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: C.faint, fontSize: 13.5 }}>아직 종목이 없다. "종목 추가"로 시작하면 수익률·매도 판정이 계산된다.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {rows.map((r) => {
              const up = r.plPct >= 0;
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", border: `1px solid ${C.border}`, borderRadius: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 650, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                      {r.liveQ && <Chip tone="up">자동</Chip>}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.faint, marginTop: 2, ...NUM }}>{fmt(r.qty)}주 · 평단 {fmt(r.avg)}{r.currency === "USD" ? "$" : ""} · 현재 {fmt(r.price)}{r.currency === "USD" ? "$" : ""}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 650, color: toneColor(up ? "up" : "down"), ...NUM }}>{pct(r.plPct)}</div>
                    <div style={{ marginTop: 3 }}><Chip tone={r.verdict.tone}>{r.verdict.label}</Chip></div>
                  </div>
                  <button onClick={() => remove(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.faint, padding: 2 }}><Trash2 size={15} /></button>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* 추이 */}
      {history.length >= 2 && (
        <Panel>
          <Eye>자산 가치 추이</Eye>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={history} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
              <defs><linearGradient id="hist" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.accent} stopOpacity={0.16} /><stop offset="100%" stopColor={C.accent} stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.faint }} tickFormatter={(d) => d.slice(5)} minTickGap={26} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: C.faint }} width={44} tickFormatter={(v) => `${Math.round(v / 10000)}만`} axisLine={false} tickLine={false} />
              <RTooltip formatter={(v) => `${fmt(v)}원`} />
              <Area type="monotone" dataKey="value" stroke={C.accent} strokeWidth={2} fill="url(#hist)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      )}

      {/* 규칙 진단 */}
      <Panel>
        <Eye>규칙 진단</Eye>
        <div style={{ fontSize: 15, fontWeight: 650, color: C.ink, marginBottom: 10 }}>{advice.headline}</div>
        {advice.rules.length === 0 ? <div style={{ fontSize: 13, color: C.soft }}>발동한 경고 없음. 원칙대로 유지.</div> : (
          <div style={{ display: "grid", gap: 12 }}>
            {advice.rules.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                <Circle size={7} fill={toneColor(r.tone)} stroke="none" style={{ marginTop: 6, flexShrink: 0 }} />
                <div><div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{r.rule}</div><div style={{ fontSize: 13, color: C.soft, marginTop: 2, lineHeight: 1.55, wordBreak: "keep-all" }}>{r.msg}</div></div>
              </div>
            ))}
          </div>
        )}
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, cursor: "pointer", fontSize: 13, color: C.ink }}>
          <input type="checkbox" checked={hasExitPlan} onChange={(e) => setHasExitPlan(e.target.checked)} />
          종목마다 '언제 팔지' 기준을 정해뒀다
        </label>
        {!hasExitPlan && <div style={{ marginTop: 7, fontSize: 12.5, color: C.down, display: "flex", gap: 5, alignItems: "center" }}><AlertTriangle size={14} /> 매도 기준 없음 = 가장 흔한 손실 원인.</div>}
      </Panel>
    </div>
  );
}

/* ============================================================
   배우기
   ============================================================ */
function LearnTab() {
  const [cat, setCat] = useState("전체");
  const [open, setOpen] = useState(-1);
  const cats = ["전체", ...Array.from(new Set(KNOWLEDGE.map((k) => k.cat)))];
  const filtered = cat === "전체" ? KNOWLEDGE : KNOWLEDGE.filter((k) => k.cat === cat);
  const steps = [
    { t: "증권 계좌 만들기", d: "증권사 앱에서 비대면 개설. 수수료 낮은 곳으로." },
    { t: "목표·기간 정하기", d: "'얼마를, 언제까지, 왜'. 목표 없는 투자는 도박." },
    { t: "잃어도 되는 돈만", d: "생활비·비상금 금지. 그 100만원이 그런 돈인지 확인." },
    { t: "분산 ETF로 시작", d: "개별주 전에 시장 전체에 분산하는 ETF로 감 익히기." },
    { t: "규칙을 글로 적기", d: "살 이유·팔 기준을 사기 전에 메모. 감정 아닌 규칙." },
  ];
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Panel>
        <Eye>시작 가이드 · 5단계</Eye>
        <div style={{ display: "grid", gap: 11 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, background: C.accentSoft, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{i + 1}</span>
              <div><div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{s.t}</div><div style={{ fontSize: 12.5, color: C.soft, marginTop: 1, lineHeight: 1.5 }}>{s.d}</div></div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <Eye>용어·개념 사전 · {KNOWLEDGE.length}</Eye>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} style={{ fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: 8, cursor: "pointer", fontFamily: FONT, border: `1px solid ${cat === c ? C.ink : C.border}`, background: cat === c ? C.ink : C.panel, color: cat === c ? C.white : C.soft }}>{c}</button>
          ))}
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map((k) => (
            <div key={k.term} style={{ padding: 13, border: `1px solid ${C.border}`, borderRadius: 10 }}>
              <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 4 }}><span style={{ fontSize: 14, fontWeight: 650, color: C.ink }}>{k.term}</span><Chip>{k.cat}</Chip></div>
              <div style={{ fontSize: 13, color: C.soft, lineHeight: 1.55 }}>{k.body}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <Eye>자주 묻는 것</Eye>
        <div style={{ display: "grid", gap: 7 }}>
          {GLOSSARY.map((g, i) => (
            <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 9, overflow: "hidden" }}>
              <button onClick={() => setOpen(open === i ? -1 : i)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: open === i ? C.tint : C.panel, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: C.ink, textAlign: "left", fontFamily: FONT }}>{g.q}<ChevronDown size={16} style={{ transform: open === i ? "rotate(180deg)" : "none", transition: ".2s", color: C.faint }} /></button>
              {open === i && <div style={{ padding: 12, paddingTop: 0, fontSize: 13, color: C.soft, lineHeight: 1.6 }}>{g.a}</div>}
            </div>
          ))}
        </div>
      </Panel>

      <Panel style={{ background: C.downSoft, border: "none" }}>
        <Eye><span style={{ color: C.down }}>꼭 기억할 것</span></Eye>
        <div style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.65 }}>누가 "이거 사면 무조건 오른다"고 하면 의심해라. 리딩방·단톡방 추천은 대부분 너를 호구로 본다. 확실한 수익을 약속하는 건 사기다.</div>
      </Panel>
    </div>
  );
}

/* ============================================================
   설정
   ============================================================ */
function SettingsTab({ settings, alerts }) {
  const canNotify = typeof Notification !== "undefined";
  const toggleNotify = async () => {
    if (!canNotify) return;
    if (Notification.permission !== "granted") { const p = await Notification.requestPermission(); if (p !== "granted") return; }
    settings.save({ analyzeUrl: settings.analyzeUrl, notify: !settings.notify });
  };
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Panel style={{ background: C.accentSoft, border: "none" }}>
        <Eye><span style={{ color: C.accent }}>앱으로 설치 · 가족 공유</span></Eye>
        <div style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.7 }}>
          이 링크를 가족에게 보내면 각자 폰에서 <b>자기만의 포트폴리오</b>로 쓴다(데이터는 각 기기에만 저장, 안 섞임). API 키는 너 하나면 되고 가족은 발급 불필요.<br />
          · <b>아이폰 사파리</b>: 공유 → "홈 화면에 추가"<br />
          · <b>안드로이드 크롬</b>: 메뉴(⋮) → "앱 설치"
        </div>
      </Panel>
      <Panel>
        <Eye>목표·손절 알림</Eye>
        <div style={{ fontSize: 13.5, color: C.soft, lineHeight: 1.6 }}>도달 시 상단 배너 표시. 브라우저 알림을 켜면 앱이 열려 있는 동안 알림창도 뜬다. 현재 도달 {alerts.length}건.</div>
        <Btn kind={settings.notify ? "accent" : "ghost"} onClick={toggleNotify} disabled={!canNotify} style={{ marginTop: 12 }}>{settings.notify ? "알림 켜짐" : "브라우저 알림 켜기"}</Btn>
        <div style={{ fontSize: 11.5, color: C.faint, marginTop: 8, lineHeight: 1.5 }}>앱을 닫아도 오는 백그라운드 푸시는 별도 서버가 필요해 미지원.</div>
      </Panel>
    </div>
  );
}

/* ============================================================
   루트
   ============================================================ */
const TABS = [
  { id: "brief", label: "브리핑" },
  { id: "position", label: "포지션" },
  { id: "learn", label: "배우기" },
];

export default function StockCompass() {
  const [tab, setTab] = useState("brief");
  const [market, setMarket] = useState(SAMPLE_MARKET);
  const [news, setNews] = useState(SAMPLE_NEWS);
  const [quotes, setQuotes] = useState({});
  const [fx, setFx] = useState(0);
  const [live, setLive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [hasExitPlan, setHasExitPlan] = useState(false);
  const { holdings, cash, loaded, update } = usePortfolio();
  const settings = useSettings();

  useEffect(() => {
    let alive = true;
    (async () => {
      const d = await loadData();
      if (!alive || !d) return;
      if (Array.isArray(d.market) && d.market.length) setMarket(d.market);
      if (Array.isArray(d.news) && d.news.length) setNews(d.news);
      if (d.quotes) setQuotes(d.quotes);
      if (d.fxUsdKrw) setFx(d.fxUsdKrw);
      setUpdatedAt(d.updatedAt || null);
      setLive(true);
    })();
    return () => { alive = false; };
  }, []);

  const enriched = useMemo(() => {
    const rate = fx || 0;
    return holdings.map((h) => {
      const q = h.symbol ? quotes[h.symbol.toUpperCase()] : null;
      const price = q ? q.price : h.price;
      const mult = h.currency === "USD" ? (rate || 1) : 1;
      return { ...h, price, liveQ: !!q, wonValue: h.qty * price * mult, wonCost: h.qty * h.avg * mult };
    });
  }, [holdings, quotes, fx]);

  const totalValue = useMemo(() => enriched.reduce((s, h) => s + h.wonValue, 0) + cash, [enriched, cash]);
  const advice = useMemo(() => buildAdvice({ holdings: enriched, cash, totalValue }), [enriched, cash, totalValue]);
  const history = useHistory(totalValue, loaded);
  const alerts = useMemo(() => enriched.map((h) => ({ h, v: sellVerdict(h) })).filter((x) => x.v.tone === "down" || x.v.tone === "up"), [enriched]);
  const { coaching, coachLoading } = useCoaching({ market, news, enriched, cashPct: advice.cashPct, ready: loaded });

  useEffect(() => {
    if (!settings.notify || alerts.length === 0) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try { new Notification("나침반 · 기준 도달", { body: alerts.map((a) => `${a.h.name}: ${a.v.label}`).join(", ") }); } catch { /* */ }
  }, [alerts, settings.notify]);

  const go = (id) => { setTab(id); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT, color: C.ink, WebkitFontSmoothing: "antialiased" }}>
      {/* 상단바 */}
      <header style={{ borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "12px 18px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={13} color={C.white} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 680, letterSpacing: -0.3 }}>나침반</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: live ? C.up : C.amber, marginLeft: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: live ? C.up : C.amber, display: "inline-block" }} />
            {live ? `${updatedAt ? new Date(updatedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "연결"}` : "예시"}
          </span>
          <button onClick={() => go("settings")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: tab === "settings" ? C.ink : C.faint, padding: 4 }}><Settings size={19} /></button>
        </div>
        {/* 세그먼트 탭 */}
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 18px 10px" }}>
          <div style={{ display: "flex", gap: 4, background: C.tint, padding: 4, borderRadius: 11 }}>
            {TABS.map((t) => {
              const on = tab === t.id;
              return (
                <button key={t.id} onClick={() => go(t.id)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600, fontFamily: FONT, background: on ? C.panel : "transparent", color: on ? C.ink : C.soft, boxShadow: on ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>{t.label}</button>
              );
            })}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "16px 18px 40px" }}>
        {!live && (
          <div style={{ background: C.amberSoft, borderRadius: 11, padding: "11px 13px", marginBottom: 14, fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>
            <b>예시 데이터.</b> GitHub Actions가 data.json을 만들면 실시간으로 자동 전환된다.
          </div>
        )}
        {alerts.length > 0 && tab !== "settings" && (
          <div style={{ background: C.downSoft, borderRadius: 11, padding: "11px 13px", marginBottom: 14, fontSize: 13, color: C.ink, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertTriangle size={16} color={C.down} style={{ flexShrink: 0, marginTop: 1 }} />
            <div><b>기준 도달 ({alerts.length})</b><div style={{ marginTop: 3, color: C.soft }}>{alerts.map((a) => `${a.h.name} → ${a.v.label}`).join(" · ")}</div></div>
          </div>
        )}

        {tab === "brief" && <BriefTab market={market} news={news} advice={advice} coaching={coaching} coachLoading={coachLoading} enriched={enriched} fx={fx} goLearn={() => go("learn")} />}
        {tab === "position" && <PositionTab holdings={holdings} enriched={enriched} cash={cash} update={update} totalValue={totalValue} history={history} advice={advice} hasExitPlan={hasExitPlan} setHasExitPlan={setHasExitPlan} />}
        {tab === "learn" && <LearnTab />}
        {tab === "settings" && <SettingsTab settings={settings} alerts={alerts} />}

        <div style={{ fontSize: 11, color: C.faint, lineHeight: 1.6, marginTop: 22, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
          투자 정보·교육용이며 투자 권유·자문이 아닙니다. 표시된 판단은 교육용 규칙·AI 의견이며, 모든 결정과 책임은 본인에게 있습니다. 데이터는 지연·오류가 있을 수 있습니다.
        </div>
      </main>
    </div>
  );
}
