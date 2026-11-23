import { defineConfig } from 'vite';

const LIVE_CSP = "default-src 'none'; base-uri 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data: https://images.unsplash.com; connect-src 'self'; media-src 'self'; worker-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; upgrade-insecure-requests";

export default defineConfig(({ command }) => ({
  base: './',
  plugins: [{
    name: 'pause-development-csp',
    transformIndexHtml(html) {
      // Vite injects stylesheet updates during local development. Only the
      // localhost dev server gets this relaxation; dist keeps the strict CSP.
      if (command !== 'serve') return html;
      return html.replace(
        LIVE_CSP,
        LIVE_CSP.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
          .replace("connect-src 'self'", "connect-src 'self' ws: wss:")
      );
    }
  }],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false
  }
}));
