import { esc } from "../core/dom.js";

// Site footer. Contact details come from server config, so nothing is invented: only what the county has set is shown.
export function renderFooter(root, { router, site = {} }) {
  const link = (name, label) => `<li><a href="${router.hashFor(name)}">${label}</a></li>`;
  const contact = [site.supportPhone && `<li>Phone: <a href="tel:${esc(site.supportPhone.replace(/\s/g, ""))}">${esc(site.supportPhone)}</a></li>`,
    site.supportEmail && `<li>Email: <a href="mailto:${esc(site.supportEmail)}">${esc(site.supportEmail)}</a></li>`].filter(Boolean).join("");
  root.innerHTML = `<div class="wrap">
    <div class="foot-grid">
      <section><h3>Murang’a County Service Portal</h3><p>Apply for county services, pay by M-Pesa and track your request, from your phone or computer.</p></section>
      <section><h3>Quick links</h3><ul>${link("services", "All services")}${link("apply", "Apply now")}${link("mine", "My requests")}${link("track", "Track a request")}</ul></section>
      <section><h3>Need help?</h3><ul>${contact || "<li>Visit your nearest sub-county office.</li>"}${link("forgot", "Forgot your password?")}${link("auth", "Staff sign in")}</ul></section>
    </div>
    <div class="foot-bar"><span>© ${new Date().getFullYear()} County Government of Murang’a</span><span>Payments by M-Pesa · Updates by SMS</span></div></div>`;
}
