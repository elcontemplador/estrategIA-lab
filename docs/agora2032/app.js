const state = {
  activeModule: "firma",
  results: {},
  profile: null,
  meta: {
    sourcesOpened: false,
    schoolChanged: false,
    allocationChanged: false,
    hiddenConditionsOpened: false,
    songChanged: false,
  },
};

const scoreKeys = ["guarantees", "efficiency", "resilience", "community"];
const moduleOrder = ["firma", "escuela", "computo", "ley", "cancion"];
const storageKey = "agora2032-v2";
const views = [...document.querySelectorAll("[data-view]")];
const navLinks = [...document.querySelectorAll("[data-route]")];
const nav = document.querySelector(".main-nav");
const navToggle = document.querySelector(".nav-toggle");

function routeTo(route, updateHash = true) {
  const valid = views.some((view) => view.dataset.view === route) ? route : "inicio";
  if (archiveDialog?.open) archiveDialog.close();
  views.forEach((view) => { view.hidden = view.dataset.view !== valid; });
  navLinks.forEach((link) => link.classList.toggle("active", link.dataset.route === valid));
  if (updateHash) history.replaceState(null, "", `#${valid}`);
  nav?.classList.remove("open");
  navToggle?.setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0, left: 0, behavior: updateHash ? "smooth" : "auto" });
  if (updateHash) {
    const heading = document.querySelector(`[data-view="${valid}"] h1`);
    if (heading) {
      heading.tabIndex = -1;
      requestAnimationFrame(() => heading.focus({ preventScroll: true }));
    }
  }
}

window.addEventListener("hashchange", () => routeTo(location.hash.slice(1), false));
document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => routeTo(button.dataset.go)));
navLinks.forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); routeTo(link.dataset.route); }));
navToggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});

document.querySelector("[data-share]")?.addEventListener("click", async () => {
  const share = {
    title: "Portal ciudadano Ágora 2032",
    text: "Cinco simulaciones narrativas de estrategIA sobre inteligencia artificial, política y gobierno.",
    url: "https://elcontemplador.github.io/estrategIA-lab/agora2032/",
  };
  const status = document.getElementById("share-status");
  try {
    if (navigator.share) { await navigator.share(share); status.textContent = "Experiencia compartida."; }
    else { await navigator.clipboard.writeText(share.url); status.textContent = "Enlace copiado."; }
  } catch (error) {
    if (error.name !== "AbortError") status.textContent = "Puedes copiar la dirección desde el navegador.";
  }
});

function showModule(name) {
  state.activeModule = name;
  document.querySelectorAll("[data-module]").forEach((button) => button.classList.toggle("active", button.dataset.module === name));
  document.querySelectorAll("[data-module-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.modulePanel !== name;
    panel.classList.toggle("active", panel.dataset.modulePanel === name);
  });
  const stage = document.querySelector(".module-stage");
  if (stage) {
    const headerHeight = document.querySelector(".site-header")?.offsetHeight || 76;
    const top = stage.getBoundingClientRect().top + window.scrollY - headerHeight - 22;
    window.scrollTo({ top: Math.max(0, top), left: 0, behavior: "smooth" });
  }
}

document.querySelectorAll("[data-module]").forEach((button) => button.addEventListener("click", () => showModule(button.dataset.module)));

function completeModule(name, scores) {
  state.results[name] = scores;
  document.querySelector(`[data-module="${name}"]`)?.classList.add("complete");
  addNextAction(name);
  updateProgress();
  updateProfile();
  saveProgress();
}

function addNextAction(name) {
  const panel = document.querySelector(`[data-module-panel="${name}"]`);
  const result = panel?.querySelector(".result-panel");
  if (!result || result.querySelector(".result-actions")) return;
  const index = moduleOrder.indexOf(name);
  const next = moduleOrder[index + 1];
  const actions = document.createElement("div");
  actions.className = "result-actions";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button button-secondary";
  button.textContent = next ? "Continuar con la siguiente simulación" : "Ver mi perfil de decisión";
  button.addEventListener("click", () => {
    if (next) showModule(next);
    else document.getElementById("lab-profile")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  actions.append(button);
  result.append(actions);
}

function updateProgress() {
  const completed = Object.keys(state.results).length;
  document.getElementById("progress-count").textContent = completed;
  document.getElementById("progress-bar").style.width = `${completed * 20}%`;
}

function resultMarkup(kicker, title, copy, tags = [], systemLine = "", question = "") {
  return `<p class="panel-kicker">${kicker}</p><h3>${title}</h3>${systemLine ? `<div class="system-consequence">${systemLine}</div>` : ""}<p>${copy}</p><div class="result-meta">${tags.map((tag) => `<span>${tag}</span>`).join("")}</div>${question ? `<div class="agora-question compact"><span>La pregunta de Ágora</span><strong>${question}</strong></div>` : ""}`;
}

function saveProgress() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ results: state.results, meta: state.meta }));
  } catch (_) {
    // La experiencia sigue funcionando aunque el navegador bloquee el almacenamiento local.
  }
}

function restoreProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (!saved?.results) return;
    state.results = saved.results;
    state.meta = { ...state.meta, ...(saved.meta || {}) };
    Object.keys(state.results).forEach((name) => document.querySelector(`[data-module="${name}"]`)?.classList.add("complete"));
  } catch (_) {
    localStorage.removeItem(storageKey);
  }
}

// 01 · Supervisión
const disclosure = document.querySelector(".disclosure");
disclosure?.addEventListener("click", () => {
  const target = document.getElementById(disclosure.getAttribute("aria-controls"));
  const expanded = disclosure.getAttribute("aria-expanded") === "true";
  disclosure.setAttribute("aria-expanded", String(!expanded));
  disclosure.querySelector("[aria-hidden]").textContent = expanded ? "＋" : "−";
  target.hidden = expanded;
  if (!expanded) {
    state.meta.sourcesOpened = true;
    saveProgress();
  }
});

const caseOutcomes = {
  confirmar: {
    html: () => resultMarkup("Consecuencia", "La remesa continúa", `Las concesiones se pagan a tiempo. Samira sigue el cauce ordinario y la habitación vence antes de la primera cita.${state.meta.sourcesOpened ? "" : " Tomaste la decisión sin abrir las fuentes del expediente."}`, ["Rapidez alta", "Garantía baja"], "SUPERVISIÓN HUMANA COMPLETADA · 11 SEGUNDOS", "¿Cuánto tiempo y qué información hacen falta para que una firma cuente realmente como supervisión humana?"),
    scores: { guarantees: 20, efficiency: 92, resilience: 48, community: 35 },
  },
  urgente: {
    html: () => resultMarkup("Consecuencia", "El caso se separa", "Samira obtiene una revisión urgente sin detener el lote. Se corrige la excepción, pero el sistema sigue dependiendo de que alguien consiga llegar hasta una persona.", ["Corrección individual", "Riesgo de desigualdad"], "EXCEPCIÓN ABIERTA · TRAZA GENERAL SIN CAMBIOS", "¿Debe una garantía depender de que una persona consiga llamar la atención de otra?"),
    scores: { guarantees: 66, efficiency: 78, resilience: 55, community: 55 },
  },
  detener: {
    html: () => resultMarkup("Consecuencia", "La remesa queda detenida", "Se revisan las denegaciones vinculadas a propiedades alternativas. Varias familias cobrarán tarde, pero la firma deja de ser una formalidad.", ["Garantía alta", "Retraso general"], "486 EXPEDIENTES · ESTADO: REVISIÓN SUSTANTIVA", "¿Cuándo está justificado retrasar una decisión correcta para comprobar si también es justa?"),
    scores: { guarantees: 94, efficiency: 32, resilience: 62, community: 68 },
  },
};

document.querySelectorAll("[data-case-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-case-choice]").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    const outcome = caseOutcomes[button.dataset.caseChoice];
    const result = document.getElementById("case-result");
    result.innerHTML = outcome.html();
    result.hidden = false;
    result.focus();
    completeModule("firma", outcome.scores);
  });
});

// 02 · Escuela
const schoolInputs = [...document.querySelectorAll("[data-school-weight]")];

function schoolScores() {
  const vulnerability = Number(document.getElementById("vulnerability").value);
  const future = Number(document.getElementById("future").value);
  const reach = Number(document.getElementById("reach").value);
  return {
    vulnerability, future, reach,
    senior: Math.round(vulnerability * .68 + reach * .32),
    nursery: Math.round(future * .72 + reach * .28),
  };
}

function updateSchool() {
  const score = schoolScores();
  schoolInputs.forEach((input) => { document.getElementById(`${input.id}-output`).value = input.value; });
  document.getElementById("senior-score").textContent = score.senior;
  document.getElementById("nursery-score").textContent = score.nursery;
  const difference = score.nursery - score.senior;
  const recommendation = document.getElementById("school-recommendation");
  const explanation = document.getElementById("school-explanation");
  if (Math.abs(difference) < 7) {
    recommendation.textContent = "Objetivos incompatibles";
    explanation.textContent = "Los criterios actuales no producen una ventaja clara. Afinar la pregunta no elimina la elección.";
  } else if (difference > 0) {
    recommendation.textContent = "Escuela infantil";
    explanation.textContent = "El futuro demográfico pesa más que la vulnerabilidad inmediata.";
  } else {
    recommendation.textContent = "Centro para mayores";
    explanation.textContent = "La vulnerabilidad inmediata domina el horizonte futuro.";
  }
}
schoolInputs.forEach((input) => input.addEventListener("input", () => {
  state.meta.schoolChanged = true;
  updateSchool();
}));

const schoolOutcomes = {
  mayores: ["Centro para mayores", "Las necesidades inmediatas obtienen respuesta. Las familias jóvenes siguen sin espacio de conciliación y algunas se marcharán.", { guarantees: 82, efficiency: 62, resilience: 52, community: 74 }],
  infantil: ["Escuela infantil", "La decisión apuesta por retener familias. Las personas mayores reciben una sala menor que no sustituye el servicio esperado.", { guarantees: 62, efficiency: 72, resilience: 78, community: 68 }],
  mixto: ["Uso compartido", "La solución reduce el conflicto visible, pero ambos servicios quedan por debajo de la capacidad recomendada.", { guarantees: 70, efficiency: 42, resilience: 65, community: 83 }],
};
document.querySelectorAll("[data-school-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-school-choice]").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    const [title, copy, scores] = schoolOutcomes[button.dataset.schoolChoice];
    const result = document.getElementById("school-result");
    result.innerHTML = resultMarkup("Decisión política", title, copy, ["La elección es tuya", "El coste también"], "ÁGORA · RECOMENDACIÓN ARCHIVADA COMO APOYO TÉCNICO", "¿Quién debe decidir qué valores no pueden delegarse a un sistema?");
    result.hidden = false; result.focus();
    completeModule("escuela", scores);
  });
});

// 03 · Cómputo
const allocationInputs = [...document.querySelectorAll("[data-allocation]")];
function currentAllocation() { return Object.fromEntries(allocationInputs.map((input) => [input.id, Number(input.value)])); }
function updateAllocation() {
  const allocation = currentAllocation();
  const total = Object.values(allocation).reduce((sum, value) => sum + value, 0);
  allocationInputs.forEach((input) => { document.getElementById(`${input.id}-output`).value = input.value; });
  document.getElementById("total-value").textContent = total;
  document.getElementById("allocation-warning").textContent = total === 100 ? "Capacidad distribuida por completo." : total > 100 ? `Exceso de ${total - 100} unidades.` : `Quedan ${100 - total} unidades.`;
}
allocationInputs.forEach((input) => input.addEventListener("input", () => {
  state.meta.allocationChanged = true;
  updateAllocation();
}));

document.getElementById("normalize-allocation")?.addEventListener("click", () => {
  const allocation = currentAllocation();
  const total = Object.values(allocation).reduce((sum, value) => sum + value, 0);
  if (total === 100) return;
  const factor = 100 / total;
  const values = allocationInputs.map((input) => Math.max(Number(input.min), Math.min(Number(input.max), Math.round(Number(input.value) * factor))));
  let delta = 100 - values.reduce((sum, value) => sum + value, 0);
  while (delta !== 0) {
    const direction = Math.sign(delta);
    const adjustable = allocationInputs.findIndex((input, index) => direction > 0 ? values[index] < Number(input.max) : values[index] > Number(input.min));
    if (adjustable < 0) break;
    values[adjustable] += direction;
    delta -= direction;
  }
  allocationInputs.forEach((input, index) => { input.value = values[index]; });
  state.meta.allocationChanged = true;
  updateAllocation();
});

function computeOutcome(a) {
  const risks = [], benefits = [];
  if (a.hospital < 25) risks.push("hospitales con retrasos"); else benefits.push("capacidad hospitalaria");
  if (a.fire < 23) risks.push("simulaciones de incendios degradadas"); else benefits.push("predicción de incendios");
  if (a.utilities < 17) risks.push("menor margen en agua y energía"); else benefits.push("estabilidad de red");
  if (a.citizen < 13) risks.push("teléfonos, traducción y transporte saturados"); else benefits.push("acceso ciudadano");
  return {
    risks, benefits,
    scores: {
      guarantees: Math.round(Math.min(a.citizen / 20, 1) * 55 + Math.min(a.hospital / 35, 1) * 45),
      efficiency: Math.max(10, Math.round(100 - Math.abs(a.hospital - 32) - Math.abs(a.fire - 27) - Math.abs(a.utilities - 20) - Math.abs(a.citizen - 21))),
      resilience: Math.round(Math.min(a.hospital / 30, 1) * 25 + Math.min(a.fire / 28, 1) * 25 + Math.min(a.utilities / 20, 1) * 20 + Math.min(a.citizen / 18, 1) * 30),
      community: Math.round(Math.min(a.citizen / 22, 1) * 75 + Math.min(a.utilities / 20, 1) * 25),
    },
  };
}
document.getElementById("simulate-allocation")?.addEventListener("click", () => {
  const allocation = currentAllocation();
  const total = Object.values(allocation).reduce((sum, value) => sum + value, 0);
  if (total !== 100) { document.getElementById("allocation-warning").textContent = "La suma debe ser exactamente 100."; return; }
  const outcome = computeOutcome(allocation);
  const result = document.getElementById("compute-result");
  result.innerHTML = resultMarkup("Balance", outcome.risks.length ? "Has protegido servicios esenciales, con costes" : "Todos los servicios resisten, con poco margen", `<strong>Protegido:</strong> ${outcome.benefits.join(", ")}. <strong>En riesgo:</strong> ${outcome.risks.length ? outcome.risks.join(", ") : "una nueva caída obligaría a reasignar"}.`, ["Sin respuesta única", `Resiliencia ${outcome.scores.resilience}/100`], `CAPACIDAD ASIGNADA · H ${allocation.hospital} / I ${allocation.fire} / R ${allocation.utilities} / C ${allocation.citizen}`, "¿Qué servicios deberían considerarse infraestructura social crítica?");
  result.hidden = false; result.focus();
  completeModule("computo", outcome.scores);
});

// 04 · Ley personalizada
const personas = {
  teresa: { title: "Más conexiones para tu municipio", lead: "La ley garantiza dos conexiones diarias para municipios con baja cobertura.", points: ["Transporte rural garantizado", "Ayudas de movilidad", "Financiación complementaria urbana"], condition: "Parte del servicio se financia mediante nuevos peajes urbanos." },
  oscar: { title: "Repartir sin detenerse", lead: "La ley mantiene bonificaciones para profesionales con vehículos eficientes.", points: ["Bonificación profesional", "Nuevos horarios de reparto", "Menos congestión urbana"], condition: "La bonificación depende de emisiones, horario y territorio." },
  beatriz: { title: "Menos tráfico para llegar a quien te necesita", lead: "Los servicios esenciales podrán solicitar excepciones al nuevo acceso urbano.", points: ["Excepciones profesionales", "Reducción de tráfico", "Ayudas de desplazamiento"], condition: "La fisioterapia domiciliaria puede solicitar la excepción, pero no la tiene garantizada." },
};
let activePersona = "teresa";
function renderPersona(name) {
  activePersona = name;
  const persona = personas[name];
  document.querySelectorAll("[data-persona]").forEach((button) => {
    const active = button.dataset.persona === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.getElementById("law-title").textContent = persona.title;
  document.getElementById("law-lead").textContent = persona.lead;
  document.getElementById("law-points").innerHTML = persona.points.map((point) => `<li>${point}</li>`).join("");
  const condition = document.getElementById("law-condition");
  condition.textContent = persona.condition; condition.hidden = true;
}
document.querySelectorAll("[data-persona]").forEach((button) => button.addEventListener("click", () => renderPersona(button.dataset.persona)));
document.getElementById("show-conditions")?.addEventListener("click", () => {
  document.getElementById("law-condition").hidden = false;
  state.meta.hiddenConditionsOpened = true;
  saveProgress();
});
document.getElementById("publish-core")?.addEventListener("click", () => {
  const selected = [...document.querySelectorAll("[data-common-core]:checked")].map((input) => input.value);
  const count = selected.length;
  const support = 74 - count * 5;
  const shared = 28 + count * 14;
  const copy = count < 3
    ? "La explicación sigue siendo accesible, pero costes y renuncias pueden quedar ocultos para distintos grupos."
    : count < 5
      ? "La comprensión compartida mejora. Algunas versiones aún pueden relegar incertidumbres importantes."
      : "Todos reciben el mismo núcleo político, aunque cambien idioma, formato y ejemplos. El apoyo baja y el desacuerdo se vuelve comparable.";
  const result = document.getElementById("law-result");
  result.innerHTML = resultMarkup("Publicación simulada", `${support} % de apoyo · ${Math.min(shared, 98)} % de comprensión común`, copy, [`${count}/5 elementos comunes`, "Accesibilidad conservada"], `NÚCLEO COMÚN · ${count} ELEMENTOS · APOYO ESTIMADO ${support} %`, "¿Qué información debe recibir todo el mundo en el mismo orden para poder discutir sobre la misma decisión?");
  result.hidden = false; result.focus();
  completeModule("ley", {
    guarantees: 38 + count * 11,
    efficiency: 88 - count * 7,
    resilience: 48 + count * 6,
    community: 30 + count * 13,
  });
});

// 05 · Reconstrucción cultural
function songSelection() {
  return {
    melody: document.querySelector('input[name="melody"]:checked').value,
    rhythm: document.querySelector('input[name="rhythm"]:checked').value,
    ending: document.querySelector('input[name="ending"]:checked').value,
  };
}

let audioContext;
document.getElementById("play-mix")?.addEventListener("click", async () => {
  const selection = songSelection();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  audioContext ||= new AudioCtx();
  const context = audioContext;
  if (context.state === "suspended") await context.resume();
  const patterns = {
    archivo: [261.6, 293.7, 329.6, 293.7],
    baile: [261.6, 329.6, 392, 329.6],
    memoria: [293.7, 349.2, 329.6, 261.6],
  };
  const notes = patterns[selection.melody];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = selection.rhythm === "nuevo" ? "triangle" : "sine";
    gain.gain.setValueAtTime(.0001, context.currentTime + index * .22);
    gain.gain.exponentialRampToValueAtTime(.18, context.currentTime + index * .22 + .02);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + index * .22 + .19);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(context.currentTime + index * .22);
    oscillator.stop(context.currentTime + index * .22 + .2);
  });
  if (selection.rhythm === "ventana") {
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = "square"; oscillator.frequency.value = 85;
    gain.gain.setValueAtTime(.2, context.currentTime + .43);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .5);
    oscillator.connect(gain).connect(context.destination); oscillator.start(context.currentTime + .43); oscillator.stop(context.currentTime + .51);
  }
});

const sourceLabels = { archivo: "cuaderno", baile: "vídeo", memoria: "testimonios", tambor: "tambor transcrito", ventana: "accidente conservado", nuevo: "creación de Hamza", fragmento: "fragmento conservado", comunitario: "final comunitario nuevo" };
function updateProvenance() {
  const selection = songSelection();
  const created = [selection.rhythm === "nuevo", selection.ending === "comunitario"].filter(Boolean).length;
  document.getElementById("provenance-preview").innerHTML = `<span>Traza provisional</span><p><b>Fuente:</b> ${sourceLabels[selection.melody]} · <b>Transformación:</b> ${sourceLabels[selection.rhythm]} · <b>Cierre:</b> ${sourceLabels[selection.ending]}</p><small>${created ? `${created} elemento${created > 1 ? "s" : ""} de creación contemporánea.` : "La combinación sigue siendo una reconstrucción, no un original recuperado."}</small>`;
}
document.querySelectorAll('.mixer input[type="radio"]').forEach((input) => input.addEventListener("change", () => {
  state.meta.songChanged = true;
  updateProvenance();
}));

const catalogOutcomes = {
  recuperacion: ["Recuperación histórica", "La promoción gana fuerza, pero el archivo presenta como auténtica una combinación que nunca existió de esa forma.", { guarantees: 28, efficiency: 85, resilience: 42, community: 58 }],
  reconstruccion: ["Reconstrucción comunitaria", "La ficha distingue fuentes, inferencias y partes creadas. La ayuda y la promoción tendrán que revisarse.", { guarantees: 88, efficiency: 58, resilience: 74, community: 94 }],
  nueva: ["Obra nueva inspirada", "La prudencia documental es máxima, pero parte de la comunidad siente que se ha roto la continuidad con su tradición.", { guarantees: 92, efficiency: 48, resilience: 55, community: 46 }],
};
document.querySelectorAll("[data-catalog]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-catalog]").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    const selection = songSelection();
    const [title, copy, scores] = catalogOutcomes[button.dataset.catalog];
    const result = document.getElementById("song-result");
    result.innerHTML = resultMarkup("Registro del archivo", title, `${copy} La versión combina ${sourceLabels[selection.melody]}, ${sourceLabels[selection.rhythm]} y ${sourceLabels[selection.ending]}.`, ["Primera interpretación: 2032", "Tradición en movimiento"], `CATÁLOGO · FUENTE + INFERENCIA + ${selection.rhythm === "nuevo" || selection.ending === "comunitario" ? "CREACIÓN" : "RECONSTRUCCIÓN"}`, "¿Cuándo deja una reconstrucción de conservar el pasado y empieza a crear una tradición nueva?");
    result.hidden = false; result.focus();
    completeModule("cancion", scores);
  });
});

// Perfil acumulado
function updateProfile() {
  const entries = Object.values(state.results);
  const title = document.getElementById("profile-title");
  const copy = document.getElementById("profile-copy");
  if (entries.length < 3) {
    title.textContent = "Completa al menos tres simulaciones";
    copy.textContent = `Has completado ${entries.length}. Ágora necesita más decisiones para comparar tus prioridades.`;
    scoreKeys.forEach((key) => { document.getElementById(`bar-${key}`).style.width = "0"; });
    document.getElementById("share-profile").hidden = true;
    document.getElementById("interface-reveal").hidden = true;
    state.profile = null;
    return;
  }
  const scores = Object.fromEntries(scoreKeys.map((key) => [key, Math.round(entries.reduce((sum, item) => sum + item[key], 0) / entries.length)]));
  Object.entries(scores).forEach(([key, value]) => { document.getElementById(`bar-${key}`).style.width = `${value}%`; });
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const profiles = {
    guarantees: ["Arquitectura de garantías", "Tiendes a proteger la capacidad de revisar, impugnar y conocer cómo se produjo una decisión."],
    efficiency: ["Gobierno operativo", "Priorizas continuidad, rapidez y capacidad para que los servicios funcionen incluso bajo presión."],
    resilience: ["Instituciones resilientes", "Buscas alternativas, margen de seguridad y capacidad para funcionar cuando una dependencia falla."],
    community: ["Gobernanza comunitaria", "Das valor a la participación, el terreno compartido y las soluciones que una comunidad puede sostener."],
  };
  const tensionNames = { guarantees: "garantías", efficiency: "eficiencia", resilience: "resiliencia", community: "comunidad" };
  title.textContent = profiles[sorted[0][0]][0];
  copy.textContent = `${profiles[sorted[0][0]][1]} Tu principal tensión aparece entre ${tensionNames[sorted[0][0]]} y ${tensionNames[sorted[3][0]]}: proteger una implica aceptar costes en la otra.`;
  state.profile = { title: title.textContent, copy: copy.textContent, scores };
  document.getElementById("share-profile").hidden = false;
  if (entries.length === 5) renderInterfaceReveal();
}

function renderInterfaceReveal() {
  const findings = [
    state.meta.sourcesOpened
      ? "Abriste las fuentes antes de decidir sobre Samira; la interfaz las había ocultado tras un desplegable."
      : "Decidiste sobre Samira sin abrir las fuentes; la interfaz permitió confirmar antes de investigar.",
    state.meta.schoolChanged
      ? "Cambiaste los pesos de la antigua escuela, aunque Ágora había fijado el punto de partida."
      : "Aceptaste los pesos iniciales de la antigua escuela: 60, 60 y 50, elegidos por quienes diseñaron esta demo.",
    state.meta.allocationChanged
      ? "Redistribuiste el cómputo, pero partiste de una jerarquía previa: hospitales 35; atención ciudadana 15."
      : "Conservaste intacta la distribución inicial del cómputo, incluida la menor prioridad de atención ciudadana.",
    state.meta.hiddenConditionsOpened
      ? "Buscaste las condiciones relegadas de la ley personalizada."
      : "La ley podía parecer más sencilla porque sus costes permanecieron detrás de «Ver condiciones relegadas».",
    "El perfil final solo utiliza cuatro ejes. También esa taxonomía —garantías, eficiencia, resiliencia y comunidad— es una decisión editorial.",
  ];
  document.getElementById("interface-findings").innerHTML = findings.map((item, index) => `<article><span>0${index + 1}</span><p>${item}</p></article>`).join("");
  document.getElementById("interface-reveal").hidden = false;
}

document.getElementById("share-profile")?.addEventListener("click", async () => {
  if (!state.profile) return;
  const text = `Mi perfil en Ágora 2032: ${state.profile.title}. Una simulación narrativa de estrategIA.`;
  const url = "https://elcontemplador.github.io/estrategIA-lab/agora2032/";
  try {
    if (navigator.share) await navigator.share({ title: state.profile.title, text, url });
    else await navigator.clipboard.writeText(`${text} ${url}`);
  } catch (_) {
    // Cancelar el diálogo de compartir no cambia la experiencia.
  }
});

document.getElementById("reset-demo")?.addEventListener("click", () => {
  state.results = {};
  state.profile = null;
  state.meta = { sourcesOpened: false, schoolChanged: false, allocationChanged: false, hiddenConditionsOpened: false, songChanged: false };
  localStorage.removeItem(storageKey);
  document.querySelectorAll(".selected, .complete").forEach((item) => item.classList.remove("selected", "complete"));
  document.querySelectorAll(".result-panel").forEach((panel) => { panel.hidden = true; panel.innerHTML = ""; });
  document.querySelectorAll("[data-common-core]").forEach((input) => { input.checked = false; });
  document.querySelector('input[name="melody"][value="archivo"]').checked = true;
  document.querySelector('input[name="rhythm"][value="tambor"]').checked = true;
  document.querySelector('input[name="ending"][value="fragmento"]').checked = true;
  const defaults = { hospital: 35, fire: 30, utilities: 20, citizen: 15, vulnerability: 60, future: 60, reach: 50 };
  Object.entries(defaults).forEach(([id, value]) => { document.getElementById(id).value = value; });
  updateAllocation(); updateSchool(); updateProgress(); updateProfile(); showModule("firma");
  updateProvenance();
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    const filter = button.dataset.filter;
    document.querySelectorAll(".archive-card").forEach((card) => { card.hidden = filter !== "todos" && card.dataset.category !== filter; });
  });
});

const archiveDetails = {
  firma: ["Simulación disponible", "La última firma", "Una firma humana puede existir en el registro y haber desaparecido en la práctica.", "¿Cuánto tiempo y qué información hacen falta para que una firma cuente de verdad?", "firma"],
  escuela: ["Simulación disponible", "El alcalde de los jueves", "La recomendación cambia cuando cambia la definición de beneficio social.", "¿Quién debería decidir qué decisiones públicas no son delegables?", "escuela"],
  memoria: ["Expediente narrativo", "La memoria del ministro", "Conservar cada documento no basta si se destruyen las relaciones que permitían interpretarlo.", "¿A quién pertenece la memoria de una decisión pública: al cargo, al Estado o a la ciudadanía?"],
  cuidador: ["Expediente narrativo", "El cuidador que aprendió a llamar", "La tecnología coordina cuidados sin sustituir la reciprocidad entre personas.", "¿Qué debería poder aprender un sistema sobre un hogar para ayudar a cuidarlo?"],
  computo: ["Simulación disponible", "Cero cómputo", "Una categoría secundaria puede sostener traducción, transporte e información de emergencia.", "¿Qué servicios deberían considerarse infraestructura social crítica?", "computo"],
  empresa: ["Expediente narrativo", "La empresa que no estaba allí", "Una organización automatizada puede funcionar sin que nadie comprenda una excepción concreta.", "¿Qué autoridad necesita una persona para responder realmente por un proceso automatizado?"],
  oposicion: ["Expediente narrativo", "La oposición automática", "Detectar miles de anomalías puede enterrar la investigación que más importa.", "¿Quién debería decidir qué hallazgos merecen la atención escasa de una institución?"],
  ley: ["Simulación disponible", "La ley que todos apoyaban", "Todas las explicaciones pueden ser ciertas y, aun así, impedir una discusión común.", "¿Qué información debe ser idéntica para toda la ciudadanía?", "ley"],
  cancion: ["Simulación disponible", "La canción que nunca existió", "La trazabilidad permite crear una tradición nueva sin fingir que se ha recuperado intacta.", "¿Cuándo la conservación se convierte en creación?", "cancion"],
};
const archiveDialog = document.getElementById("archive-dialog");
document.querySelectorAll("[data-open-archive]").forEach((button) => button.addEventListener("click", () => {
  const detail = archiveDetails[button.dataset.openArchive];
  document.getElementById("archive-dialog-kicker").textContent = detail[0];
  document.getElementById("archive-dialog-title").textContent = detail[1];
  document.getElementById("archive-dialog-copy").textContent = detail[2];
  document.getElementById("archive-dialog-question").textContent = detail[3];
  const actions = document.getElementById("archive-dialog-actions");
  actions.innerHTML = "";
  if (detail[4]) {
    const play = document.createElement("button");
    play.type = "button";
    play.className = "button button-primary";
    play.textContent = "Entrar en la simulación";
    play.addEventListener("click", () => {
      archiveDialog.close();
      routeTo("laboratorio");
      showModule(detail[4]);
    });
    actions.append(play);
  }
  const read = document.createElement("a");
  read.className = "button button-secondary";
  read.href = "https://estrategiabyaleph.substack.com/";
  read.target = "_blank";
  read.rel = "noreferrer";
  read.textContent = "Abrir estrategIA";
  actions.append(read);
  archiveDialog.showModal();
}));
document.querySelector("[data-close-dialog]")?.addEventListener("click", () => archiveDialog.close());
archiveDialog?.addEventListener("click", (event) => {
  if (event.target === archiveDialog) archiveDialog.close();
});

restoreProgress();
updateSchool();
updateAllocation();
updateProvenance();
updateProgress();
updateProfile();
routeTo(location.hash.slice(1) || "inicio", false);
window.addEventListener("load", () => window.scrollTo({ top: 0, behavior: "auto" }), { once: true });
