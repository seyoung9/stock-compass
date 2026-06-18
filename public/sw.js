// sw.js — 최소 서비스워커
// 목적: "홈 화면에 추가"(설치형) 가능 + 오프라인에서도 앱 셸 로드.
// data.json 은 항상 네트워크 우선(최신 시세 우선), 실패 시에만 캐시.

const SHELL = "compass-shell-v2";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(["./", "./index.html", "./manifest.webmanifest"])));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // data.json: 네트워크 우선 (최신 데이터), 실패하면 캐시
  if (url.pathname.endsWith("data.json")) {
    e.respondWith(
      fetch(e.request).then((r) => {
        const copy = r.clone();
        caches.open(SHELL).then((c) => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // 그 외: 캐시 우선, 없으면 네트워크 (앱 셸·자산)
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached || fetch(e.request).then((r) => {
        if (e.request.method === "GET" && r.ok && url.origin === location.origin) {
          const copy = r.clone();
          caches.open(SHELL).then((c) => c.put(e.request, copy));
        }
        return r;
      }).catch(() => cached)
    )
  );
});
