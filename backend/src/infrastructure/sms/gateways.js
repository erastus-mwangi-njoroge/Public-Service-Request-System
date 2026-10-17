// SmsGateway contract: async send(toE164, message) -> status string ("sent", "simulated" or "failed: ...").
class SimulatedSmsGateway {
  constructor(log = console.log) { this.log = log; }
  async send(to, message) { this.log(`[SMS simulated] ${to}: ${message}`); return "simulated"; }
}
class AfricasTalkingGateway {
  constructor({ username, apiKey, senderId, baseUrl }) { Object.assign(this, { username, apiKey, senderId, baseUrl }); }
  async send(to, message) {
    try {
      const r = await fetch(this.baseUrl + "/version1/messaging", {
        method: "POST", signal: AbortSignal.timeout(10000),
        headers: { apiKey: this.apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: this.username, to, message, ...(this.senderId ? { from: this.senderId } : {}) }),
      });
      const rec = (await r.json().catch(() => ({}))).SMSMessageData?.Recipients?.[0];
      return r.ok && rec && [100, 101, 102].includes(rec.statusCode) ? "sent" : "failed: " + (rec?.status || r.status);
    } catch (x) { return "failed: " + (x.message || "error"); }
  }
}
module.exports = { SimulatedSmsGateway, AfricasTalkingGateway };
