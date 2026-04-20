import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function stripGithubRedirectFromProdBuild() {
  return {
    name: "strip-github-redirect-from-prod-html",
    transformIndexHtml(html: string, ctx: { server?: unknown }) {
      if (ctx.server) return html;
      return html.replace(/<!--\s*GH_REDIRECT_START\s*-->[\s\S]*?<!--\s*GH_REDIRECT_END\s*-->\s*/m, "");
    },
  };
}

export default defineConfig({
  plugins: [react(), stripGithubRedirectFromProdBuild()],
  base: "./",
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
});
