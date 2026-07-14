/* ============================================================
   INTRO — cinematic reveal, not the gift-box unwrap. Three motion
   layers work together rather than one animation doing everything:
     1. soft glowing motes gather in from the edges toward a point
     2. real flower-emoji sprites (from the same set used across
        the site) drift slowly across the frame at their own depth
     3. a full flower unfolds from the light, flashes, and dissolves
        — with a touch of blur — straight into the page's own
        petal field, while the hero content crossfades in underneath
        so the handoff has no hard cut.

   Self-invokes at the bottom of this file, so it must load AFTER
   petals-engine.js (engine, spriteCache, weightedEmoji), hero.js
   (playHeroBloom), scroll-reveal.js (initScrollFX), and app.js
   (lenis) — i.e. last.

   RELIABILITY CONTRACT — this file is the one place a visitor can
   get physically stuck (scroll is deliberately locked for the
   animation's duration), so it holds itself to a much stricter
   standard than the rest of the site:
     - every dependency it touches (gsap, the canvas context, the
       petal engine, hero/scroll-reveal hooks) is checked before use
     - the whole sequence runs inside try/catch; any synchronous
       failure falls straight through to the same cleanup normal
       completion uses
     - a hard wall-clock timeout force-finishes the intro if the
       GSAP timeline never calls onComplete for any reason (a stuck
       promise, a callback that never fires, a tab backgrounded at
       the wrong moment)
     - the cleanup itself (`finish`) is idempotent and safe to call
       more than once, from more than one place
   Net effect: however badly something else on the page misbehaves,
   this file guarantees the visitor reaches the homepage, scrollable,
   within a bounded time.
============================================================ */
'use strict';

function runIntro(){
  // Tell the page-level watchdog (see the inline <script> right after
  // the intro markup in index.html) that this file made it this far —
  // it's the independent backstop for the case where this line never
  // runs at all (a stalled CDN request, a synchronous error earlier in
  // the bundle, a script that never loads), which this file's own
  // fail-safe timer below can't cover since that timer only starts
  // once we're already this deep into the function.
  window.__introStarted = true;

  const overlay  = document.getElementById('intro');
  const heroContent = document.querySelector('.hero-content');

  // No overlay in the markup at all → nothing to run or unlock.
  if (!overlay) return;

  let finished = false;
  let failSafeTimer = null;

  // The one and only path back to a usable page. Safe to call
  // multiple times (natural completion, the skip button, the
  // timeout, and a caught error can all reach here) and safe to
  // call even if earlier setup never got as far as building the
  // canvas scene.
  function finish(extra){
    if (finished) return;
    finished = true;
    if (failSafeTimer) clearTimeout(failSafeTimer);
    if (extra && typeof extra.beforeFinish === 'function'){
      try { extra.beforeFinish(); } catch (e){ /* already recovering — ignore */ }
    }
    try { overlay.remove(); } catch (e){ /* already gone */ }
    document.body.classList.remove('intro-active');
    if (heroContent) heroContent.classList.add('reveal');
    try {
      if (typeof lenis !== 'undefined' && lenis && typeof lenis.start === 'function') lenis.start();
    } catch (e){ console.warn('[intro] lenis.start() failed — scroll may already be native.', e); }
    try {
      if (typeof playHeroBloom === 'function') playHeroBloom();
    } catch (e){ console.warn('[intro] playHeroBloom failed — non-fatal.', e); }
    try {
      if (typeof initScrollFX === 'function') initScrollFX();
    } catch (e){ console.warn('[intro] initScrollFX failed — scroll-linked reveals will be skipped, page stays fully usable.', e); }
  }

  // However this ends, the visitor must never wait more than this
  // long for control of the page. The animated sequence itself
  // (see the GSAP timeline below) totals well under this; the extra
  // margin covers a backgrounded tab or a slow device, not a stall.
  failSafeTimer = setTimeout(() => {
    if (!finished) console.warn('[intro] fail-safe timeout reached — finishing without waiting further.');
    finish();
  }, 13000);

  document.body.classList.add('intro-active');

  const canDoFullIntro =
    !reduceMotion &&
    typeof gsap !== 'undefined' &&
    typeof spriteCache !== 'undefined' &&
    typeof weightedEmoji !== 'undefined';

  if (!canDoFullIntro){
    // Either the visitor asked for reduced motion, or a required
    // library/module didn't load — either way, skip straight to a
    // plain, instant reveal rather than showing a broken animation
    // or (worse) leaving the overlay stuck on screen.
    finish();
    return;
  }

  try {
    const canvas   = document.getElementById('introCanvas');
    const caption  = document.getElementById('introCaption');
    const rays     = document.getElementById('introRays');
    const nameEl   = document.getElementById('introName');
    const skipBtn  = document.getElementById('introSkip');

    if (!canvas){ finish(); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx){ finish(); return; }

    // build the letter-by-letter name reveal from the hero's own name,
    // so it's never a second, driftable copy of "Nabila"
    const heroNameEl = document.querySelector('.hero-name');
    const nameStr = heroNameEl ? heroNameEl.textContent.trim() : '';
    const nameLetters = [];
    if (nameEl && nameStr){
      nameStr.split('').forEach(ch=>{
        const span = document.createElement('span');
        span.textContent = ch === ' ' ? '\u00A0' : ch;
        nameEl.appendChild(span);
        nameLetters.push(span);
      });
    }

    let W,H,DPR;
    function resize(){
      DPR = Math.min(window.devicePixelRatio||1, 2);
      W = canvas.width  = innerWidth*DPR;
      H = canvas.height = innerHeight*DPR;
      canvas.style.width = innerWidth+'px'; canvas.style.height = innerHeight+'px';
      ctx.setTransform(DPR,0,0,DPR,0,0);
    }
    resize();
    // Mobile browsers fire `resize` repeatedly as the address bar
    // shows/hides while scrolling/animating — coalesce those into
    // one resize per frame instead of thrashing the canvas buffer.
    let resizePending = false;
    function onResize(){
      if (resizePending) return;
      resizePending = true;
      requestAnimationFrame(() => { resizePending = false; try { resize(); } catch(e){} });
    }
    window.addEventListener('resize', onResize);

    const cx = () => innerWidth/2;
    const cy = () => innerHeight/2;

    // layer 1 — soft points of light that gather in toward the center
    const N = 26;
    const motes = Array.from({length:N}, () => ({
      angle: Math.random()*Math.PI*2,
      dist:  rand(0.5, 1),
      size:  rand(1.4, 3.6),
      twPhase: Math.random()*Math.PI*2,
      twSpeed: rand(0.0016, 0.0038),
    }));

    // layer 2 — a handful of real flower-emoji sprites (same sprite
    // cache the ambient petal engine uses) drifting slowly across the
    // frame at their own pace and depth, independent of the gathering
    // light.
    const driftFlowers = Array.from({length:7}, () => ({
      sprite: spriteCache.get(weightedEmoji[(Math.random()*weightedEmoji.length)|0]),
      xStart: rand(-0.2, 1.0),
      y: rand(0.14, 0.86),
      speed: rand(0.055, 0.11),   // fraction of screen width per second
      size: rand(28, 52),
      bob: rand(10, 20),
      bobSpeed: rand(0.0005, 0.0009),
      bobPhase: Math.random()*Math.PI*2,
      spin: rand(-0.25, 0.25),
      spinSpeed: rand(-0.0004, 0.0004),
      born: null,
    }));

    // scene state, driven entirely by GSAP tweens below
    const scene = { glow:0, gather:0, bloom:0, spin:0, flash:0, drift:0, opacity:1 };

    function drawGlow(){
      const R = 240 * (0.35 + scene.glow*0.75) * (1 + scene.flash*0.7);
      if (R <= 0) return;
      const g = ctx.createRadialGradient(cx(),cy(),0, cx(),cy(),R);
      g.addColorStop(0,    `rgba(255,222,232,${0.55*scene.glow + scene.flash*0.45})`);
      g.addColorStop(0.55, `rgba(255,159,192,${0.26*scene.glow})`);
      g.addColorStop(1,    'rgba(255,159,192,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx(),cy(),R,0,Math.PI*2); ctx.fill();
    }
    function drawMotes(now){
      const R = Math.min(innerWidth, innerHeight) * 0.6;
      motes.forEach(m=>{
        const d = m.dist * R * (1 - scene.gather);
        const x = cx() + Math.cos(m.angle)*d;
        const y = cy() + Math.sin(m.angle)*d;
        const tw = 0.5 + Math.sin(now*m.twSpeed + m.twPhase)*0.5;
        ctx.globalAlpha = (0.22 + tw*0.55) * (1 - scene.gather*0.4);
        ctx.fillStyle = '#ffe3ee';
        ctx.beginPath(); ctx.arc(x,y,m.size,0,Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    function drawDriftFlowers(now){
      if (scene.drift <= 0) return;
      driftFlowers.forEach(f=>{
        if (!f.sprite) return; // defensive: a sprite cache miss should skip, not throw
        if (f.born === null) f.born = now;
        const t = (now - f.born) / 1000;
        const x = ((f.xStart + f.speed*t*0.12) % 1.3 - 0.15) * innerWidth;
        const y = f.y*innerHeight + Math.sin(now*f.bobSpeed + f.bobPhase)*f.bob;
        const rot = f.spin + now*f.spinSpeed;
        ctx.save();
        ctx.globalAlpha = scene.drift * 0.8;
        ctx.translate(x,y); ctx.rotate(rot);
        ctx.drawImage(f.sprite, -f.size/2, -f.size/2, f.size, f.size);
        ctx.restore();
      });
    }
    function drawFlower(){
      if (scene.bloom <= 0) return;
      const petals = 8;
      const colors = [CONFIG.colors.rose, CONFIG.colors.roseSoft, CONFIG.colors.roseBright];
      ctx.save();
      ctx.translate(cx(), cy());
      ctx.rotate(scene.spin);
      const len = 96 * scene.bloom, wid = 34 * scene.bloom;
      for (let i=0;i<petals;i++){
        ctx.save();
        ctx.rotate((Math.PI*2/petals)*i);
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.ellipse(0, -len*0.55, wid*0.5, len*0.55, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = CONFIG.colors.gold;
      ctx.beginPath(); ctx.arc(0,0, 15*scene.bloom, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    function drawLensBloom(){
      // two faint expanding rings + a soft cross-flare, only visible
      // during the flash beat — reads as a camera lens catching the
      // bloom's light rather than a screen-wipe
      if (scene.flash <= 0) return;
      ctx.save();
      ctx.globalAlpha = scene.flash * 0.5;
      ctx.strokeStyle = '#ffe9f1';
      [1, 1.6].forEach((m,i)=>{
        ctx.globalAlpha = scene.flash * (0.32 - i*0.14);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(cx(), cy(), 70*m*(0.6+scene.flash*0.6), 0, Math.PI*2);
        ctx.stroke();
      });
      ctx.globalAlpha = scene.flash * 0.55;
      ctx.fillStyle = '#fff6fa';
      ctx.fillRect(0, cy()-0.6, innerWidth, 1.2);
      ctx.fillRect(cx()-0.6, 0, 1.2, innerHeight);
      ctx.restore();
    }
    function drawScene(now){
      ctx.clearRect(0,0,innerWidth,innerHeight);
      if (scene.opacity <= 0) return;
      ctx.save();
      ctx.globalAlpha = scene.opacity;
      drawGlow();
      drawDriftFlowers(now);
      drawMotes(now);
      drawFlower();
      drawLensBloom();
      ctx.restore();
    }

    let raf;
    let loopAlive = true;
    (function loop(now){
      if (!loopAlive) return;
      // A single bad frame (e.g. a transient canvas error) must not
      // kill the whole draw loop for the rest of the sequence — log
      // it once and keep scheduling frames regardless.
      try { drawScene(now||0); }
      catch (e){ console.warn('[intro] a frame failed to draw — continuing.', e); }
      raf = requestAnimationFrame(loop);
    })();

    function stopDrawLoop(){
      loopAlive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    }

    overlay.style.filter = 'blur(0px)';
    const tl = gsap.timeline({
      defaults:{ ease:'power2.out' },
      onComplete: () => finish({ beforeFinish: stopDrawLoop })
    });

    // slow continuous "camera" push-in on the whole canvas, running the
    // full length of the sequence underneath every other beat below
    gsap.to(canvas, { scale:1.045, duration:9.5, ease:'sine.inOut' });

    // phase 1 — black frame breathes open, flower emojis drift in first,
    // soft light rays fade up behind them like a window opening
    tl.to(scene, { drift:1, duration:.9, ease:'sine.out' })
      .call(() => { if (rays) rays.classList.add('on'); }, null, '-=.6')
      .to(scene, { glow:1, duration:1.0, ease:'sine.inOut' }, '-=.55')
      .to(scene, { gather:1, duration:1.15, ease:'power3.inOut' }, '-=.55')
      .to(caption, { opacity:1, duration:.6 }, '-=.7')
      .to(scene, { drift:0, duration:.8, ease:'sine.in' }, '-=.9')
      // phase 1.5 — her name assembles out of the gathered light: each
      // letter drifts up, unblurs and settles in, softly staggered
      .to(caption, { opacity:0, duration:.4 }, '+=.1')
      .to(nameLetters, {
        opacity:1, filter:'blur(0px)', y:0, scale:1,
        duration:.9, ease:'power2.out', stagger:0.045
      }, '-=.1')
      .to({}, { duration:.5 }) // a beat to let her name simply sit, unhurried
      .to(nameLetters, { opacity:0, filter:'blur(10px)', duration:.5, ease:'sine.in', stagger:0.02 })
      // phase 2 — the light blooms into a full flower
      .to(scene, { bloom:1, spin: 0.35, duration:1.35, ease:'elastic.out(0.7,0.6)' }, '-=.2')
      .call(() => { if (rays) rays.classList.remove('on'); }, null, '-=.9')
      .to(scene, { flash:1, duration:.32, ease:'power2.out' }, '+=.05')
      .call(() => {
        // Decorative only — a failure here (e.g. the petal engine
        // couldn't init on a constrained device) must never take the
        // rest of the timeline down with it.
        try {
          if (typeof engine !== 'undefined' && engine.burst){
            engine.burst(cx(), cy(), 30, { spread:Math.PI*2, minSpeed:4, maxSpeed:10, gravity:.12, maxLife:4200 });
            const steps = 14;
            for (let i=0;i<steps;i++){
              gsap.delayedCall(i*0.05, () => {
                try { engine.burst(rand(0,innerWidth), innerHeight+20, 3, { spread:Math.PI*0.5, minSpeed:4, maxSpeed:8, gravity:.12, maxLife:4200 }); }
                catch (e){ /* non-fatal decorative effect */ }
              });
            }
          }
        } catch (e){ console.warn('[intro] petal burst failed — non-fatal.', e); }
      })
      .to(scene, { flash:0, duration:.6 }, '+=.05')
      // phase 3 — dissolve (opacity + a touch of blur for depth) while
      // the hero crossfades in underneath, so the cut is never hard
      .call(() => {
        try {
          if (heroContent) heroContent.classList.add('reveal');
          if (typeof playHeroBloom === 'function') playHeroBloom();
        } catch (e){ console.warn('[intro] hero reveal/bloom failed — non-fatal.', e); }
      }, null, '+=.9')
      .to(scene, { opacity:0, duration:.9, ease:'sine.in' }, '<')
      .to(overlay, { opacity:0, duration:.9, pointerEvents:'none', filter:'blur(10px)', ease:'sine.in' }, '<');

    if (skipBtn){
      // `click` alone already covers mouse, touch (browsers synthesize
      // a click on tap) and keyboard activation (Enter/Space on a
      // focused <button>) — no separate touch handler needed here.
      skipBtn.addEventListener('click', () => {
        try { tl.progress(1); }
        catch (e){ finish({ beforeFinish: stopDrawLoop }); }
      });
    }

    // don't let wheel/touch scroll leak out during intro
    const blockScroll = (e) => e.preventDefault();
    overlay.addEventListener('wheel', blockScroll, {passive:false});
    overlay.addEventListener('touchmove', blockScroll, {passive:false});

  } catch (err){
    // Anything above throwing synchronously (missing DOM node, a
    // library that loaded but errors on first use, etc.) lands here.
    // The fail-safe timeout is a backstop for async hangs; this is
    // the backstop for everything else.
    console.warn('[intro] intro sequence failed to start — falling back to an instant reveal.', err);
    finish();
  }
}

try {
  runIntro();
} catch (err){
  // Belt and braces: if even calling runIntro() somehow throws
  // outside its own try/catch (e.g. a ReferenceError before the
  // function body runs), make sure the visitor still isn't stuck
  // behind the intro overlay with scroll locked.
  console.warn('[intro] unrecoverable error — force-unlocking the page.', err);
  if (typeof window.__rescueIntroPage === 'function'){
    window.__rescueIntroPage();
  } else {
    document.body.classList.remove('intro-active');
    const overlay = document.getElementById('intro');
    if (overlay) overlay.remove();
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) heroContent.classList.add('reveal');
    try { if (typeof lenis !== 'undefined' && lenis) lenis.start(); } catch (e){}
  }
}
