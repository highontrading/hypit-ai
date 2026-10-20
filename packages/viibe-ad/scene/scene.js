// HTML visual setup body: (root, data) => render(localFrame).
// Every frame is computed from scratch from its time, so any frame can be rendered directly.
const fps = data.fps;
const K = {};
root.querySelectorAll('[data-k]').forEach(el => { K[el.dataset.k] = el; });

// Exact font faces arrive as owned text children; reuse their families for the whole scene.
const probe = name => { const holder = root.querySelector(`[data-probe="${name}"]`); return getComputedStyle(holder.firstElementChild || holder).fontFamily; };
root.style.setProperty('--f-med', probe('med'));
root.style.setProperty('--f-bold', probe('bold'));

// SVG references share one document, so derive ids from this program's root.
const pathId = `${root.id || 'viibe'}-pill-path`;
K.pillTextPath.setAttribute('id', pathId);
K.pillTP.setAttribute('href', `#${pathId}`);
K.pillTP.textContent = `${data.brand}  |  ${data.tagline}`;
K.pillText.style.fontFamily = 'var(--f-bold)';

const typed = 'Where can I get an editor';
const editorLetters = [...K.editor.children];
const scatter = editorLetters.map((_, i) => ({ x: [-40, 30, -20, 45, -35, 25, 0][i], y: [-90, 70, -60, 95, -75, 60, 40][i], r: [-35, 28, -22, 40, -30, 20, 0][i] }));

// Pink sparks for the Instagram transition.
const sparks = [[-260, -140], [210, -200], [320, 90], [-330, 160], [60, 260], [-90, -280]].map(([x, y]) => {
  const dot = document.createElement('div'); dot.className = 'particle'; K.particles.appendChild(dot); return { dot, x, y };
});

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOut = p => 1 - Math.pow(1 - p, 3);
const eIn = p => p * p * p;
const eIO = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const back = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const show = (el, on) => { el.style.display = on ? '' : 'none'; return on; };
const mix = (a, b, p) => { const h = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const A = h(a), B = h(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], p))).join(',')})`; };

function tf({ x = 0, y = 0, s = 1, sx = 1, sy = 1, r = 0, rx = 0, ry = 0, sk = 0 }) {
  return `translate(${x}px,${y}px) perspective(1400px) rotateX(${rx}deg) rotateY(${ry}deg) rotate(${r}deg) skewX(${sk}deg) scale(${s * sx},${s * sy})`;
}
function paint(el, o) {
  el.style.opacity = String(o.o ?? 1);
  const blur = o.blur ?? 0;
  el.style.filter = blur > 0.1 ? `blur(${blur.toFixed(2)}px)` : 'none';
}
// Centered element (left/top 50% of its container).
function S(el, o = {}) { el.style.transform = `translate(-50%,-50%) ${tf(o)}`; paint(el, o); }
// Inline element inside a row.
function W(el, o = {}) { el.style.transform = tf(o); paint(el, o); }

// A word flying into its settled place: from offsets, with motion blur while it travels.
function flyIn(el, t, t0, d, from = {}, ease = back) {
  const p = prog(t, t0, t0 + d), e = ease(p), inv = 1 - e;
  W(el, { x: (from.x ?? 0) * inv, y: (from.y ?? 0) * inv, r: (from.r ?? 0) * inv, sk: (from.sk ?? 0) * inv,
    s: lerp(from.s ?? 1, 1, e), o: clamp(p * 4), blur: (from.blur ?? 16) * Math.pow(1 - p, 2) });
  return p;
}
function flyOut(el, t, t0, d, to = {}, base = {}) {
  const p = prog(t, t0, t0 + d), e = eIn(p);
  W(el, { ...base, x: (base.x ?? 0) + (to.x ?? 0) * e, y: (base.y ?? 0) + (to.y ?? 0) * e, r: (to.r ?? 0) * e,
    s: lerp(1, to.s ?? 1, e), o: 1 - clamp((p - 0.3) / 0.7), blur: (to.blur ?? 18) * e });
  return p;
}

function pillPath(L, bend) {
  const h = L / 2;
  return `M ${-h} 0 C ${-h / 3} ${-bend}, ${h / 3} ${bend}, ${h} 0`;
}
function bezier(L, bend, u) {
  const h = L / 2, P = [[-h, 0], [-h / 3, -bend], [h / 3, bend], [h, 0]], v = 1 - u;
  const c = [v * v * v, 3 * v * v * u, 3 * v * u * u, u * u * u];
  return [P.reduce((a, q, i) => a + q[0] * c[i], 0), P.reduce((a, q, i) => a + q[1] * c[i], 0)];
}

function shake(t, at, amp) {
  const d = t - at; if (d < 0 || d > 0.35) return [0, 0];
  const k = amp * Math.exp(-d * 14);
  return [Math.sin(d * 90) * k, Math.cos(d * 77) * k];
}

return frame => {
  const t = frame / fps;

  // ---------------- backgrounds ----------------
  show(K.bgDark, t < 1.65);
  if (show(K.bgIg, t >= 1.3 && t < 3.5)) K.bgIg.style.opacity = String(eOut(prog(t, 1.3, 1.6)));
  if (show(K.bgGrey, t >= 3.15 && t < 4.16)) K.bgGrey.style.opacity = String(eIO(prog(t, 3.15, 3.42)));
  show(K.bgLight, t >= 4.15 && t < 10.5);
  if (show(K.bgWhite, t >= 10.25)) K.bgWhite.style.opacity = String(eIO(prog(t, 10.25, 10.45)));
  if (show(K.fade, t >= 11.28)) K.fade.style.opacity = String(0.86 * eIO(prog(t, 11.28, 11.9)));

  // Camera: impacts shake the whole frame.
  const [a1, b1] = shake(t, 3.34, 10), [a2, b2] = shake(t, 9.12, 16);
  // Zoom per scene so each beat fills the vertical frame; changes ride on transitions.
  const cs = lerp(lerp(lerp(lerp(lerp(1.32, 1.12, eIO(prog(t, 1.3, 1.6))), 1.28, prog(t, 4.149, 4.15)),
    1.12, eIO(prog(t, 8.8, 9.1))), 1.3, eIO(prog(t, 10.8, 10.95))), 1.3, 0);
  K.cam.style.transform = `translate(-50%,-50%) translate(${a1 + a2}px,${b1 + b2}px) scale(${cs})`;

  // ---------------- Act 1: Still looking / for an editor ----------------
  if (show(K.s1, t < 1.62)) {
    const join = eOut(prog(t, 0.3, 0.55));
    const out = prog(t, 1.28, 1.6);
    S(K.s1, { y: lerp(62, 0, join), s: lerp(1, 1.05, prog(t, 0.95, 1.6)) * lerp(1, 0.9, eIn(out)), rx: 28 * eIn(out),
      o: 1 - eIn(out), blur: 16 * eIn(out) });
    // Streak: "Still looking" whips in from the left, stretched and blurred.
    const p0 = prog(t, 0, 0.3), e0 = eOut(p0);
    for (const el of [K.still, K.looking]) W(el, { x: lerp(-760, 0, e0), sx: lerp(2.2, 1, e0), o: clamp(p0 * 3), blur: 30 * Math.pow(1 - p0, 2) });
    flyIn(K.for, t, 0.3, 0.22, { y: -110, r: -25, blur: 14 });
    flyIn(K.an, t, 0.36, 0.22, { y: -90, r: 18, blur: 14 });
    editorLetters.forEach((el, i) => {
      if (i === 6) { W(el, { s: back(prog(t, 1.02, 1.2)), o: prog(t, 1.02, 1.08) }); return; }
      flyIn(el, t, 0.4 + i * 0.045, 0.26, { x: scatter[i].x, y: scatter[i].y, r: scatter[i].r, blur: 10 });
    });
    // "for" gives way to the laptop.
    K.for.style.maxWidth = `${lerp(200, 0, eOut(prog(t, 0.93, 1.1)))}px`;
    K.for.style.marginRight = `${lerp(0, -27, eOut(prog(t, 0.93, 1.1)))}px`;
    K.for.style.opacity = String(Math.min(Number(K.for.style.opacity), 1 - prog(t, 0.93, 0.98)));
    K.laptop.style.width = `${lerp(0, 118, eOut(prog(t, 0.93, 1.12)))}px`;
    K.laptop.style.marginRight = `${lerp(-27, 0, eOut(prog(t, 0.93, 1.12)))}px`;
    W(K.laptop, { s: back(prog(t, 0.93, 1.15)), r: lerp(-20, 0, back(prog(t, 0.93, 1.15))) });
    // Electric-blue glitch: highlight blocks and a cold glow.
    const glow = prog(t, 0.72, 0.8) * (1 - prog(t, 0.92, 1.1));
    K.s1.style.textShadow = `0 0 ${34 + 40 * glow}px rgba(${Math.round(lerp(255, 60, glow))},${Math.round(lerp(255, 170, glow))},255,${0.35 + 0.5 * glow})`;
    const block = (g, el, on, frac) => {
      if (!show(g, on)) return;
      g.style.left = `${el.offsetLeft + el.parentElement.offsetLeft}px`; g.style.top = `${el.parentElement.offsetTop + 14}px`;
      g.style.width = `${el.offsetWidth * frac}px`; g.style.height = `${el.offsetHeight - 22}px`;
    };
    block(K.g1, K.looking, t >= 0.72 && t < 0.83, 0.62);
    block(K.g2, K.still, t >= 0.8 && t < 0.92, 1);
  }
  if (show(K.particles, t >= 1.3 && t < 2.0)) {
    const p = prog(t, 1.3, 1.95);
    sparks.forEach(({ dot, x, y }, i) => {
      const e = eOut(p);
      dot.style.transform = `translate(${540 + x * (0.3 + e)}px,${960 + y * (0.3 + e) + 40 * p}px) scale(${1 - p * 0.6})`;
      dot.style.opacity = String((1 - p) * (i % 2 ? 1 : 0.7));
    });
  }

  // ---------------- Instagram search ----------------
  if (show(K.ig, t >= 1.38 && t < 3.36)) {
    const push = eIO(prog(t, 2.0, 3.1));
    const sc = lerp(1, 1.1, push);
    S(K.ig, { s: sc, y: lerp(0, -169 * 1.1, push) });
    const up = eIn(prog(t, 3.08, 3.32));
    const pi = prog(t, 1.42, 1.66);
    S(K.igicon, { s: back(pi) * lerp(1, 0.9, up), r: lerp(-25, 0, back(pi)), y: -140 * up, o: clamp(pi * 4) * (1 - up), blur: 14 * up });
    K.igicon.style.left = '50%'; K.igicon.style.top = '135px';
    const pw = eOut(prog(t, 1.55, 1.95));
    K.igword.style.clipPath = `inset(0 ${100 - 100 * pw}% 0 0)`;
    K.igword.style.backgroundPosition = `${100 * eIO(prog(t, 1.75, 2.15))}% 0`;
    W(K.igword, { y: -140 * up, o: 1 - up, blur: 14 * up });
    const sw = eOut(prog(t, 1.82, 2.08));
    K.search.style.width = `${lerp(118, 760, sw)}px`;
    K.search.style.marginLeft = `${-lerp(118, 760, sw) / 2}px`;
    K.search.style.opacity = String(clamp(prog(t, 1.82, 1.9)));
    const caret = Math.floor(t * 4) % 2 === 0 ? '<span class="caret"></span>' : '';
    let text;
    if (t < 2.3) text = '<span class="ph">Search</span>';
    else if (t < 2.36) text = caret;
    else text = typed.slice(0, Math.min(typed.length, Math.floor((t - 2.36) / 0.027) + 1)) + caret;
    if (K.stext.dataset.v !== text) { K.stext.innerHTML = text; K.stext.dataset.v = text; }
    const fadeText = prog(t, 3.18, 3.32);
    K.stext.style.opacity = String(1 - fadeText); K.stext.style.filter = fadeText > 0 ? `blur(${10 * fadeText}px)` : 'none';
    const tp = prog(t, 3.1, 3.33);
    show(K.tap, tp > 0 && tp < 1);
    K.tap.style.left = `${lerp(20, 660, eIO(tp))}px`;
    K.tap.style.opacity = String(Math.sin(Math.PI * tp));
  }

  // ---------------- Brand pill ----------------
  if (show(K.pill, t >= 3.32 && t < 4.17)) {
    const L = 642, white = eIO(prog(t, 3.88, 4.0));
    const bendP = prog(t, 3.93, 4.12);
    const bend = 170 * Math.sin(Math.PI * 0.5 * eOut(bendP)) + 30 * Math.sin(bendP * 14) * bendP * (1 - bendP);
    const whip = eIn(prog(t, 4.0, 4.16));
    S(K.pill, { s: 1.1 * lerp(1, 1.25, whip), x: 1500 * whip, y: -500 * whip, r: -10 * whip + 4 * bendP, blur: 26 * whip });
    const d = pillPath(L, bend);
    K.pillEdge.setAttribute('d', d); K.pillBody.setAttribute('d', d); K.pillTextPath.setAttribute('d', d);
    K.pillEdge.setAttribute('stroke-width', '124'); K.pillEdge.setAttribute('stroke-opacity', String(lerp(0.78, 1, white)));
    K.pillBody.setAttribute('stroke-width', '116');
    K.pillBody.setAttribute('stroke', white > 0 ? mix('#2c2c2e', '#f3f3f5', white) : '#2c2c2e');
    K.pillText.setAttribute('fill', mix('#ffffff', '#1d1d1f', white));
    K.pillTP.setAttribute('startOffset', '45%');
    const ti = prog(t, 3.32, 3.46);
    K.pillText.style.opacity = String(ti); K.pillText.style.filter = ti < 1 ? `blur(${8 * (1 - ti)}px)` : 'none';
    const [bx, by] = bezier(L, bend, 0.93);
    const bp = back(prog(t, 3.38, 3.56));
    K.pillBtn.setAttribute('transform', `translate(${bx},${by}) scale(${bp}) rotate(${-180 * (1 - bp)})`);
    [[K.fl1, -170, 3.6], [K.fl2, 120, 3.66]].forEach(([el, x, t0]) => {
      const p = prog(t, t0, t0 + 0.42);
      show(el, p > 0 && p < 1);
      el.style.left = `${540 + x - 32}px`; el.style.top = `${350 - 108 - 30 * eOut(p)}px`;
      el.style.transform = `scale(${Math.sin(Math.PI * p) * 1.1})`;
    });
  }

  // ---------------- Act 2: Look no further ----------------
  if (show(K.s4, t >= 4.15 && t < 5.25)) {
    S(K.s4, { y: -180, s: lerp(1, 1.05, prog(t, 4.15, 5.1)) });
    const out = t >= 5.06;
    const tint = (el, p) => { el.style.color = mix('#2f6df0', '#111111', clamp(p * 1.3)); };
    if (!out) {
      tint(K.look, flyIn(K.look, t, 4.15, 0.2, { x: -320, y: 220, r: -18, sk: -14, s: 0.6, blur: 18 }));
      tint(K.no, flyIn(K.no, t, 4.32, 0.17, { x: 260, y: -80, r: 14, s: 0.7, blur: 16 }));
      tint(K.further, flyIn(K.further, t, 4.82, 0.17, { x: 340, y: 30, sk: 18, s: 0.8, blur: 20 }));
    } else {
      flyOut(K.look, t, 5.06, 0.14, { x: -300, y: -60, blur: 18 });
      flyOut(K.no, t, 5.07, 0.14, { y: -160, blur: 18 });
      flyOut(K.further, t, 5.08, 0.14, { x: 320, y: 40, blur: 18 });
    }
    // Cyan glitch blocks flicker where the next word will land.
    const gOn = t >= 4.5 && t < 4.88, seed = Math.floor(t * 30);
    [[K.g3, 0], [K.g4, 1]].forEach(([g, i]) => {
      if (!show(g, gOn && (seed + i) % 3 !== 0)) return;
      const ox = K.no.offsetLeft + K.no.offsetWidth + 20 + ((seed * (7 + i * 5)) % 140);
      g.style.left = `${ox}px`; g.style.top = `${-20 + ((seed * (3 + i)) % 5) * 22 - (i ? 60 : 0)}px`;
      g.style.width = `${30 + ((seed * 11 + i * 17) % 50)}px`; g.style.height = `${24 + ((seed * 5 + i) % 3) * 10}px`;
    });
  }
  [[K.emoA, -190, 620, 4.18], [K.emoB, 230, 590, 4.28]].forEach(([el, x, y, t0], i) => {
    if (!show(el, t >= t0 && t < 5.25)) return;
    const p = back(prog(t, t0, t0 + 0.3)), drop = eIn(prog(t, 5.06, 5.22));
    S(el, { x, y: lerp(1100, y, p) + 8 * Math.sin((t - t0) * 6 + i * 2) + 700 * drop, r: lerp(i ? 25 : -25, i ? 6 : -6, p),
      s: lerp(0.6, 1, p), blur: 20 * drop + 12 * (1 - clamp(prog(t, t0, t0 + 0.2))) });
  });

  // ---------------- Get full AI edits + work stack ----------------
  if (show(K.s5, t >= 5.1 && t < 6.2)) {
    const lift = eIn(prog(t, 6.0, 6.16));
    S(K.s5, { y: -560 - 80 * lift, o: 1 - lift, blur: 18 * lift });
    flyIn(K.get, t, 5.12, 0.16, { x: -260, y: -110, r: -10, blur: 18 });
    flyIn(K.full, t, 5.17, 0.18, { x: 320, y: 90, sk: 16, blur: 22 });
  }
  const stackOn = t >= 5.24 && t < 6.3;
  show(K.stack, stackOn); show(K.appicon, t >= 5.84 && t < 6.3);
  if (stackOn) {
    const grab = prog(t, 5.68, 5.76), squeeze = eIO(prog(t, 5.8, 6.0)), whip = eIn(prog(t, 6.05, 6.25));
    const sx = 1300 * whip, sy = 60;
    S(K.stack, { x: sx, y: sy, s: lerp(1, 0.32, squeeze) * (1 - 0.04 * Math.sin(Math.PI * grab)), blur: 24 * whip });
    [[K.cardC, -40, 190, 4, 5.25], [K.cardB, 190, 40, 9, 5.3], [K.cardA, -50, -60, -6, 5.35]].forEach(([el, x, y, r, t0]) => {
      const p = prog(t, t0, t0 + 0.32), e = back(p), k = 1 - squeeze * 0.75;
      S(el, { x: x * e * k, y: y * e * k, r: r * e * k, s: lerp(0.25, 1, e), o: clamp(p * 4), blur: 20 * Math.pow(1 - p, 2) });
    });
    const ip = back(prog(t, 5.84, 6.02));
    S(K.appicon, { x: sx, y: sy, s: ip, o: clamp(prog(t, 5.84, 5.9)), blur: 24 * whip });
  }

  // ---------------- Just drop your clips ----------------
  if (show(K.s6, t >= 6.15 && t < 7.15)) {
    S(K.s6, { y: 0, s: lerp(1, 1.04, prog(t, 6.3, 7.0)) });
    const tint = (el, p) => { el.style.color = mix('#2f6df0', '#111111', clamp(p * 1.2)); };
    if (t < 6.9) {
      tint(K.just, flyIn(K.just, t, 6.15, 0.18, { x: -280, y: -90, r: -10, blur: 20 }));
      tint(K.drop, flyIn(K.drop, t, 6.2, 0.18, { y: 140, blur: 20 }));
      tint(K.your, flyIn(K.your, t, 6.25, 0.19, { x: 320, y: -70, r: 8, blur: 20 }));
    } else {
      flyOut(K.just, t, 6.9, 0.2, { x: -260, blur: 14 });
      flyOut(K.drop, t, 6.92, 0.2, { y: -120, blur: 20 });
      flyOut(K.your, t, 6.94, 0.2, { x: 240, y: 30, blur: 20 });
    }
  }
  if (show(K.key, t >= 6.98 && t < 7.22)) {
    const p = eOut(prog(t, 6.98, 7.2));
    S(K.key, { x: lerp(300, 0, p), y: lerp(160, 0, p), r: lerp(18, 0, p), s: lerp(0.7, 1.26, p), o: clamp(prog(t, 6.98, 7.04) * 1), blur: 16 * (1 - p) });
  }

  // ---------------- + Vibe Edit button ----------------
  if (show(K.btn, t >= 7.2 && t < 8.97)) {
    const pop = back(prog(t, 7.2, 7.42)), grow = back(prog(t, 7.58, 7.86));
    const shrink = eIO(prog(t, 7.88, 8.42)), click = Math.sin(Math.PI * prog(t, 8.5, 8.62));
    const out = eIn(prog(t, 8.76, 8.96));
    const w = lerp(190, 690, grow);
    K.btn.style.width = `${w}px`;
    S(K.btn, { s: lerp(0.8, 1, pop) * lerp(1, 0.8, shrink) * (1 - 0.05 * click) * lerp(1, 0.7, out), o: 1 - out, blur: 18 * out, y: -20 * out });
    const swap = prog(t, 8.57, 8.61);
    K.plus.style.left = `${lerp(53, 58, grow)}px`; K.plus.style.opacity = String(1 - swap);
    K.lbl.style.left = `${lerp(260, 168, eOut(prog(t, 7.62, 7.86)))}px`;
    K.lbl.style.opacity = String(clamp(prog(t, 7.62, 7.78)) * (1 - swap));
    K.lbl.style.filter = t < 7.8 ? `blur(${10 * (1 - prog(t, 7.62, 7.8))}px)` : 'none';
    K.lbl2.style.left = '70px'; K.lbl2.style.opacity = String(swap);
  }
  if (show(K.ripple, t >= 8.5 && t < 8.85)) {
    const p = eOut(prog(t, 8.5, 8.85));
    K.ripple.style.width = K.ripple.style.height = `${lerp(40, 520, p)}px`;
    S(K.ripple, { x: 60, y: 30, o: 1 - p });
  }

  // ---------------- Cursor (hand) ----------------
  let cur = null;
  if (t >= 5.5 && t < 6.3) {
    const p = eOut(prog(t, 5.5, 5.68)), squeeze = eIO(prog(t, 5.8, 6.0)), whip = eIn(prog(t, 6.05, 6.25));
    cur = { x: lerp(1150, 610, p) + lerp(0, -30, squeeze) + 1300 * whip, y: lerp(1750, 1010, p) + lerp(0, 40, squeeze) + 60 * whip,
      s: (1 - 0.15 * Math.sin(Math.PI * prog(t, 5.68, 5.8))) * lerp(1, 0.75, squeeze), blur: 16 * (1 - prog(t, 5.5, 5.66)) + 24 * whip };
  } else if (t >= 7.86 && t < 8.98) {
    const p = eOut(prog(t, 7.88, 8.44)), click = Math.sin(Math.PI * prog(t, 8.5, 8.62)), out = eIn(prog(t, 8.76, 8.96));
    cur = { x: lerp(-120, 600, p) + 500 * out, y: lerp(1820, 990, p) + 700 * out, s: 1 - 0.18 * click,
      blur: 20 * Math.pow(1 - prog(t, 7.88, 8.3), 2) + 20 * out };
  }
  if (show(K.cursor, cur !== null)) {
    const cx = 540 + (cur.x - 540) * cs, cy = 960 + (cur.y - 960) * cs;
    K.cursor.style.transform = `translate(${cx - 45}px,${cy - 11}px) scale(${cur.s * cs})`;
    K.cursor.style.transformOrigin = '45px 11px';
    K.cursor.style.filter = cur.blur > 0.1 ? `blur(${cur.blur}px) drop-shadow(0 6px 10px rgba(0,0,0,.25))` : 'drop-shadow(0 6px 10px rgba(0,0,0,.25))';
  }

  // ---------------- App screen + AI handled it ----------------
  if (show(K.app, t >= 8.86 && t < 10.55)) {
    const p = prog(t, 8.86, 9.28), e = eOut(p);
    const shift = eIO(prog(t, 9.62, 9.92)), drop = eIn(prog(t, 10.25, 10.5));
    S(K.app, { x: lerp(0, -70, shift), y: lerp(-1700, 0, e) + 20 * Math.sin(prog(t, 9.25, 9.6) * Math.PI) * (1 - prog(t, 9.25, 9.6)) + 400 * drop,
      rx: lerp(-30, 0, e), r: lerp(-6, 0, e), s: lerp(0.86, 1, e) * lerp(1, 0.9, drop), o: 1 - drop, blur: 30 * Math.pow(1 - p, 2) + 22 * drop });
  }
  if (show(K.panel, t >= 9.6 && t < 10.92)) {
    const p = prog(t, 9.6, 9.9), e = eOut(p), center = eIO(prog(t, 10.27, 10.55)), out = eIn(prog(t, 10.72, 10.9));
    S(K.panel, { x: lerp(lerp(950, 160, e), 0, center), y: lerp(60, 0, center) + lerp(0, -40, prog(t, 10.5, 10.9)),
      s: lerp(1, 1.12, center), sy: lerp(1, 1.5, out), o: clamp(p * 3) * (1 - out), blur: 26 * Math.pow(1 - p, 2) + 30 * out });
  }

  // ---------------- End card ----------------
  if (show(K.end, t >= 10.88)) {
    const p = prog(t, 10.9, 11.12);
    S(K.end, { y: 40, s: lerp(1.08, 1, eOut(p)), o: clamp(p * 2), blur: 22 * Math.pow(1 - p, 2) });
    const ring = eOut(prog(t, 11.0, 11.2)), tick = eOut(prog(t, 11.1, 11.26));
    K.ring.setAttribute('stroke-dasharray', `${(540 * ring).toFixed(1)} 600`);
    K.ring.setAttribute('transform', `rotate(-90) scale(${0.85 + 0.15 * back(prog(t, 11.0, 11.24))})`);
    K.tick.setAttribute('stroke-dasharray', `${(130 * tick).toFixed(1)} 200`);
    const glow = prog(t, 11.3, 11.8);
    K.end.firstElementChild.style.filter = glow > 0 ? `drop-shadow(0 0 ${30 * glow}px rgba(30,140,255,${glow}))` : 'none';
    K.end.firstElementChild.style.position = 'relative';
    K.end.firstElementChild.style.zIndex = '2';
  }
};
