const { HttpError } = require("./errors");
const PHONE = /^(07|01)\d{8}$/;
const bad = (msg) => new HttpError(400, msg);
const text = (v, min, max, label) => { v = String(v ?? "").trim(); if (v.length < min || v.length > max) throw bad(label + " is required"); return v; };
const phoneNumber = (v) => String(v ?? "").replace(/\s/g, "");
const intl = (p) => (PHONE.test(String(p || "")) ? "+254" + p.slice(1) : null);
module.exports = { PHONE, bad, text, phoneNumber, intl };
