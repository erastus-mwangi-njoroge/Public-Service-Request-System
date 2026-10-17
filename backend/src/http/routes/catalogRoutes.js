const { json } = require("../router");
const { bad } = require("../../domain/validation");
module.exports = (router, { services, locationService, config }) => {
  router.get("/api/services", () => json(200, {
    services: services.services, depts: services.depts,
    subCounties: Object.keys(locationService.tree()), locations: locationService.tree(),
    limits: { maxUploadMB: config.maxUploadBytes / 1048576, maxDocs: config.maxDocs },
    site: config.site,
  }));
  router.get("/api/locations/schools", async ({ query }) => {
    const subCounty = query.get("subCounty"), ward = query.get("ward");
    if (!subCounty || !ward) throw bad("Choose a sub-county and ward");
    return json(200, { schools: await locationService.schoolsIn(subCounty, ward) });
  });
};
