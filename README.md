# 나침반 · 주식 첫걸음

주식 왕초보를 위한 도구. 전 세계 시장 현황 · 24시간 내 뉴스 · AI 시장 분석 · 내 포트폴리오 판단을 한 화면에서.
**투자 정보·교육 목적이며 투자 권유·자문이 아니다. 모든 결정과 책임은 본인에게 있다.**

## 구조

GitHub Pages는 정적이라 페이지 스스로 실시간 갱신을 못 한다. 그래서:

```
GitHub Actions(매시, 서버) ─ Finnhub 시세·뉴스 + Claude 분석 ─▶ public/data.json
                                                                      │
정적 페이지(브라우저)  ◀────────── 빌드에 포함된 data.json 읽음 ──────┘
```

서버에서 긁고 API 키도 서버 시크릿에만 둬서 브라우저에 노출 안 된다.

- **시세**: Finnhub `/quote` — 미국 상장 ETF를 지수 프록시로 사용
  (SPY=S&P500, QQQ=나스닥100, EWY=한국, EEM=신흥국). 실제 매수 가능한 종목이라 직관적.
- **뉴스**: Finnhub `/news` general, 24시간 필터
- **AI 분석**: Claude가 시장+뉴스를 읽고 "오늘의 자세"(관망/분할매수/비중축소/회피) +
  근거·확신도·리스크 생성. 시크릿 있을 때만 작동. 특정 종목 신호 아님.
- **개별 종목 판정**: 브라우저 규칙 엔진(목표가·손절가 기준). 키 불필요, 투명.

## 배포 단계

1. 이 폴더를 GitHub 새 저장소에 push (`main`).
2. **Settings → Pages → Source = "GitHub Actions"**.
3. **Settings → Secrets and variables → Actions → New repository secret** 에서:
   - `FINNHUB_API_KEY` (필수) — https://finnhub.io 무료 가입 후 키 복사
   - `ANTHROPIC_API_KEY` (선택, AI 분석용)
   - `CLAUDE_MODEL` (선택) — 기본 `claude-sonnet-4-6`, 더 높은 버전은 `claude-opus-4-8`
4. push하면 워크플로 자동 실행 → 수집 → 빌드 → 배포.
5. 갱신 주기는 `.github/workflows/deploy.yml` 의 `cron` 으로 조정 (15분이 무료 권장 한계).

## 로컬 실행

```bash
npm install
FINNHUB_API_KEY=xxx npm run fetch   # public/data.json 생성 (선택)
npm run dev                          # http://localhost:5173
```
키 없이 실행하면 내장 예시 데이터로 동작하고 상단에 "예시 데이터"로 표시된다.

## 추적 종목 바꾸기

`scripts/fetch-data.mjs` 의 `SYMBOLS` 수정. Finnhub 무료는 미국 상장 종목/ETF에 강하다.

## 한계 (정직하게)

- Finnhub **무료 티어는 지연(약 15~20분)** 이 있고 과거 캔들이 제한된다. 정확한 실시간이
  필요하면 유료 플랜(월 $80~)으로 올려야 한다. 코드 변경 없이 키만 그대로 쓰면 된다.
- 지수를 ETF 프록시로 보여준다(원본 지수 아님). Finnhub 무료에서 지수 원본이 제한적이기 때문.
- 한국 **개별주 실시간**이 핵심이면 한국투자증권 KIS Open API 등 국내 인증형 소스로
  `fetch-data.mjs` 교체 권장.
- **AI 분석은 미래 예측이 아니다.** Claude도 환각·오류가 있다. "관망/분할매수" 같은 자세는
  교육용 의견이며, 특정 종목 매수/매도 신호가 아니다. 실제 투자 손실 책임은 본인에게 있다.

## 면책

교육·정보 제공 목적. 투자 자문업이 아니다. 수치는 지연·오류 가능. 투자 손실 책임은 전적으로 사용자 본인.

---

## v2 추가 기능

### 현재가 자동 갱신 (watchlist.json)
`watchlist.json`에 티커를 넣으면 GitHub Actions가 그 종목 시세를 받아 `data.json`에 담는다.
앱에서 종목 추가 시 **티커**를 같이 입력하면 현재가가 자동으로 채워진다("자동" 배지 표시).
- Finnhub 무료는 **미국 종목/ETF에 안정적**. 한국 개별주는 자동시세가 제한적 → 수동 입력.
```json
[ { "symbol": "AAPL", "name": "애플" } ]
```

### 환율 반영
USD/KRW 환율을 무료 소스(open.er-api.com)에서 받아 `data.json`에 담는다.
종목을 **달러(USD)**로 등록하면 평가액이 원화로 환산된다.

### 자산 가치 추이
앱을 열 때마다 하루 1회 총 평가액을 브라우저(window.storage)에 기록 → 포트폴리오 탭에 추이 그래프.

### 목표·손절 알림
보유 종목이 목표가/손절가에 닿으면 앱 상단 배너로 표시. 설정 탭에서 브라우저 알림을 켜면
**앱이 열려 있는 동안** 알림창도 뜬다. (앱을 닫아도 오는 백그라운드 푸시는 별도 서버가 필요해 미지원)

### 내 포트폴리오 AI 분석 (Cloudflare Worker, 선택)
시장만이 아니라 **내 보유 종목까지** 반영한 AI 분석. API 키를 브라우저에 노출하지 않으려면
작은 서버가 필요하다 → 무료 Cloudflare Worker 사용.

배포:
1. `npm i -g wrangler && wrangler login`
2. (이 repo에 이미 `worker/analyze.js`, `wrangler.toml` 있음)
3. `wrangler secret put ANTHROPIC_API_KEY` → 키 붙여넣기
4. `wrangler deploy`
5. 출력된 `https://....workers.dev` 주소를 앱 **설정 탭**에 입력
6. 보안: `wrangler.toml`의 `ALLOW_ORIGIN`을 본인 Pages 주소로 좁히는 걸 권장

이게 없어도 앱은 동작한다 — "오늘/판단하기"의 시장 단위 AI 분석(data.json)은 그대로 나온다.

---

## v3 — AI 코칭 중심 (토스와 차별화)

이제 앱의 핵심은 **개인 맞춤 AI 코칭**이다. 증권사 앱이 "숫자"를 보여준다면, 나침반은
같은 시장·뉴스를 **내 보유·현금·기준에 비춰 '오늘 뭘 할지' AI가 코칭**한다.

### 동작
- 앱을 열면 시장·뉴스·내 종목을 Worker로 보내 → Claude가 코칭 생성
  (오늘의 자세 + 내게 미치는 영향 + 오늘 할 일 + 오늘의 지식). 하루+종목 단위로 캐시.
- 뉴스는 수집 시 **한국어로 번역**(Actions에 ANTHROPIC_API_KEY 시크릿 필요).
- 고정 텍스트(가이드·지식)는 AI 생성으로 대체. 단 "배우기" 사전 20개는 레퍼런스로 유지.

### 소유자가 1회만 (가족은 아무것도 안 함)
1. Worker 배포: `wrangler secret put ANTHROPIC_API_KEY` → `wrangler deploy`
2. 나온 `https://....workers.dev` 주소를 `src/StockCompass.jsx` 의 `WORKER_URL` 에 붙여넣기
3. push. 이제 너도 가족도 링크만 열면 각자 종목으로 AI 코칭을 받는다 (키 노출 0).

`WORKER_URL`이 비어 있으면 AI 코칭 대신 규칙 기반으로 동작(앱은 정상 작동).

### cmd 없이 코드 고치기 (GitHub 웹 편집)
노트북 cmd가 번거로우면, GitHub 저장소에서 파일을 직접 편집할 수 있다:
저장소 → 파일 클릭(예: src/StockCompass.jsx) → 연필(✏️) 아이콘 → 수정 →
아래 "Commit changes" → 자동으로 빌드·배포된다. (push 불필요)
