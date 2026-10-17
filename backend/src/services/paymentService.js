const { HttpError } = require("../domain/errors");
const { addHistory } = require("../domain/requestModel");

class PaymentService {
  constructor({ requests, gateway, notifier }) { Object.assign(this, { requests, gateway, notifier }); }

  async pay(user, ref) {
    const r = await this.requests.findByRef(ref);
    if (!r || r.userId !== user.id) throw new HttpError(404, "Request not found");
    if (r.paid) throw new HttpError(409, "Already paid");
    const out = await this.gateway.initiate({ ref: r.ref, phone: r.phone, amount: r.amount });
    if (out.checkoutId) await this.requests.update(r.ref, (x) => { x.checkoutId = out.checkoutId; });
    if (out.simulated) { await this.markPaid(r.ref, out.receipt); return { message: "Demo payment completed", simulated: true }; }
    return { message: "Check your phone and enter your M-Pesa PIN", simulated: false };
  }

  async markPaid(ref, receipt) {
    let changed = false;
    const r = await this.requests.update(ref, (x) => {
      changed = false; if (x.paid) return;
      x.paid = true; x.receipt = receipt; addHistory(x, "Submitted", "Payment received (" + receipt + ")"); changed = true;
    });
    if (!r || !changed) return;
    await this.notifier.paymentReceived(r);
    await this.notifier.newPaidRequest(r);
  }

  // Safaricom calls this. Always acknowledge, even for payloads we ignore.
  async handleCallback(body) {
    const cb = body.Body?.stkCallback;
    if (cb && cb.ResultCode === 0) {
      const r = await this.requests.findByCheckoutId(cb.CheckoutRequestID);
      if (r) await this.markPaid(r.ref, cb.CallbackMetadata?.Item?.find((i) => i.Name === "MpesaReceiptNumber")?.Value || "MPESA");
    }
    return { ResultCode: 0, ResultDesc: "Accepted" };
  }
}
module.exports = { PaymentService };
