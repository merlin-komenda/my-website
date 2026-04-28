/**
 * MK Exploded Schematic Logo
 * Vanilla JS + SVG — no framework dependencies.
 *
 * Usage:
 *   <div id="mk-hero"></div>       ← full exploded mark (hero)
 *   <div id="mk-compact"></div>    ← collapsed gear mark (nav/favicon)
 *
 *   <script src="mk-logo.js"></script>
 *   <script>
 *     MKLogo.hero('mk-hero', { size: 500 });
 *     MKLogo.compact('mk-compact', { size: 36 });
 *   </script>
 */

const MKLogo = (() => {

  const BRAND = {
    coral:     '#d4896a',
    teal:      '#4ecdc4',
    text:      'rgba(242,236,224,1)',
    line:      'rgba(242,236,224,.55)',
    lineFaint: 'rgba(242,236,224,.22)',
    lineGhost: 'rgba(242,236,224,.10)',
  };

  // ─── SVG helpers ───────────────────────────────────────────

  function svgEl(tag, attrs = {}, children = []) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    for (const c of children) if (c) el.appendChild(c);
    return el;
  }

  function knurledRing(cx, cy, rOuter, rInner, ticks = 48, stroke = BRAND.line) {
    const g = svgEl('g');
    g.appendChild(svgEl('circle', { cx, cy, r: rOuter, fill: 'none', stroke, 'stroke-width': 0.75 }));
    g.appendChild(svgEl('circle', { cx, cy, r: rInner, fill: 'none', stroke, 'stroke-width': 0.75 }));
    for (let i = 0; i < ticks; i++) {
      const a = (i / ticks) * Math.PI * 2;
      g.appendChild(svgEl('line', {
        x1: cx + Math.cos(a) * rInner, y1: cy + Math.sin(a) * rInner,
        x2: cx + Math.cos(a) * rOuter, y2: cy + Math.sin(a) * rOuter,
        stroke, 'stroke-width': 0.5,
      }));
    }
    return g;
  }

  function bearingFace(cx, cy, r, count = 4, stroke = BRAND.line) {
    const g = svgEl('g');
    for (let i = 0; i < count; i++)
      g.appendChild(svgEl('circle', { cx, cy, r: r * (1 - i * 0.14), fill: 'none', stroke, 'stroke-width': 0.5 }));
    g.appendChild(svgEl('circle', { cx, cy, r: 2, fill: BRAND.text }));
    return g;
  }

  function gearRing(cx, cy, rOuter, rInner, teeth = 24, stroke = BRAND.line) {
    const pts = [];
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? rOuter : rInner;
      pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
    }
    const g = svgEl('g');
    g.appendChild(svgEl('polygon', { points: pts.join(' '), fill: 'none', stroke, 'stroke-width': 0.6 }));
    g.appendChild(svgEl('circle', { cx, cy, r: rInner * 0.7, fill: 'none', stroke, 'stroke-width': 0.5 }));
    return g;
  }

  function compLabel(x, y, label, dx = 40, dy = -30) {
    const g = svgEl('g');
    g.appendChild(svgEl('line', { x1: x, y1: y, x2: x + dx, y2: y + dy, stroke: BRAND.lineFaint, 'stroke-width': 0.5 }));
    g.appendChild(svgEl('circle', { cx: x + dx, cy: y + dy, r: 1.5, fill: BRAND.line }));
    const t = svgEl('text', {
      x: x + dx + 6, y: y + dy + 3,
      'font-size': 9, fill: BRAND.line, 'letter-spacing': 1.5,
      'font-family': 'IBM Plex Mono, ui-monospace, monospace',
    });
    t.textContent = label;
    g.appendChild(t);
    return g;
  }

  // ─── Mouse tracker (shared across all marks on page) ───────

  let mouseNorm = { x: 0, y: 0 };
  let mouseTarget = { x: 0, y: 0 };
  let mouseRAF = null;

  function startMouseTracking() {
    if (mouseRAF) return;
    document.addEventListener('mousemove', (e) => {
      mouseTarget.x = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1));
      mouseTarget.y = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight) * 2 - 1));
    });
    document.addEventListener('mouseleave', () => { mouseTarget.x = 0; mouseTarget.y = 0; });
    const smooth = () => {
      mouseNorm.x += (mouseTarget.x - mouseNorm.x) * 0.10;
      mouseNorm.y += (mouseTarget.y - mouseNorm.y) * 0.10;
      mouseRAF = requestAnimationFrame(smooth);
    };
    smooth();
  }

  // ─── ExplodedMK — hero mark ────────────────────────────────

  function buildHeroSVG(size) {
    const svg = svgEl('svg', {
      viewBox: `0 0 ${size} ${size}`,
      width: size, height: size,
      style: 'overflow:visible;display:block;',
    });

    // Ghost brackets
    const bk = svgEl('g', { stroke: BRAND.lineGhost, 'stroke-width': 0.75, fill: 'none' });
    bk.appendChild(svgEl('path', { d: `M${size*.35} ${size*.08}H${size*.78}L${size*.92} ${size*.22}V${size*.55}` }));
    bk.appendChild(svgEl('path', { d: `M${size*.42} ${size*.13}H${size*.76}L${size*.87} ${size*.24}V${size*.52}` }));
    bk.appendChild(svgEl('path', { d: `M${size*.49} ${size*.18}H${size*.74}L${size*.82} ${size*.26}V${size*.48}` }));
    bk.appendChild(svgEl('path', { d: `M${size*.08} ${size*.92}V${size*.55}L${size*.22} ${size*.42}`, 'stroke-width': 0.5 }));
    svg.appendChild(bk);

    // Centerline (updated each frame via attribute)
    const cl = svgEl('line', { stroke: BRAND.lineGhost, 'stroke-width': 0.5, 'stroke-dasharray': '4 3' });
    svg.appendChild(cl);

    // Seven component groups — each gets an outer <g> for opacity control
    const components = [];
    for (let i = 0; i < 7; i++) {
      const outer = svgEl('g', { style: 'opacity:0;transition:opacity 250ms' });
      const inner = svgEl('g'); // receives transform each frame
      outer.appendChild(inner);
      svg.appendChild(outer);
      components.push({ outer, inner });
    }

    // Labels — appended once, positions updated each frame
    const labelM  = compLabel(0, 0, 'M.01', -60, -40);
    const labelHub = compLabel(0, 0, 'HUB', 0, 0);
    const labelK  = compLabel(0, 0, 'K.01', 30, 30);
    svg.appendChild(labelM);
    svg.appendChild(labelHub);
    svg.appendChild(labelK);

    // Build static geometry inside each inner group (done once)
    const s = size;

    // 0 — Knurled focusing ring
    components[0].inner.appendChild(knurledRing(0, 0, s*.11, s*.095, 42));
    components[0].inner.appendChild(knurledRing(0, 0, s*.085, s*.075, 32));
    components[0].inner.appendChild(svgEl('circle', { cx: 0, cy: 0, r: s*.055, fill: 'none', stroke: BRAND.line, 'stroke-width': 0.6 }));
    components[0].inner.appendChild(svgEl('circle', { cx: 0, cy: 0, r: s*.035, fill: 'none', stroke: BRAND.lineFaint, 'stroke-width': 0.5 }));

    // 1 — Bearing plate
    components[1].inner.appendChild(bearingFace(0, 0, s*.08, 4));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      components[1].inner.appendChild(svgEl('circle', {
        cx: Math.cos(a) * s*.065, cy: Math.sin(a) * s*.065, r: 2.5,
        fill: 'none', stroke: BRAND.line, 'stroke-width': 0.6,
      }));
    }

    // 2 — Splined shaft
    for (let i = 0; i < 9; i++) {
      const xo = (i - 4) * 4;
      components[2].inner.appendChild(svgEl('ellipse', { cx: xo, cy: 0, rx: s*.015, ry: s*.08, fill: 'none', stroke: BRAND.line, 'stroke-width': 0.5 }));
    }
    components[2].inner.appendChild(svgEl('line', { x1: -18, y1: -s*.08, x2: 18, y2: -s*.08, stroke: BRAND.line, 'stroke-width': 0.6 }));
    components[2].inner.appendChild(svgEl('line', { x1: -18, y1:  s*.08, x2: 18, y2:  s*.08, stroke: BRAND.line, 'stroke-width': 0.6 }));

    // 3 — Center gear + M letter
    components[3].inner.appendChild(gearRing(0, 0, s*.1, s*.085, 28));
    const mText = svgEl('text', {
      x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-family': 'Inter, sans-serif', 'font-weight': 900,
      'font-size': s*.10, 'letter-spacing': '-0.06em', fill: BRAND.coral,
    });
    mText.textContent = 'M';
    components[3].inner.appendChild(mText);

    // 4 — Clutch plate
    components[4].inner.appendChild(gearRing(0, 0, s*.095, s*.084, 40));
    components[4].inner.appendChild(svgEl('circle', { cx: 0, cy: 0, r: s*.065, fill: 'none', stroke: BRAND.line, 'stroke-width': 0.6 }));
    components[4].inner.appendChild(svgEl('ellipse', { cx: 0, cy: 0, rx: s*.045, ry: s*.02, fill: 'none', stroke: BRAND.line, 'stroke-width': 0.6 }));

    // 5 — Spindle + K letter
    components[5].inner.appendChild(knurledRing(0, 0, s*.09, s*.075, 36));
    const kText = svgEl('text', {
      x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-family': 'Inter, sans-serif', 'font-weight': 900,
      'font-size': s*.095, 'letter-spacing': '-0.06em', fill: BRAND.teal,
    });
    kText.textContent = 'K';
    components[5].inner.appendChild(kText);

    // 6 — Terminal flange
    components[6].inner.appendChild(svgEl('circle', { cx: 0, cy: 0, r: s*.07,  fill: 'none', stroke: BRAND.line, 'stroke-width': 0.75 }));
    components[6].inner.appendChild(svgEl('circle', { cx: 0, cy: 0, r: s*.055, fill: 'none', stroke: BRAND.line, 'stroke-width': 0.5 }));
    components[6].inner.appendChild(svgEl('circle', { cx: 0, cy: 0, r: s*.025, fill: 'none', stroke: BRAND.line, 'stroke-width': 0.5 }));
    components[6].inner.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 2, fill: BRAND.text }));

    return { svg, cl, components, labelM, labelHub, labelK, mText, kText };
  }

  function hero(containerId, { size = 500 } = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    startMouseTracking();

    const { svg, cl, components, labelM, labelHub, labelK, mText, kText } = buildHeroSVG(size);
    container.appendChild(svg);

    // Breath animation
    let breathStart = performance.now();

    function frame(now) {
      const elapsed = (now - breathStart) / 1000;
      const breath = 0.5 + Math.sin(elapsed * 0.35) * 0.18;

      const progress = breath;
      const spread = 0.55 + (progress - 0.5) * 0.35 + mouseNorm.x * 0.18;
      const axisAngle = 25 + mouseNorm.y * 3;
      const rad = (axisAngle * Math.PI) / 180;
      const unit = size * 0.12 * spread;

      const positions = [-3.4, -2.3, -1.2, 0, 1.2, 2.3, 3.4].map(t => ({
        x: size / 2 + Math.cos(rad) * t * unit,
        y: size / 2 + Math.sin(rad) * t * unit,
      }));

      // Centerline
      cl.setAttribute('x1', size/2 - Math.cos(rad) * size * 0.55);
      cl.setAttribute('y1', size/2 - Math.sin(rad) * size * 0.55);
      cl.setAttribute('x2', size/2 + Math.cos(rad) * size * 0.55);
      cl.setAttribute('y2', size/2 + Math.sin(rad) * size * 0.55);

      // Transforms for components 0,1,3,4,5,6 (rotated -90 from axis)
      const rotA = axisAngle - 90;
      const rotB = axisAngle; // shaft rotates differently
      const shaftIdx = 2;

      components.forEach(({ outer, inner }, i) => {
        const { x, y } = positions[i];
        const rot = i === shaftIdx ? axisAngle : rotA;
        inner.setAttribute('transform', `translate(${x},${y}) rotate(${rot})`);

        // Counter-rotate text inside gears so letters stay upright
        if (i === 3) mText.setAttribute('transform', `rotate(${-rotA})`);
        if (i === 5) kText.setAttribute('transform', `rotate(${-rotA})`);

        // Opacity reveal
        const opacity = Math.max(0, Math.min(1, (progress - i * 0.08) * 2.5));
        outer.style.opacity = opacity;
      });

      // Label positions
      const updateLabel = (g, px, py, dx, dy) => {
        const line = g.querySelector('line');
        const dot  = g.querySelector('circle');
        const text = g.querySelector('text');
        line.setAttribute('x1', px); line.setAttribute('y1', py);
        line.setAttribute('x2', px + dx); line.setAttribute('y2', py + dy);
        dot.setAttribute('cx', px + dx); dot.setAttribute('cy', py + dy);
        text.setAttribute('x', px + dx + 6); text.setAttribute('y', py + dy + 3);
      };
      updateLabel(labelM,   positions[0].x, positions[0].y, -60, -40);
      updateLabel(labelHub, positions[3].x, positions[3].y, -size * 0.2, size * 0.08);
      updateLabel(labelK,   positions[5].x, positions[5].y,  30,  30);

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  // ─── CompactMark — nav / favicon ───────────────────────────

  function compact(containerId, { size = 36, stroke = BRAND.text } = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    startMouseTracking();

    const svg = svgEl('svg', {
      viewBox: '0 0 100 100', width: size, height: size,
      style: 'overflow:visible;display:block;transition:transform 300ms cubic-bezier(.2,.8,.2,1)',
    });

    svg.appendChild(gearRing(50, 50, 46, 40, 20, stroke));
    svg.appendChild(svgEl('circle', { cx: 50, cy: 50, r: 28, fill: 'none', stroke, 'stroke-width': 0.8 }));
    const t = svgEl('text', {
      x: 50, y: 50, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-family': 'Inter, sans-serif', 'font-weight': 900,
      'font-size': 36, 'letter-spacing': '-0.08em', fill: stroke,
    });
    t.textContent = 'MK';
    svg.appendChild(t);
    container.appendChild(svg);

    function frame() {
      svg.style.transform = `rotate(${mouseNorm.x * 14}deg)`;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  return { hero, compact };

})();
