import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" → GitHub Pages 프로젝트 사이트(/저장소이름/)에서
// 자산·data.json 경로가 자동으로 맞춰진다. repo 이름 하드코딩 불필요.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
