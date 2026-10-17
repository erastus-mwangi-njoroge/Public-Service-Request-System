// Administrative areas. Wards follow the 35 IEBC county assembly wards, grouped by constituency.
// NOTE: the portal's sub-county list includes "Murang’a South", which is an administrative sub-county that sits inside
// Maragua constituency. We could not verify an official ward-by-ward split between "Maragua" and "Murang’a South",
// so both list all six Maragua-constituency wards. Edit this table if the county gives you the exact split.
const MARAGUA_WARDS = ["Kimorori/Wempa", "Makuyu", "Kambiti", "Kamahuha", "Ichagaki", "Nginda"];
const SUBCOUNTY_WARDS = {
  "Kiharu": ["Wangu", "Mugoiri", "Mbiri", "Township", "Murarandia", "Gaturi"],
  "Kandara": ["Ng'araria", "Muruka", "Kagundu-ini", "Gaichanjiru", "Ithiru", "Ruchu"],
  "Kigumo": ["Kahumbu", "Muthithi", "Kigumo", "Kangari", "Kinyona"],
  "Maragua": MARAGUA_WARDS,
  "Kangema": ["Kanyenya-ini", "Muguru", "Rwathia"],
  "Mathioya": ["Gitugi", "Kiru", "Kamacharia"],
  "Gatanga": ["Ithanga", "Kakuzi/Mitubiri", "Mugumo-ini", "Kihumbu-ini", "Gatanga", "Kariara"],
  "Murang’a South": MARAGUA_WARDS,
};

class Locations {
  constructor(map = SUBCOUNTY_WARDS) { this.map = map; }
  subCounties() { return Object.keys(this.map); }
  wardsOf(subCounty) { return this.map[subCounty] || []; }
  hasSubCounty(sc) { return Object.prototype.hasOwnProperty.call(this.map, sc); }
  hasWard(sc, ward) { return this.wardsOf(sc).includes(ward); }
  tree() { return Object.fromEntries(Object.entries(this.map)); }
}
module.exports = { Locations, SUBCOUNTY_WARDS };
