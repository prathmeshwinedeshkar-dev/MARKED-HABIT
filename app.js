/* =====================================================================
   app.js: the screen. Reads from the store, draws, and reacts to taps.
   ===================================================================== */
const $ = id => document.getElementById(id);
const store = new Store("marked.v2");
const STARTERS = ["Sleep before 12", "Revise for 1 hour", "Drink 3L water", "Walk 20 minutes", "No phone for the first hour", "Log today's spends"];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let pickDays = ALL_DAYS.slice();       // weekdays chosen in the add form
let undoTimer = null, lastDeleted = null;

const greeting = h => h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Still up";
const buzz = pattern => { if (navigator.vibrate) navigator.vibrate(pattern); };

/* ---------- Today ---------- */
function renderToday() {
  const now = new Date(), key = dayKey(now);
  const todays = store.scheduledOn(now), done = store.doneOn(now), total = todays.length, left = total - done;
  $("today").textContent = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  $("greeting").textContent = greeting(now.getHours()) + (store.profile ? ", " + store.profile.name.split(" ")[0] + "." : ".");
  $("doneCount").textContent = done; $("totalCount").textContent = total;
  $("barFill").style.width = total ? done / total * 100 + "%" : "0%";
  $("tallyText").textContent = total === 0
    ? (store.habits.length ? "Rest day. Nothing scheduled." : "Nothing on the sheet yet.")
    : left === 0 ? "Every habit ticked off." : left + (left === 1 ? " habit" : " habits") + " still to go.";
  $("win").textContent = total && !left ? "Clean sheet today. Go enjoy it." : "";
  const resting = store.habits.filter(h => !h.isScheduled(now));
  $("rest").textContent = resting.length ? "Resting today: " + resting.map(h => h.title).join(", ") : "";

  $("chips").innerHTML = "";
  STARTERS.filter(s => !store.has(s)).forEach(s => {
    const b = document.createElement("button"); b.type = "button"; b.textContent = s;
    b.onclick = () => { store.add(s, ALL_DAYS); render(); };
    $("chips").appendChild(b);
  });

  const list = $("list"); list.innerHTML = "";
  if (!store.habits.length) list.innerHTML = '<p class="empty">Add one habit you can finish in ten minutes. Start there.</p>';
  todays.forEach(h => list.appendChild(buildRow(h, key)));
}

function buildRow(h, key) {
  const li = document.createElement("li"); if (h.isDone(key)) li.className = "done";
  const chk = document.createElement("button"); chk.className = "check";
  chk.setAttribute("aria-label", (h.isDone(key) ? "Mark not done: " : "Mark done: ") + h.title);
  chk.innerHTML = '<svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';
  chk.onclick = () => {
    const now = new Date(), wasAll = store.doneOn(now) === store.scheduledOn(now).length;
    store.toggle(h.id, key);
    const isAll = store.doneOn(now) === store.scheduledOn(now).length;
    if (!wasAll && isAll) celebrate(); else if (h.isDone(key)) buzz(15);
    render();
  };
  const info = document.createElement("div"); info.className = "info";
  const name = document.createElement("span"); name.className = "name"; name.textContent = h.title;   // textContent: typed HTML stays harmless
  const st = document.createElement("span"); st.className = "streak";
  st.textContent = (h.streak ? h.streak + "-day streak" : h.total ? "Streak broke. Restart today." : "Not started yet")
    + (h.days.length < 7 ? "  \u00b7  " + h.days.map(d => DAY_NAMES[d]).join(" ") : "");
  info.append(name, st);
  const edit = document.createElement("button"); edit.className = "icon-btn"; edit.textContent = "\u270e"; edit.setAttribute("aria-label", "Rename " + h.title);
  edit.onclick = () => {
    const t = (prompt("Rename habit", h.title) || "").trim();
    if (t && t !== h.title && !store.has(t)) { store.rename(h.id, t.slice(0, 60)); render(); }
  };
  const del = document.createElement("button"); del.className = "icon-btn del"; del.textContent = "\u00d7"; del.setAttribute("aria-label", "Delete " + h.title);
  del.onclick = () => { lastDeleted = store.remove(h.id); showToast("Deleted \u201C" + h.title + "\u201D"); render(); };
  li.append(chk, info, edit, del);
  return li;
}

function celebrate() {
  buzz([30, 40, 30]);
  $("tally").classList.add("party"); setTimeout(() => $("tally").classList.remove("party"), 600);
  if (reduceMotion) return;
  for (let i = 0; i < 26; i++) {
    const c = document.createElement("span"); c.className = "confetti";
    c.style.left = 20 + Math.random() * 60 + "vw"; c.style.top = "30vh";
    c.style.background = CARD_COLORS[i % CARD_COLORS.length];
    c.style.setProperty("--dx", (Math.random() - .5) * 240 + "px"); c.style.setProperty("--dy", 120 + Math.random() * 220 + "px");
    document.body.appendChild(c); setTimeout(() => c.remove(), 1000);
  }
}

/* ---------- Undo toast ---------- */
function showToast(text) {
  $("toastText").textContent = text; $("toast").hidden = false;
  clearTimeout(undoTimer); undoTimer = setTimeout(() => { $("toast").hidden = true; lastDeleted = null; }, 6000);
}
$("toastBtn").onclick = () => { if (lastDeleted) { store.restore(lastDeleted); lastDeleted = null; } $("toast").hidden = true; render(); };

/* ---------- Add form ---------- */
function buildRepeat() {
  ALL_DAYS.forEach(d => {
    const b = document.createElement("button"); b.type = "button"; b.textContent = DAY_NAMES[d].slice(0, 2);
    b.setAttribute("aria-label", DAY_NAMES[d]); b.setAttribute("aria-pressed", "true");
    b.onclick = () => {
      pickDays = pickDays.includes(d) ? pickDays.filter(x => x !== d) : pickDays.concat(d);
      b.setAttribute("aria-pressed", pickDays.includes(d));
    };
    $("repeat").appendChild(b);
  });
}
$("addForm").addEventListener("submit", e => {
  e.preventDefault(); const t = $("habitInput").value.trim();
  if (!t) { $("error").textContent = "Type a habit first."; return; }
  if (!pickDays.length) { $("error").textContent = "Pick at least one day to repeat on."; return; }
  if (store.has(t)) { $("error").textContent = "That one is already on your sheet."; return; }
  store.add(t, pickDays.slice().sort());
  $("habitInput").value = ""; $("error").textContent = ""; render();
});

/* ---------- Insights ---------- */
function ratioOn(d) { const s = store.scheduledOn(d).length; return s ? store.doneOn(d) / s : 0; }
function renderInsights() {
  const week = $("week"); week.innerHTML = ""; let sum = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const r = ratioOn(d); sum += r;
    const col = document.createElement("div"); if (i === 0) col.className = "today";
    col.innerHTML = '<i style="height:' + Math.round(r * 90) + 'px"></i>' + d.toLocaleDateString("en-IN", { weekday: "narrow" });
    week.appendChild(col);
  }
  // heatmap: 12 columns (weeks) x 7 rows (Sunday to Saturday), newest week on the right
  const heat = $("heat"); heat.innerHTML = "";
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const start = new Date(today); start.setDate(today.getDate() - today.getDay() - 77);
  for (let i = 0; i < 84; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const cell = document.createElement("i");
    if (d > today) cell.className = "future";
    else { const r = ratioOn(d); cell.dataset.l = r === 0 ? 0 : r < .5 ? 1 : r < 1 ? 2 : 3; cell.title = dayKey(d) + ": " + Math.round(r * 100) + "%"; }
    heat.appendChild(cell);
  }
  const rate = Math.round(sum / 7 * 100), top = [...store.habits].sort((a, b) => b.total - a.total)[0];
  const facts = [["Weekly rate", rate + "%"], ["Best streak", store.bestStreak + "d"], ["Total ticks", store.ticks], ["Strongest", top && top.total ? top.title : "None yet"]];
  $("facts").innerHTML = "";
  facts.forEach(([k, v]) => { const p = document.createElement("p"), b = document.createElement("b"); b.textContent = v; p.append(b, k); $("facts").appendChild(p); });
  $("insight").textContent = !store.habits.length ? "Add a habit to start seeing patterns." :
    rate >= 70 ? "Strong week. Don't add more habits; protect these." :
    rate >= 40 ? "Decent. Pick the habit you skip most and give it a fixed time every day." :
    "Rough weeks happen. Shrink your list to two habits and rebuild.";
}

/* ---------- ID tab ---------- */
function renderId() {
  if (!store.profile) return;
  drawCard(store, $("card"));
  $("badges").innerHTML = "";
  store.badges.forEach(b => { const s = document.createElement("span"); s.textContent = b.name; if (b.got) s.className = "got"; $("badges").appendChild(s); });
}
$("tilt").addEventListener("pointermove", e => {      // card leans toward the pointer
  if (reduceMotion) return;
  const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  $("card").style.transform = "rotateY(" + x * 12 + "deg) rotateX(" + -y * 12 + "deg)";
});
$("tilt").addEventListener("pointerleave", () => { $("card").style.transform = ""; });

function openProfile() {
  const p = store.profile || {};
  $("pName").value = p.name || ""; $("pCollege").value = p.college || "VIT Pune"; $("pBranch").value = p.branch || ""; $("pWhy").value = p.why || "";
  $("profileDlg").showModal();
}
$("profileForm").addEventListener("submit", () => {
  const old = store.profile;
  store.profile = { name: $("pName").value.trim(), college: $("pCollege").value.trim(), branch: $("pBranch").value.trim(),
                    why: $("pWhy").value.trim(), created: old ? old.created : new Date().toISOString() };
  store.save(); render();
});
$("editProfile").onclick = openProfile;
$("dlCard").onclick = () => $("card").toBlob(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "marked-id.png"; a.click(); });
$("backup").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ profile: store.profile, habits: store.habits })], { type: "application/json" }));
  a.download = "marked-backup-" + dayKey(new Date()) + ".json"; a.click();
};
$("restore").onclick = () => $("file").click();
$("file").onchange = async e => {
  try {
    if (!store.replace(JSON.parse(await e.target.files[0].text()))) throw new Error("invalid");
    store.save(); render();
  } catch (err) { alert("That file is not a Marked backup."); }
  e.target.value = "";
};
$("wipe").onclick = () => {
  if (!confirm("Delete your profile, habits and history from this device? This cannot be undone.")) return;
  store.wipe(); render(); openProfile();
};

/* ---------- Theme ---------- */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  $("themeBtn").textContent = t === "dark" ? "Light" : "Dark";
  $("themeColor").content = t === "dark" ? "#070a1f" : "#1c2452";
  try { localStorage.setItem("marked.theme", t); } catch (e) {}
}
$("themeBtn").onclick = () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");

/* ---------- Tabs and start-up ---------- */
$("tabs").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  document.querySelectorAll("#tabs button").forEach(x => x.setAttribute("aria-selected", x === b));
  document.querySelectorAll(".view").forEach(v => v.hidden = v.id !== "v-" + b.dataset.view);
  window.scrollTo(0, 0); render();
});
function render() {
  renderToday();
  if (!$("v-insights").hidden) renderInsights();
  if (!$("v-id").hidden) renderId();
}

buildRepeat();
applyTheme(document.documentElement.dataset.theme);
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js");
document.fonts.load('800 20px "Bricolage Grotesque"').then(render);
render();
if (!store.profile) openProfile();
