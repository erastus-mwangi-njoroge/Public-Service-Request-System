// Who is signed in. Holds the token and user, persists the token, and tells listeners when either changes.
const KEY = "mcg_token";
const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

export class Session {
  constructor() { this.token = safe(() => localStorage.getItem(KEY), "") || ""; this.user = null; this.listeners = []; }
  onChange(fn) { this.listeners.push(fn); }
  emit() { this.listeners.forEach((f) => f(this)); }
  set({ token, user }) { this.token = token; this.user = user; safe(() => localStorage.setItem(KEY, token)); this.emit(); }
  clear() { this.token = ""; this.user = null; safe(() => localStorage.removeItem(KEY)); this.emit(); }
  get isStaff() { return !!this.user && this.user.role !== "citizen"; }
  get isAdmin() { return !!this.user && this.user.role === "admin"; }
  get isCitizen() { return !!this.user && this.user.role === "citizen"; }
}
