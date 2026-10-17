// County services on offer. Add a service here and it appears everywhere; nothing else needs to change.
const SERVICES = [
  { id: "biz", name: "Single business permit", dept: "Trade & Licensing", fee: 5000, days: 7, docs: "National ID, KRA PIN, business location" },
  { id: "plan", name: "Building plan approval", dept: "Physical Planning", fee: 12000, days: 21, docs: "Architectural drawings, title deed, KRA PIN" },
  { id: "rates", name: "Land rates clearance", dept: "Lands & Revenue", fee: 1500, days: 5, docs: "Title deed or plot number, National ID" },
  { id: "water", name: "Water connection", dept: "Water & Irrigation", fee: 3500, days: 14, docs: "National ID, plot number, landlord consent" },
  { id: "market", name: "Market stall allocation", dept: "Trade & Markets", fee: 1000, days: 10, docs: "National ID, passport photo" },
  { id: "health", name: "Health facility licence", dept: "Health Services", fee: 8000, days: 30, docs: "Practitioner licence, premises inspection report" },
  { id: "park", name: "Parking and matatu stage permit", dept: "Transport", fee: 2500, days: 7, docs: "Vehicle logbook, National ID, insurance" },
  { id: "event", name: "Public event permit", dept: "Public Service", fee: 2000, days: 5, docs: "Event plan, National ID, venue approval" },
];

class ServiceCatalog {
  constructor(services = SERVICES) { this.services = services; this.depts = [...new Set(services.map((s) => s.dept))]; }
  find(id) { return this.services.find((s) => s.id === id); }
  require(id) { const s = this.find(id); if (!s) throw new Error("Unknown service " + id); return s; }
  hasDept(d) { return this.depts.includes(d); }
}
module.exports = { ServiceCatalog, SERVICES };
