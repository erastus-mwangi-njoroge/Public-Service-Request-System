// Sub-county > ward > nearest public primary school. Wards are fixed administrative data;
// schools live in the database so the county can grow the list without a code change.
const { bad, text } = require("../domain/validation");

class LocationService {
  constructor({ locations, schools }) { this.locations = locations; this.schools = schools; }

  tree() { return this.locations.tree(); }

  async schoolsIn(subCounty, ward) {
    if (!this.locations.hasWard(subCounty, ward)) throw bad("Choose a ward in that sub-county");
    return this.schools.listByWard(subCounty, ward);
  }

  // Validates the three-level choice and returns what we store on the request.
  async resolve({ subCounty, ward, schoolId, schoolOther }) {
    if (!this.locations.hasSubCounty(subCounty)) throw bad("Choose a sub-county");
    if (!this.locations.hasWard(subCounty, ward)) throw bad("Choose a ward in " + subCounty);
    if (schoolId) {
      const s = await this.schools.findById(String(schoolId));
      if (!s || s.subCounty !== subCounty || s.ward !== ward) throw bad("Choose a school from the list for that ward");
      return { subCounty, ward, school: { id: s.id, name: s.name } };
    }
    return { subCounty, ward, school: { id: null, name: text(schoolOther, 3, 80, "Nearest public primary school") } };
  }
}
module.exports = { LocationService };
