// worker/analyze.js — Cloudflare Worker (앱의 AI 두뇌)
// 역할: 사용자의 시장·뉴스·"내 보유 종목"을 받아 개인 맞춤 코칭을 생성.
//   - 오늘의 자세 + 내게 미치는 영향 + 오늘 할 일(개인화) + 오늘의 지식(맥락 맞춤)
// 키(ANTHROPIC_API_KEY)는 Worker 시크릿에만 → 브라우저·가족에게 노출 안 됨.
// 이 Worker 하나만 배포해 주소를 앱 코드(WORKER_URL)에 박으면,
// 너도 가족도 추가 설정 없이 각자 자기 종목으로 코칭을 받는다.
//
// 배포(처음 1회, 소유자만):
//   1) npm i -g wrangler && wrangler login
//   2) wrangler secret put ANTHROPIC_API_KEY   (Anthropic 콘솔의 키 붙여넣기)
//   3) wrangler deploy
//   4) 출력된 https://....workers.dev 주소를 src/StockCompass.jsx 의 WORKER_URL 에 붙여넣고 push

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOW_ORIGIN || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return new Response("POST only", { status: 405, headers: cors });

    try {
      const { market = [], news = [], holdings = [], cashPct = 0 } = await request.json();
      const model = env.CLAUDE_MODEL || "claude-sonnet-4-6";

      const mkt = market.map((m) => `${m.name} ${m.value}(${m.change >= 0 ? "+" : ""}${m.change}%)`).join(", ");
      const hold = holdings.length
        ? holdings.map((h) => `${h.name}${h.symbol ? `(${h.symbol})` : ""}: ${h.qty}주, 평단 ${h.avg}, 현재 ${h.price}${h.target ? `, 목표 ${h.target}` : ""}${h.stop ? `, 손절 ${h.stop}` : ""}`).join("\n")
        : "보유 종목 없음";
      const noExit = holdings.filter((h) => !h.target && !h.stop).length;

      const prompt =
`너는 한국 주식 초보(100만원으로 시작, 천천히 불리는 게 목표)를 매일 코칭하는 신중한 투자 교육가다.
아래 오늘의 시장·뉴스·"이 사람의 실제 보유 종목"을 보고, 오늘 이 사람에게 딱 맞는 코칭을 만들어라.
증권사 앱이 안 해주는 "그래서 나는 오늘 뭘 해야 하나"의 판단·교육을 제공하는 게 너의 일이다.

[원칙]
- 미래를 단정하지 마라. confidence는 보통 "낮음" 또는 "중간".
- 특정 종목 강력 매수/매도 단정·수익 보장 금지. 자세와 이유 중심.
- actions(오늘 할 일)는 이 사람의 실제 상황에 맞춰라:
  · 보유 0종목이면 "고르는 법/분산 진입" 중심
  · 매도 기준 없는 종목(${noExit}개)이 있으면 "목표가·손절가부터 정하라"
  · 현금 비중(${cashPct}%)이 너무 낮거나 높으면 그에 맞는 조언
- knowledge(오늘의 지식)는 "오늘 시장/이 사람 상황에 가장 도움될 개념" 하나를 골라 새로 설명하라.
  매번 같은 개념 말고, 오늘 맥락에 맞는 걸 골라라.
- 모든 문장 한국어, 초보가 이해할 쉬운 말. 짧고 분명하게.

[반드시 이 JSON만 출력]
{
 "posture": "관망|분할매수|비중축소|회피",
 "confidence": "낮음|중간|높음",
 "headline": "오늘의 한 줄 (한 문장)",
 "impact": "이 사람의 포트폴리오에 오늘이 어떤 의미인지 1~2문장",
 "actions": ["오늘 할 일 1", "오늘 할 일 2", "오늘 할 일 3"],
 "knowledge": {"term": "개념 이름", "body": "2~3문장 설명"}
}

[오늘의 시장] ${mkt || "데이터 없음"}
[현금 비중] ${cashPct}%
[오늘의 뉴스]
${news.slice(0, 6).map((n, i) => `${i + 1}. ${n}`).join("\n") || "없음"}
[이 사람의 보유 종목]
${hold}`;

      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: 1200, messages: [{ role: "user", content: prompt }] }),
      });
      if (!r.ok) throw new Error(`anthropic ${r.status}`);
      const j = await r.json();
      const text = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
      const a = JSON.parse(text.replace(/```json|```/g, "").trim());
      if (!["관망", "분할매수", "비중축소", "회피"].includes(a.posture)) a.posture = "관망";
      return new Response(JSON.stringify(a), { headers: { ...cors, "content-type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
    }
  },
};
