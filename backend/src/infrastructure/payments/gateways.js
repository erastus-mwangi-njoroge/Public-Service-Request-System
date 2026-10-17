// PaymentGateway contract: async initiate({ ref, phone, amount }) ->
//   { simulated: true, receipt }   payment already settled (demo mode)
//   { checkoutId }                 customer is prompted; the gateway calls our callback later
const crypto = require("crypto");
class SimulatedPaymentGateway {
  // Settles immediately. A background timer would be dropped on serverless platforms once the response is sent.
  async initiate() { return { simulated: true, receipt: "SIM" + crypto.randomBytes(4).toString("hex").toUpperCase() }; }
}
class DarajaPaymentGateway {
  constructor(cfg) { this.cfg = cfg; }
  async initiate({ ref, phone, amount }) {
    const c = this.cfg, party = "254" + phone.slice(1);
    const auth = Buffer.from(c.key + ":" + c.secret).toString("base64");
    const { access_token } = await (await fetch(c.baseUrl + "/oauth/v1/generate?grant_type=client_credentials", { headers: { Authorization: "Basic " + auth } })).json();
    const ts = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    const password = Buffer.from(c.shortcode + c.passkey + ts).toString("base64");
    const out = await (await fetch(c.baseUrl + "/mpesa/stkpush/v1/processrequest", {
      method: "POST", headers: { Authorization: "Bearer " + access_token, "Content-Type": "application/json" },
      body: JSON.stringify({ BusinessShortCode: c.shortcode, Password: password, Timestamp: ts, TransactionType: "CustomerPayBillOnline",
        Amount: amount, PartyA: party, PartyB: c.shortcode, PhoneNumber: party, CallBackURL: c.callbackUrl, AccountReference: ref, TransactionDesc: "County service fee" }),
    })).json();
    return { checkoutId: out.CheckoutRequestID };
  }
}
module.exports = { SimulatedPaymentGateway, DarajaPaymentGateway };
