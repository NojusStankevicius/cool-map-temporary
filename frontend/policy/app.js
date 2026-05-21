"use strict";

// ── Policy site extensions ─────────────────────────────────────────────────
//
// This file runs AFTER /js/app.js — the full public map is already initialised.
// Add policy-only features here: extra data layers, charts, data viz panels.
// Do NOT duplicate anything from app.js; patch or extend what's already there.
//
// Hook in after the public app has booted:

document.addEventListener("DOMContentLoaded", () => {
  // app.js uses its own DOMContentLoaded listener; by the time a second one
  // fires the public map is set up. Use requestAnimationFrame to ensure the
  // public boot has finished (it's synchronous inside DOMContentLoaded).
  requestAnimationFrame(() => {
    initPolicySite();
  });
});

function initPolicySite() {
  // Activate policy mode (body class drives CSS; mode-btn no longer exists)
  document.body.classList.remove("mode-user");
  document.body.classList.add("mode-policy");

  // TODO: add extra sidebar layers to #sidebar-policy-extra
  // TODO: add data visualisation panel below the map or in the right panel
  // TODO: load heat risk / intervention priority data
  // TODO: add district-level statistics chart
}
