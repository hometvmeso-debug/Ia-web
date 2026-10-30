const $ = (id) => document.getElementById(id);
let confirmationId = null;
let activeTab = "mission";

function getKey() { return sessionStorage.getItem("nexcore_operator_key") || ""; }
async function api(path, body) {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: { "Authorization": `Bearer ${getKey()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Erreur HTTP ${response.status}`);
  return data;
}
function showModal() { $("keyModal").classList.remove("hidden"); $("accessKey").value = getKey(); }
function hideModal() { $("keyModal").classList.add("hidden"); }
function setBusy(busy, label = "En cours...") {
  $("runState").textContent = busy ? label : "Terminé";
  $("runMission").disabled = busy;
  $("runMission").textContent = busy ? "Mission en cours..." : "Lancer la mission →";
}
function logLine(text) {
  const div = document.createElement("div");
  div.className = "field-item";
  div.textContent = text;
  $("result").prepend(div);
}
function renderResult(result, plan) {
  $("emptyState").classList.add("hidden");
  $("result").classList.remove("hidden");
  $("result").innerHTML = "";
  const title = document.createElement("h3"); title.textContent = result.title || "Résultat de mission"; $("result").append(title);
  const url = document.createElement("div"); url.className = "url"; url.textContent = result.url || ""; $("result").append(url);
  if (result.message) { const msg = document.createElement("p"); msg.className = "hint"; msg.textContent = result.message; $("result").append(msg); }
  if (result.screenshot) { const img = document.createElement("img"); img.src = result.screenshot; img.alt = "Capture de la page observée"; $("result").append(img); }
  if (result.text) { const h = document.createElement("h4"); h.textContent = "CONTENU OBSERVÉ"; $("result").append(h); const pre = document.createElement("div"); pre.className = "body-text"; pre.textContent = result.text; $("result").append(pre); }
  if (result.completed || result.failed) {
    const h = document.createElement("h4"); h.textContent = "CHAMPS DU FORMULAIRE"; $("result").append(h);
    const box = document.createElement("div"); box.className = "field-list";
    (result.completed || []).forEach(x => { const e = document.createElement("div"); e.className = "field-item"; e.textContent = "✓ " + x; box.append(e); });
    (result.failed || []).forEach(x => { const e = document.createElement("div"); e.className = "field-item"; e.textContent = "✕ " + x; box.append(e); });
    $("result").append(box);
  }
  if (result.links?.length) {
    const h = document.createElement("h4"); h.textContent = "LIENS DÉTECTÉS"; $("result").append(h);
    const list = document.createElement("ul"); list.className = "result-list";
    result.links.slice(0, 20).forEach(link => { const li = document.createElement("li"); const a = document.createElement("a"); a.textContent = link.text; a.href = link.href; a.target = "_blank"; a.rel = "noopener noreferrer"; a.style.color = "#a9d8e5"; li.append(a); list.append(li); });
    $("result").append(list);
  }
  if (result.fields?.length) {
    const h = document.createElement("h4"); h.textContent = "CHAMPS DÉTECTÉS"; $("result").append(h);
    const list = document.createElement("ul"); list.className = "result-list";
    result.fields.forEach(f => { const li = document.createElement("li"); li.textContent = `${f.tag}${f.type ? " / "+f.type : ""} · ${f.name || f.id || f.label || f.placeholder || f.text || "(sans libellé)"}${f.required ? " · obligatoire" : ""}`; list.append(li); });
    $("result").append(list);
  }
  confirmationId = result.confirmationId || null;
  $("confirmation").classList.toggle("hidden", !result.requiresConfirmation);
  if (plan) logLine(`Plan : ${plan.action}`);
}
async function run(body, label) {
  if (!getKey()) { showModal(); return; }
  setBusy(true, label);
  $("confirmation").classList.add("hidden");
  try {
    const data = await api(body.action === "mission" ? "/api/mission" : "/api/act", body.action === "mission" ? { command: body.command } : body);
    renderResult(data.result, data.plan);
  } catch (error) {
    $("emptyState").classList.add("hidden"); $("result").classList.remove("hidden");
    $("result").innerHTML = "";
    const e = document.createElement("div"); e.className = "body-text"; e.textContent = "Erreur : " + error.message; $("result").append(e);
    if (/accès refusé|Unauthorized/i.test(error.message)) showModal();
  } finally { setBusy(false); }
}
$("runMission").addEventListener("click", () => run({ action: "mission", command: $("command").value }, "Planification..."));
document.querySelectorAll("[data-command]").forEach(b => b.addEventListener("click", () => { $("command").value = b.dataset.command; $("command").focus(); }));
document.querySelectorAll("[data-action]").forEach(b => b.addEventListener("click", () => run({ action: b.dataset.action }, "Observation...")));
$("navigateBtn").addEventListener("click", () => run({ action: "navigate", url: $("urlInput").value }, "Ouverture du site..."));
$("searchBtn").addEventListener("click", () => run({ action: "search", query: $("searchInput").value }, "Recherche..."));
$("clickBtn").addEventListener("click", () => run({ action: "click", text: $("clickInput").value }, "Interaction..."));
$("fillBtn").addEventListener("click", () => {
  try { run({ action: "fill", fields: JSON.parse($("fieldsInput").value) }, "Remplissage..."); }
  catch { alert("Le JSON des champs est invalide."); }
});
$("confirmSubmit").addEventListener("click", async () => {
  if (!confirmationId) return;
  if (!confirm("Confirmer l'envoi du formulaire sur ce site ? Cette action peut être irréversible.")) return;
  $("confirmSubmit").disabled = true;
  try {
    const data = await api("/api/confirm-submit", { confirmationId });
    renderResult(data.result);
    $("confirmation").classList.add("hidden");
  } catch (error) { alert("Envoi non effectué : " + error.message); }
  finally { $("confirmSubmit").disabled = false; confirmationId = null; }
});
$("settingsBtn").addEventListener("click", showModal);
$("closeModal").addEventListener("click", hideModal);
$("saveKey").addEventListener("click", async () => {
  const key = $("accessKey").value.trim();
  if (key.length < 24) { $("keyStatus").textContent = "La clé doit contenir au moins 24 caractères."; return; }
  sessionStorage.setItem("nexcore_operator_key", key);
  try { await api("/api/health"); $("keyStatus").textContent = "Connexion vérifiée."; hideModal(); }
  catch (e) { $("keyStatus").textContent = e.message; }
});
async function loadHistory() {
  try {
    const data = await api("/api/history");
    const host = $("historyList"); host.innerHTML = "";
    if (!data.history.length) { host.textContent = "Aucune mission enregistrée."; return; }
    data.history.forEach(item => {
      const row = document.createElement("div"); row.className = "history-item";
      const left = document.createElement("div"); const b = document.createElement("b"); b.textContent = item.command || item.action || "Mission"; left.append(b);
      const small = document.createElement("small"); small.textContent = `${item.url || ""} · ${new Date(item.at).toLocaleString("fr-FR")}`; left.append(small);
      const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = item.status || "ok"; row.append(left, tag); host.append(row);
    });
  } catch (e) { $("historyList").textContent = e.message; }
}
$("refreshHistory").addEventListener("click", loadHistory);
document.querySelectorAll(".nav").forEach(button => button.addEventListener("click", () => {
  activeTab = button.dataset.tab;
  $("missionTab").classList.toggle("hidden", activeTab !== "mission");
  $("historyTab").classList.toggle("hidden", activeTab !== "history");
  $("pageTitle").textContent = activeTab === "mission" ? "Nouvelle mission" : "Historique des missions";
  document.querySelectorAll(".nav").forEach(b => b.classList.toggle("active", b === button));
  if (activeTab === "history") loadHistory();
}));
if (!getKey()) showModal();
else api("/api/health").catch(() => showModal());
