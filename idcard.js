/* =====================================================================
   idcard.js: generates the Habit ID card on a <canvas>.
   Same name + join date always produces the same pattern.
   ===================================================================== */
function hash(s) {                  // turns text into a number (FNV-1a hash)
  let h = 2166136261;
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {                // seeded random numbers (mulberry32): same seed, same sequence
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const CARD_COLORS = ["#ffe14a", "#7ee0c3", "#ff9f7a", "#a9b8ff", "#f5a6e6"];

function habitId(p) {
  const a = hash(p.name + p.created).toString(36).toUpperCase().padStart(7, "0").slice(0, 4);
  const b = hash(p.created + p.name).toString(36).toUpperCase().padStart(2, "0").slice(0, 2);
  return "MRK-" + a + "-" + b;
}

function drawCard(store, canvas) {
  const p = store.profile, g = canvas.getContext("2d"), r = rng(hash(p.name + p.created));
  const F = '"Bricolage Grotesque", system-ui, sans-serif', color = CARD_COLORS[Math.floor(r() * CARD_COLORS.length)];
  g.clearRect(0, 0, 800, 500);
  g.fillStyle = "#1c2452"; g.beginPath(); g.roundRect(0, 0, 800, 500, 36); g.fill();
  g.fillStyle = color; g.fillRect(0, 0, 800, 14);

  // identicon: 5x5 grid, the left 3 columns are random, the right 2 mirror them
  const cell = 44, ox = 50, oy = 70;
  g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(ox - 14, oy - 14, cell * 5 + 28, cell * 5 + 28);
  g.fillStyle = color;
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) if (r() > .45) {
    g.fillRect(ox + x * cell, oy + y * cell, cell - 4, cell - 4);
    g.fillRect(ox + (4 - x) * cell, oy + y * cell, cell - 4, cell - 4);
  }

  g.fillStyle = "#fff"; g.font = "800 46px " + F; g.fillText(p.name, 330, 120, 420);
  g.fillStyle = "#aab2dd"; g.font = "400 24px " + F;
  g.fillText([p.college, p.branch].filter(Boolean).join(", "), 330, 158, 420);
  g.fillStyle = color; g.font = "600 26px " + F;
  g.fillText(store.archetype + "  \u00b7  Level " + store.level, 330, 214);
  if (p.why) { g.fillStyle = "#fff"; g.font = "italic 400 22px " + F; g.fillText("\u201C" + p.why + "\u201D", 330, 256, 420); }

  [["Best streak", store.bestStreak], ["Ticks", store.ticks], ["Active days", store.activeDays]].forEach(([k, v], i) => {
    g.fillStyle = "#fff"; g.font = "800 44px " + F; g.fillText(String(v), 50 + i * 170, 400);
    g.fillStyle = "#aab2dd"; g.font = "400 18px " + F; g.fillText(k, 50 + i * 170, 428);
  });
  let x = 560; g.fillStyle = "#fff";                 // barcode strip drawn from the same seed
  while (x < 750) { const w = 2 + Math.floor(r() * 5); g.fillRect(x, 372, w, 56); x += w + 2 + Math.floor(r() * 4); }
  g.fillStyle = "#aab2dd"; g.font = "600 20px " + F; g.fillText(habitId(p), 560, 460);
  g.font = "400 16px " + F;
  g.fillText("Member since " + new Date(p.created).toLocaleDateString("en-IN", { month: "short", year: "numeric" }), 50, 466);
}
