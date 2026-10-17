// Pure helpers over the request record.
const publicView = (r, service) => ({
  ref: r.ref, service: service.name, status: r.status, paid: r.paid, subCounty: r.subCounty, ward: r.ward || "",
  createdAt: r.createdAt, history: r.history.map((h) => ({ status: h.status, at: h.at, note: h.note })),
});
const addHistory = (r, status, note = "", by = "system") => {
  r.status = status;
  r.history.push({ status, at: new Date().toISOString(), note, by });
};
module.exports = { publicView, addHistory };
