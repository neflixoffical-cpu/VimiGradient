# VimiGradient

Free, open-source generator of **grainy mesh gradients**. No sign-up, no watermark, no limits, works offline.
Zero dependencies — pure HTML + JS + WebGL.

**[RU]** Бесплатный open-source генератор зернистых градиентов. Без регистрации, водяных знаков и лимитов, работает офлайн.

## Features / Возможности

- 6 gradient types: **Mesh**, Linear, Radial, Conic, Waves, Blobs
- Up to 10 colors, drag points right on the canvas, double-click to add, right-click to remove
- Domain warp (fbm noise), swirl, blend sharpness, seed
- Grain: mono / color / film (soft-light), size in output pixels, animated grain
- Adjustments: brightness, contrast, saturation, hue shift, vignette, anti-banding dither
- 20 built-in presets + your own presets (saved in the browser)
- Smart randomizer (harmonious palettes)
- Canvas presets: 16:9, 9:16, 1:1, 4K, MacBook, iPhone, Twitter header, A4… or any custom size
- Export **PNG / JPG / WebP** up to 4× scale (up to your GPU limit, usually 8K–16K)
- Export **animated video (WebM)** with seamless loop, 24/30/60 fps, up to 4K
- Export as **WebGL code**: standalone `.html`, embed snippet or `.js` file — a live, animated, resolution-independent gradient for any website (~9 KB, no dependencies)
- Share link (whole design encoded in the URL), save / load `.json`, CSS fallback
- Undo / redo, keyboard shortcuts, English / Русский

## Run locally / Запуск

1. Download the ZIP (GitHub → **Code → Download ZIP**) and unpack it.
2. Open `index.html` in Chrome, Edge, Firefox or Safari. That's it.

Optional local server:

```bash
npx serve .          # or
python -m http.server 8080
```

Deploy anywhere static: GitHub Pages, Netlify, Vercel, Cloudflare Pages — just upload the folder.

## Shortcuts / Горячие клавиши

| Key | Action |
|---|---|
| `R` | Randomize |
| `Space` | Play / pause animation |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / redo |
| `Ctrl+S` | Export |
| double-click slider | Reset to default |

## Project structure

```
index.html        UI
styles.css        styles
js/renderer.js    WebGL shader & renderer
js/presets.js     presets and defaults
js/i18n.js        translations (add your language here)
js/app.js         UI logic, export, undo, sharing
```

## License

MIT — use it in personal and commercial projects. Images you export are yours.
