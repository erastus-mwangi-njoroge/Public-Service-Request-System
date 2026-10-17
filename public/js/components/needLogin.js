export function needLogin(app, msg) {
  app.main.innerHTML = `<h2>Sign in required</h2><div class="card"><p>${msg}</p><button class="btn" id="g">Sign in or create account</button></div>`;
  document.getElementById("g").onclick = () => app.router.go("auth");
}
