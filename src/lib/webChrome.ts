import { Platform } from 'react-native';

let applied = false;

/**
 * The plain Expo web template has no project HTML file, so the visual shell is
 * injected once on the client: Helvetica Neue, true black, visible chat caret.
 */
export function applyWebChrome(): void {
  if (applied || Platform.OS !== 'web' || typeof document === 'undefined') return;
  applied = true;
  document.title = 'crest';

  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover',
    );
  }

  if (!document.querySelector('meta[name="theme-color"]')) {
    const theme = document.createElement('meta');
    theme.setAttribute('name', 'theme-color');
    theme.setAttribute('content', '#0b0b0b');
    document.head.appendChild(theme);
  }

  if (!document.getElementById('crest-web-chrome')) {
    const style = document.createElement('style');
    style.id = 'crest-web-chrome';
    style.textContent = `
      html, body, #root { height: 100%; }
      html { background: #0b0b0b; }
      body {
        margin: 0;
        background: #0b0b0b;
        font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        overscroll-behavior: none;
      }
      * { box-sizing: border-box; }
      ::selection { background: #d9d3c6; color: #0b0b0b; }
      input, textarea { caret-color: #f2efe8; }
      input:focus, textarea:focus { outline: none; }
    `;
    document.head.appendChild(style);
  }
}
