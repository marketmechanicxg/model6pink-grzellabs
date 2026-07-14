/* ============================================================
   APP — page-level bootstrap. Everything here is a cross-cutting
   concern that doesn't belong to one feature module: smooth
   scrolling, in-page anchor navigation, and the finale button.

   Loads early (right after config/utils/petals-engine) so `lenis`
   exists before navigation.js runs; references to things defined
   in later files (closeIndex, engine.burst) are safe because they
   only run inside event-listener callbacks, which fire long after
   every module has finished loading.
============================================================ */
'use strict';

gsap.registerPlugin(ScrollTrigger);
const lenis = new Lenis({ duration: 1.15, smoothTouch:false, touchMultiplier:1.4 });
lenis.on('scroll', () => { ScrollTrigger.update(); });
gsap.ticker.add((t)=> lenis.raf(t*1000));
gsap.ticker.lagSmoothing(0);
lenis.stop(); // released once the intro finishes (see intro.js)

document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', e=>{
    e.preventDefault();
    const el = document.querySelector(a.getAttribute('href'));
    if (el) lenis.scrollTo(el, {offset:0, duration:1.3});
    closeIndex();
  });
});

/* ---- finale confetti — also seeds a burst into the petal engine ---- */
document.getElementById('confettiBtn').addEventListener('click', (e)=>{
  const colors = [CONFIG.colors.rose, CONFIG.colors.roseSoft, CONFIG.colors.gold, CONFIG.colors.roseBright];
  confetti({ particleCount: 120, spread: 100, startVelocity: 36, gravity:.7, scalar:1.1, colors, origin:{y:.7} });
  confetti({ particleCount: 50, spread: 140, startVelocity: 20, gravity:.5, scalar:.8, colors, origin:{y:.6}, angle:60 });
  confetti({ particleCount: 50, spread: 140, startVelocity: 20, gravity:.5, scalar:.8, colors, origin:{y:.6}, angle:120 });
  const r = e.currentTarget.getBoundingClientRect();
  engine.burst(r.left+r.width/2, r.top, 22, {spread:Math.PI*1.4, minSpeed:2, maxSpeed:6, gravity:0.1});
});
