import { $, esc } from "../core/dom.js";

// Sub-county > Ward > Nearest public primary school. Each choice narrows the next one.
// If the ward has no schools on file, or the person's school is not listed, a text box takes the name instead.
const OTHER = "__other";
const options = (items, placeholder) => `<option value="">${placeholder}</option>` + items.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("");

export class LocationPicker {
  constructor({ api, locations, root }) { Object.assign(this, { api, locations, root }); this.cache = new Map(); this.schools = []; }

  render() {
    this.root.innerHTML = `
      <label for="lp-sc">Sub-county</label><select id="lp-sc">${options(Object.keys(this.locations).map((s) => [s, s]), "Select sub-county")}</select>
      <label for="lp-w">Ward</label><select id="lp-w" disabled>${options([], "Select sub-county first")}</select>
      <label for="lp-s">Nearest public primary school</label><select id="lp-s" disabled>${options([], "Select ward first")}</select>
      <div id="lp-ow" class="hide"><label for="lp-o" id="lp-ol">School name</label><input id="lp-o" maxlength="80" autocomplete="off" placeholder="e.g. Township Primary School"></div>`;
    $("#lp-sc", this.root).onchange = () => this.onSubCounty();
    $("#lp-w", this.root).onchange = () => this.onWard();
    $("#lp-s", this.root).onchange = () => this.syncOther();
  }

  onSubCounty() {
    const sc = $("#lp-sc", this.root).value, w = $("#lp-w", this.root);
    w.innerHTML = options((this.locations[sc] || []).map((x) => [x, x]), sc ? "Select ward" : "Select sub-county first"); w.disabled = !sc;
    this.resetSchools("Select ward first");
  }
  resetSchools(msg) { const s = $("#lp-s", this.root); s.innerHTML = options([], msg); s.disabled = true; this.schools = []; this.syncOther(); }

  async onWard() {
    const sc = $("#lp-sc", this.root).value, ward = $("#lp-w", this.root).value, s = $("#lp-s", this.root);
    if (!ward) return this.resetSchools("Select ward first");
    s.disabled = true; s.innerHTML = options([], "Loading schools…");
    const key = sc + "|" + ward;
    try { if (!this.cache.has(key)) this.cache.set(key, (await this.api.get(`/locations/schools?subCounty=${encodeURIComponent(sc)}&ward=${encodeURIComponent(ward)}`)).schools); } catch { this.cache.set(key, []); }
    if ($("#lp-w", this.root).value !== ward) return; // the person already changed their mind
    this.schools = this.cache.get(key);
    s.innerHTML = options([...this.schools.map((x) => [x.id, x.name]), [OTHER, "My school is not listed"]], "Select school"); s.disabled = false;
    if (!this.schools.length) s.value = OTHER; // nothing on file for this ward: go straight to typing
    this.syncOther();
  }

  syncOther() {
    const other = $("#lp-s", this.root).value === OTHER, none = !!$("#lp-w", this.root).value && !this.schools.length;
    $("#lp-ow", this.root).classList.toggle("hide", !other);
    $("#lp-ol", this.root).textContent = none ? "Nearest public primary school (type the name)" : "School name";
  }

  // What the API expects, or throws a message the form can show.
  value() {
    const sc = $("#lp-sc", this.root).value, ward = $("#lp-w", this.root).value, s = $("#lp-s", this.root).value, other = $("#lp-o", this.root).value.trim();
    if (!sc) throw new Error("Choose your sub-county");
    if (!ward) throw new Error("Choose your ward");
    if (!s) throw new Error("Choose the nearest public primary school");
    if (s === OTHER) { if (other.length < 3) throw new Error("Type the name of the nearest public primary school"); return { subCounty: sc, ward, schoolOther: other }; }
    return { subCounty: sc, ward, schoolId: s };
  }
}
