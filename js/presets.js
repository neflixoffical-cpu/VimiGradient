/* VimiGradient — built-in presets. MIT License. */
(function () {
  window.VG = window.VG || {};
  const P = (name, colors, extra) => ({ name, colors, ...extra });
  const pts = (cols, layout) => cols.map((c, i) => ({ color: c, x: layout[i][0], y: layout[i][1] }));
  const L4 = [[0.15, 0.2], [0.85, 0.15], [0.2, 0.85], [0.8, 0.8]];
  const L5 = [[0.1, 0.15], [0.9, 0.2], [0.5, 0.5], [0.15, 0.9], [0.85, 0.85]];
  const L3 = [[0.2, 0.25], [0.8, 0.35], [0.45, 0.85]];
  const L6 = [[0.1, 0.1], [0.55, 0.15], [0.95, 0.35], [0.2, 0.6], [0.7, 0.75], [0.35, 0.98]];

  VG.PRESETS = [
    P('Aurora', pts(['#0b1a3a', '#1fd1a5', '#7b2ff7', '#00b4d8', '#0d0221'], L5), { warp: 0.55, grain: 0.14 }),
    P('Peach', pts(['#ffb199', '#ff0844', '#ffd5c2', '#f9a03f'], L4), { warp: 0.35, grain: 0.12 }),
    P('Lavender', pts(['#e0c3fc', '#8ec5fc', '#b892ff', '#f6d5f7'], L4), { warp: 0.3, grain: 0.1 }),
    P('Sunset', pts(['#ff512f', '#dd2476', '#ff9966', '#3a1c71', '#ffaf7b'], L5), { warp: 0.6, grain: 0.16 }),
    P('Ocean', pts(['#003973', '#00c6ff', '#0072ff', '#e5e5be'], L4), { warp: 0.45, grain: 0.12 }),
    P('Lime', pts(['#d4fc79', '#96e6a1', '#0f3443', '#34e89e'], L4), { warp: 0.5, grain: 0.14 }),
    P('Noir', pts(['#000000', '#434343', '#1a1a2e', '#e94560'], L4), { warp: 0.7, grain: 0.22 }),
    P('Candy', pts(['#ff9a9e', '#fad0c4', '#a18cd1', '#fbc2eb', '#84fab0'], L5), { warp: 0.4, grain: 0.1 }),
    P('Fire', pts(['#f12711', '#f5af19', '#2b0000', '#ff6a00'], L4), { warp: 0.9, warpScale: 2.5, grain: 0.2 }),
    P('Mint', pts(['#a8edea', '#fed6e3', '#c3f0ca', '#ffffff'], L4), { warp: 0.25, grain: 0.08 }),
    P('Cyber', pts(['#f72585', '#7209b7', '#3a0ca3', '#4cc9f0', '#4361ee', '#06d6a0'], L6), { warp: 0.65, grain: 0.18 }),
    P('Desert', pts(['#c2410c', '#fde68a', '#78350f', '#fdba74'], L4), { warp: 0.5, grain: 0.25, grainType: '2' }),
    P('Sky', pts(['#89f7fe', '#66a6ff', '#ffffff'], L3), { warp: 0.3, grain: 0.08 }),
    P('Berry', pts(['#3f0d12', '#a71d31', '#f2d0a9', '#6a0572'], L4), { warp: 0.55, grain: 0.15 }),
    P('Holo', pts(['#ff9a8b', '#ff6a88', '#99e2d0', '#c3aed6', '#fdffab'], L5), { mode: '3', warp: 0.35, grain: 0.1 }),
    P('Retro', pts(['#ff6f61', '#ffd166', '#06d6a0', '#118ab2', '#073b4c'], L5), { mode: '4', softness: 1.5, warp: 0.2, grain: 0.2, grainType: '2' }),
    P('Orbs', pts(['#ff4d6d', '#4cc9f0', '#ffd60a', '#9d4edd'], L4), { mode: '5', softness: 2.2, bg: '#0a0a12', warp: 0.25, grain: 0.15 }),
    P('Swirl', pts(['#12c2e9', '#c471ed', '#f64f59', '#fbd786'], L4), { swirl: 2.2, warp: 0.3, grain: 0.12 }),
    P('Mono', pts(['#111111', '#f5f5f5', '#777777', '#2a2a2a'], L4), { warp: 0.6, grain: 0.22 }),
    P('Spring', pts(['#fcef9c', '#f8a5c2', '#63cdda', '#f3a683'], L4), { warp: 0.4, grain: 0.1 }),
  ];

  VG.DEFAULTS = {
    colors: VG.PRESETS[0].colors,
    bg: '#0b0b12', mode: '0', angle: 45, softness: 2.2, warp: 0.5, warpScale: 1.6, swirl: 0, seed: 12,
    grain: 0.14, grainSize: 1, grainType: '0', grainAnim: false,
    brightness: 0, contrast: 1, saturation: 1, hue: 0, vignette: 0, blur: 0.3,
    speed: 0.6, flow: 0.3, width: 1920, height: 1080,
  };
})();
