NABILA — IN FULL BLOOM
A polished birthday experience.

PROJECT STRUCTURE
  index.html            → page structure & all content (name, photos, letter,
                           gallery captions, song title, nav labels — see below)

  css/
    variables.css        → design tokens: colors, fonts, spacing, timing
    base.css             → reset + the few truly global elements
    ambient.css           → background glow, grain, vignette, custom cursor
    intro.css             → the opening cinematic overlay
    navigation.css        → the header (a true 3-column CSS Grid, not a
                            flex row — see the comment in the file for
                            why that's the actual fix for "centered on
                            every viewport"). On wider screens the menu
                            is a plain always-visible link bar, not a
                            toggle — the toggle + full-screen index only
                            take over below ~900px, where seven spelled-
                            out links stop fitting next to the logo
    hero.css              → the hero section
    sections.css          → gallery, notes, letter, music player, countdown,
                            finale, footer (one file — these six sections
                            share one visual language, splitting them further
                            wouldn't add real separation, just more files)
    responsive.css        → tablet / mobile / landscape / ultrawide overrides

  js/  (loaded in this exact order — see the <script> tags at the
        bottom of index.html; each file's header comment says what
        it needs from the ones before it)
    config.js             → behavioral knobs: flower density per device
                            tier, the flower "species" mix, and the
                            countdown target date. Colors are read live
                            from variables.css, not duplicated here.
    utils.js              → reduceMotion/hoverCapable checks, clamp, rand
    petals-engine.js       → the canvas particle system (physics, pooling,
                            adaptive quality) — the core visual engine
    app.js                 → page bootstrap: smooth scroll, in-page anchor
                            links, the finale confetti button
    navigation.js          → the bloom toggle + full-screen index
    hero.js                → magnetic buttons, cursor petal, the hero bloom
    scroll-reveal.js        → section fade-ins, letter choreography,
                            ambient mood per section, gallery parallax
    music-player.js         → the single-track soundtrack player
    countdown.js            → the petal-dial countdown
    intro.js                → the cinematic opening (loads last — it
                            self-starts once every other module is ready).
                            Now also assembles her name, letter by letter,
                            out of the gathered light mid-sequence, adds a
                            slow rotating light-ray layer and a soft lens-
                            bloom flash, and gives the whole canvas a very
                            slow "camera push-in" for the length of the
                            sequence.
    atmosphere.js           → the whole-page light-dust layer: a handful
                            of slow glowing motes generated once, then
                            driven entirely by CSS keyframes (no per-frame
                            JS cost). Skips under reduced motion and scales
                            down on lower device tiers.

  assets/
    images/               → your 5 original photos
    audio/                → drop your one mp3 here (see below)

A NOTE ON WHY CONTENT LIVES IN index.html, NOT IN A CONFIG OBJECT
  Her name, the letter, gallery captions, the song title, and the nav
  chapter names are deliberately kept as plain HTML text, not moved into
  js/config.js. That's not a shortcut — editing readable prose directly
  in the page is easier than digging through a JS object, and this
  project intentionally has no build step (you can just double-click
  index.html), which also rules out ES-module imports as an architecture
  choice: they refuse to load over file://. config.js instead holds the
  things that are genuinely settings, not content: density, timing,
  device-tier thresholds, and the countdown date.

HOW TO OPEN
  Just double-click index.html, or upload the whole folder to any static
  host (Netlify, Vercel, GitHub Pages, etc). No build step, no npm install.

TO ADD REAL MUSIC (Our Song section)
  This site plays ONE carefully-chosen track, not a playlist.
  1. Put a single mp3 file in assets/audio/ named exactly: song.mp3
  2. In index.html, find <section id="playlist"> and edit the
     ".track-title" and ".track-sub" text to match your song.
  The player fades the track in and out smoothly and remembers exactly
  where playback left off between visits (browsers won't auto-resume
  playing without a fresh tap, but it does pick up from the right second).

TO SET THE EXACT COUNTDOWN DATE
  Open js/config.js, find `countdown.exactDate`, and set it, e.g.:
       exactDate: new Date(2027, 2, 14)   // March 14, 2027 (months are 0-indexed)
  Leave it as null to always count to "one year from today" — no editing
  ever needed again.

TO CHANGE FLOWER DENSITY OR THE FLOWER MIX
  Open js/config.js, find `petals.species` (weights control how often each
  flower shows up) and `tiers` (particle counts per device performance tier).

TO EDIT THE LETTER / NAV LABELS / GALLERY CAPTIONS
  Open index.html directly and edit the text — see the section comments
  (<!-- NAV -->, <section id="message">, etc.) to find your way around.

ABOUT THE LAYOUT
  The site is now centered throughout — hero, section headings, field
  notes, the letter, the music player, the countdown — rather than the
  earlier editorial left-aligned style. The large flower decoration that
  used to sit beside her name in the hero has also been removed entirely;
  the hero is just her name, centered, over the ambient petal field.

NEWEST TOUCHES (this pass)
  - A dynamic greeting ("Good evening — ...") in front of the hero's
    eyebrow line, based on the visitor's local time — see the small
    IIFE at the top of js/hero.js.
  - A scroll-progress hairline under the nav, filling as the page is
    read (js/scroll-reveal.js + .scroll-progress in css/ambient.css).
  - A memory counter under the gallery intro that counts up to the
    real number of press-cards in the DOM the first time it's
    scrolled into view — never hard-coded, so adding a 6th photo
    just works.
  - A subtle whole-page light-dust layer (js/atmosphere.js) drifting
    behind the content, on top of the existing petal canvases.
  - The intro sequence now spells out her name in gathered light
    partway through, adds a slow rotating light-ray layer and a soft
    lens-bloom flash at the bloom's peak, and gives the whole canvas
    a slow continuous "camera push-in" for a more cinematic, less
    static feel.

ABOUT THE PETAL ENGINE & INTRO
  The falling petals are a real canvas physics engine (js/petals-engine.js)
  — three depth layers, object pooling, wind, drag, gravity, and a live
  performance monitor that automatically reduces particle counts on
  slower devices. The opening sequence (js/intro.js) is canvas-drawn and
  timed with GSAP: a single point of light gathers floating petals of
  light in from the edges of the screen, drifting flower emojis cross
  the frame at their own depth, then everything unfolds into a full
  bloom that flashes and dissolves — with a touch of blur — straight
  into the page's own petal field, while the hero content crossfades in
  underneath so the handoff is never a hard cut. Visitors can tap "Skip"
  to jump straight to the page. People with "reduce motion" turned on in
  their OS skip it automatically and get a calmer, mostly-static page.
