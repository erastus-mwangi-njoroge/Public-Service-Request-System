import { $ } from "./dom.js";
// Form helper: Enter key works, the button is disabled while the request runs, errors show in errSel.
export function onSubmit(sel, errSel, fn) {
  $(sel).onsubmit = async (e) => {
    e.preventDefault(); const b = $(sel + " button[type=submit]"), err = $(errSel); err.textContent = ""; b.disabled = true;
    try { await fn(); } catch (x) { err.textContent = x.message; } finally { b.disabled = false; }
  };
}
