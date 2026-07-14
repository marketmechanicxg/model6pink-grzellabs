/* ============================================================
   CONFIG — the one file to open for behavioral/visual-system
   tuning: flower density, particle "species", device-tier
   presets, and the countdown target.

   Note on scope: page CONTENT (her name, the letter, gallery
   photos, song title, nav labels, intro caption) intentionally
   stays in index.html, not here — that's the more editable place
   for prose and images, and moving it into a JS object would make
   it harder to edit, not easier. This file only holds the numeric
   and structural knobs that shape *behavior*.
============================================================ */
'use strict';

const CONFIG = {

  // Read straight from css/variables.css at runtime, so anything
  // drawn on <canvas> (the flower bloom, confetti, the intro) always
  // matches the palette instead of keeping its own stale copy of it.
  colors: (() => {
    const root = getComputedStyle(document.documentElement);
    const cssVar = (name, fallback) => (root.getPropertyValue(name) || fallback).trim();
    return {
      rose:       cssVar('--rose',        '#e88fa3'),
      roseSoft:   cssVar('--rose-soft',   '#f0b9c4'),
      roseBright: cssVar('--rose-bright', '#ff9fc0'),
      gold:       cssVar('--gold',        '#d9ab72'),
    };
  })(),

  // Petal "species" and how often each shows up in the ambient field,
  // the intro, and the finale burst. Raise/lower `w` (weight) to shift
  // the mix; add a `{ ch, w }` entry to introduce a new flower.
  petals: {
    species: [
      { ch:'🌸', w:9 }, { ch:'🌷', w:6 }, { ch:'🌼', w:6 }, { ch:'🪷', w:5 },
      { ch:'🌹', w:3 }, { ch:'🌺', w:2 }, { ch:'💐', w:1 },
    ],
    spriteSize: 64,
  },

  // "Flower density" from the brief — particle counts per canvas layer
  // (background / midground / foreground) at each device tier, plus
  // the resolution multiplier and whether that layer gets a blur pass.
  // The engine measures real frame time and steps down a tier on its
  // own if a device can't sustain it; this table just sets the ceiling.
  tiers: {
    minimal: { bg:0,  mid:5,  fg:0, dpr:1,   blur:false },
    low:     { bg:8,  mid:10, fg:3, dpr:1,   blur:false },
    medium:  { bg:16, mid:16, fg:5, dpr:1.5, blur:true  },
    high:    { bg:26, mid:22, fg:7, dpr:2,   blur:true  },
  },
  tierOrder: ['minimal', 'low', 'medium', 'high'],

  // Countdown target. Leave exactDate as null to always count down to
  // "one year from today" (a rolling next-birthday, no editing needed
  // ever again). Set a real date to target a specific one instead, e.g.
  //   exactDate: new Date(2027, 2, 14)   // March 14, 2027 — months are 0-indexed
  countdown: {
    exactDate: null,
  },

  // Background soundtrack behavior. `autoStart: true` means the track
  // begins on the visitor's very first interaction anywhere on the
  // page (click/tap/key), which is the earliest moment every modern
  // browser's autoplay policy actually allows sound to start — see
  // js/music-player.js for the unlock mechanics.
  audio: {
    autoStart: true,
    fadeMs: 1000,
    targetVolume: 0.85,
    saveIntervalMs: 4000,
    storeKey: 'nabila-garden-audio-state',
  },
};
