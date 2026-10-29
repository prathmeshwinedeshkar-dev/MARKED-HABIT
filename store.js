/* =====================================================================
   store.js: the data layer. No HTML or screen code in here.
   ===================================================================== */
const dayKey = d => d.toLocaleDateString("en-CA");          // local date as "2026-10-29"
const dayNum = key => Math.round(new Date(key) / 864e5);    // days since 1970, so dates can be compared
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/* One habit: its title, which weekdays it repeats on, and a log of when it was ticked. */
class Habit {
  constructor({ id, title, log, days }) {
    this.id = id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    this.title = title;
    this.log = log || {};                                    // { "2026-10-29": 8 } = date -> hour ticked
    this.days = Array.isArray(days) && days.length ? days : ALL_DAYS.slice();   // 0 = Sunday ... 6 = Saturday
  }
  isScheduled(date) { return this.days.includes(date.getDay()); }
  isDone(key) { return key in this.log; }
  toggle(key) {
    if (this.isDone(key)) delete this.log[key];
    else this.log[key] = new Date().getHours();
  }
  get total() { return Object.keys(this.log).length; }

  /* Streak = consecutive SCHEDULED days done, counting back from today.
     Rest days are skipped. Today not done yet does not break it. */
  get streak() {
    let n = 0;
    const d = new Date();
    for (let i = 0; i < 730; i++) {
      if (this.isScheduled(d)) {
        if (this.isDone(dayKey(d))) n++;
        else if (i > 0) break;
      }
      d.setDate(d.getDate() - 1);
    }
    return n;
  }
  /* Best streak ever: two ticked days are linked if no scheduled day sits between them. */
  get best() {
    const nums = Object.keys(this.log).map(dayNum).sort((a, b) => a - b);
    let best = 0, run = 0;
    nums.forEach((n, i) => {
      let linked = i > 0;
      for (let m = nums[i - 1] + 1; linked && m < n; m++)
        if (this.days.includes(new Date(m * 864e5).getUTCDay())) linked = false;
      run = linked ? run + 1 : 1;
      best = Math.max(best, run);
    });
    return best;
  }
}

/* The store owns the list of habits and the profile. The screen only asks it to do things. */
class Store {
  constructor(key) {
    this.key = key; this.habits = []; this.profile = null;
    try { this.replace(JSON.parse(localStorage.getItem(key))); } catch (e) { /* bad data: start clean */ }
  }
  save() { localStorage.setItem(this.key, JSON.stringify({ profile: this.profile, habits: this.habits })); }

  /* Used for loading AND for restoring a backup. Returns false if the data is not valid. */
  replace(data) {
    if (!data || !Array.isArray(data.habits)) return false;
    this.habits = data.habits.filter(h => h && typeof h.title === "string").map(h => new Habit(h));
    this.profile = data.profile && typeof data.profile.name === "string" ? data.profile : null;
    return true;
  }
  wipe() { localStorage.removeItem(this.key); this.habits = []; this.profile = null; }

  add(title, days) { this.habits.push(new Habit({ title, days })); this.save(); }
  rename(id, title) { const h = this.get(id); if (h) { h.title = title; this.save(); } }
  remove(id) {
    const index = this.habits.findIndex(h => h.id === id);
    const [habit] = this.habits.splice(index, 1);
    this.save(); return { habit, index };
  }
  restore({ habit, index }) { this.habits.splice(index, 0, habit); this.save(); }
  get(id) { return this.habits.find(h => h.id === id); }
  toggle(id, key) { this.get(id)?.toggle(key); this.save(); }
  has(title) { return this.habits.some(h => h.title.toLowerCase() === title.toLowerCase()); }

  scheduledOn(date) { return this.habits.filter(h => h.isScheduled(date)); }
  doneOn(date) { const k = dayKey(date); return this.scheduledOn(date).filter(h => h.isDone(k)).length; }

  get ticks() { return this.habits.reduce((n, h) => n + h.total, 0); }
  get bestStreak() { return Math.max(0, ...this.habits.map(h => h.best)); }
  get level() { return Math.floor(this.ticks / 10) + 1; }
  get activeDays() { return new Set(this.habits.flatMap(h => Object.keys(h.log))).size; }
  get perfectDays() {
    let n = 0;
    new Set(this.habits.flatMap(h => Object.keys(h.log))).forEach(k => {
      const d = new Date(k + "T12:00:00"), s = this.scheduledOn(d);
      if (s.length && s.every(h => h.isDone(k))) n++;
    });
    return n;
  }
  get archetype() {                 // a title earned from WHEN you usually tick habits
    const hours = this.habits.flatMap(h => Object.values(h.log));
    if (hours.length < 5) return "Rookie";
    const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
    return avg < 10 ? "Early Bird" : avg >= 21 ? "Night Owl" : "Steady Hand";
  }
  get badges() {
    return [
      { name: "First tick", got: this.ticks >= 1 },
      { name: "7-day streak", got: this.bestStreak >= 7 },
      { name: "30 ticks", got: this.ticks >= 30 },
      { name: "Perfect day", got: this.perfectDays >= 1 },
      { name: "Level 5", got: this.level >= 5 },
    ];
  }
}
