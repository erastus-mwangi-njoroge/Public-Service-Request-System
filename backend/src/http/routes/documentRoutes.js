// Uploads send raw file bytes in the body and the original name in X-File-Name.
const { json, binary } = require("../router");
const { requireUser } = require("../guards");
module.exports = (router, { documentService }) => {
  const signedIn = { guards: [requireUser()] };
  router.post("/api/requests/:ref/documents", async (c) => json(201, await documentService.upload(await c.user(), c.params.ref, {
    contentLength: Number(c.req.headers["content-length"] || 0), fileName: c.req.headers["x-file-name"], readBody: (max) => c.req.raw(max),
  })), { guards: [requireUser()], body: "raw" });
  router.get("/api/requests/:ref/documents/:id", async (c) => {
    const { doc, buf } = await documentService.download(await c.user(), c.params.ref, c.params.id);
    return binary(200, { "Content-Type": doc.type, "Content-Length": buf.length, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.name)}`, "Cache-Control": "private, no-store" }, buf);
  }, signedIn);
  router.delete("/api/requests/:ref/documents/:id", async (c) => json(200, await documentService.remove(await c.user(), c.params.ref, c.params.id)), signedIn);
};
