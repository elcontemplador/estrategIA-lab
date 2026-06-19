const state = {
  caseChoice: null,
  allocation: null,
};

const views = [...document.querySelectorAll("[data-view]")];
const navLinks = [...document.querySelectorAll("[data-route]")];
const nav = document.querySelector(".main-nav");
const navToggle = document.querySelector(".nav-toggle");

function routeTo(route, updateHash = true) {
  const validRoute = views.some((view) => view.dataset.view === route) ? route : "inicio";
  views.forEach((view) => {
    view.hidden = view.dataset.view !== validRoute;
  });
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.route === validRoute);
  });
  if (updateHash) history.replaceState(null, "", `#${validRoute}`);
  nav?.classList.remove("open");
  navToggle?.setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.addEventListener("hashchange", () => routeTo(location.hash.slice(1), false));
document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => routeTo(button.dataset.go));
});
navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    routeTo(link.dataset.route);
  });
});
navToggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});

const disclosure = document.querySelector(".disclosure");
disclosure?.addEventListener("click", () => {
  const target = document.getElementById(disclosure.getAttribute("aria-controls"));
  const expanded = disclosure.getAttribute("aria-expanded") === "true";
  disclosure.setAttribute("aria-expanded", String(!expanded));
  disclosure.querySelector("[aria-hidden]").textContent = expanded ? "＋" : "−";
  target.hidden = expanded;
});

const caseOutcomes = {
  confirmar: {
    title: "La remesa continúa",
    copy: "Las 374 concesiones se pagan a tiempo. La denegación de Samira sigue su curso ordinario y la habitación vence antes de la primera cita disponible. La supervisión figura como completada.",
    tags: ["Rapidez alta", "Garantía baja", "486 expedientes resueltos"],
    scores: { guarantees: 22, efficiency: 88, resilience: 48 },
  },
  urgente: {
    title: "El caso se separa de la remesa",
    copy: "Samira recibe una revisión urgente sin detener el resto de pagos. El servicio resuelve la excepción, pero conserva un sistema que solo detecta los casos de quienes consiguen llegar hasta una persona.",
    tags: ["Rapidez alta", "Corrección individual", "Riesgo de desigualdad"],
    scores: { guarantees: 63, efficiency: 76, resilience: 57 },
  },
  detener: {
    title: "La remesa queda detenida",
    copy: "Se revisan las 112 denegaciones vinculadas a propiedades alternativas. Varias familias cobrarán con retraso, pero la firma humana deja de ser una formalidad. La plantilla actual necesita varios días.",
    tags: ["Garantía alta", "Retraso general", "Supervisión sustantiva"],
    scores: { guarantees: 91, efficiency: 35, resilience: 62 },
  },
};

document.querySelectorAll("[data-case-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-case-choice]").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    state.caseChoice = button.dataset.caseChoice;
    const outcome = caseOutcomes[state.caseChoice];
    const result = document.getElementById("case-result");
    result.innerHTML = `
      <p class="panel-kicker">Consecuencia simulada</p>
      <h2>${outcome.title}</h2>
      <p>${outcome.copy}</p>
      <div class="result-meta">${outcome.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
      <button class="button button-primary" type="button" data-next-compute>Continuar al reparto de cómputo</button>
    `;
    result.hidden = false;
    result.querySelector("[data-next-compute]").addEventListener("click", () => routeTo("computo"));
    result.focus();
    updateProfile();
  });
});

const sliders = [...document.querySelectorAll("[data-allocation]")];
const totalValue = document.getElementById("total-value");
const allocationWarning = document.getElementById("allocation-warning");

function currentAllocation() {
  return Object.fromEntries(sliders.map((input) => [input.id, Number(input.value)]));
}

function updateAllocationUI() {
  const allocation = currentAllocation();
  const total = Object.values(allocation).reduce((sum, value) => sum + value, 0);
  sliders.forEach((input) => {
    document.getElementById(`${input.id}-output`).value = input.value;
  });
  totalValue.textContent = total;
  totalValue.style.color = total === 100 ? "var(--navy)" : "var(--burgundy)";
  allocationWarning.textContent = total === 100
    ? "Capacidad distribuida por completo."
    : total > 100
      ? `Has superado la capacidad en ${total - 100} unidades.`
      : `Quedan ${100 - total} unidades sin asignar.`;
}
sliders.forEach((input) => input.addEventListener("input", updateAllocationUI));

function computeOutcome(allocation) {
  const risks = [];
  const benefits = [];
  if (allocation.hospital < 25) risks.push("los hospitales retrasan pruebas y reorganización de camas");
  else benefits.push("los sistemas hospitalarios mantienen capacidad suficiente");
  if (allocation.fire < 23) risks.push("las simulaciones de incendios pierden precisión temporal");
  else benefits.push("la predicción de incendios sigue operativa");
  if (allocation.utilities < 17) risks.push("agua y energía funcionan con menor margen ante nuevos fallos");
  else benefits.push("la red de agua y energía conserva estabilidad");
  if (allocation.citizen < 13) risks.push("se saturan teléfonos, traducción y transporte accesible");
  else benefits.push("la ciudadanía conserva traducción, refugios y transporte coordinado");

  const resilience = Math.round(
    Math.min(allocation.hospital / 30, 1) * 25 +
    Math.min(allocation.fire / 28, 1) * 25 +
    Math.min(allocation.utilities / 20, 1) * 20 +
    Math.min(allocation.citizen / 18, 1) * 30
  );
  const guarantees = Math.round(Math.min(allocation.citizen / 20, 1) * 55 + Math.min(allocation.hospital / 35, 1) * 45);
  const efficiency = Math.round(100 - Math.abs(allocation.hospital - 32) - Math.abs(allocation.fire - 27) - Math.abs(allocation.utilities - 20) - Math.abs(allocation.citizen - 21));

  return { risks, benefits, scores: { guarantees, efficiency: Math.max(10, efficiency), resilience } };
}

document.getElementById("simulate-allocation")?.addEventListener("click", () => {
  const allocation = currentAllocation();
  const total = Object.values(allocation).reduce((sum, value) => sum + value, 0);
  if (total !== 100) {
    allocationWarning.textContent = "La distribución debe sumar exactamente 100 unidades.";
    sliders[0].focus();
    return;
  }
  const outcome = computeOutcome(allocation);
  state.allocation = { values: allocation, ...outcome };
  const result = document.getElementById("compute-result");
  result.innerHTML = `
    <p class="panel-kicker">Balance de la asignación</p>
    <h2>${outcome.risks.length ? "Has protegido servicios esenciales, pero aparecen costes" : "La distribución mantiene los servicios, con poco margen"}</h2>
    <p><strong>Beneficios:</strong> ${outcome.benefits.join("; ")}.</p>
    <p><strong>Riesgos:</strong> ${outcome.risks.length ? outcome.risks.join("; ") : "cualquier nueva pérdida de capacidad obligaría a revisar las prioridades"}.</p>
    <div class="result-meta">
      <span>Resiliencia ${outcome.scores.resilience}/100</span>
      <span>Acceso ${outcome.scores.guarantees}/100</span>
      <span>Sin respuesta única</span>
    </div>
    <button class="button button-primary" type="button" data-next-archive>Ver mi perfil y el archivo</button>
  `;
  result.hidden = false;
  result.querySelector("[data-next-archive]").addEventListener("click", () => routeTo("archivo"));
  result.focus();
  updateProfile();
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    const filter = button.dataset.filter;
    document.querySelectorAll(".archive-card").forEach((card) => {
      card.hidden = filter !== "todos" && card.dataset.category !== filter;
    });
  });
});

function updateProfile() {
  const title = document.getElementById("profile-title");
  const copy = document.getElementById("profile-copy");
  const caseScores = state.caseChoice ? caseOutcomes[state.caseChoice].scores : null;
  const computeScores = state.allocation?.scores ?? null;

  if (!caseScores || !computeScores) {
    title.textContent = "Aún no has tomado suficientes decisiones";
    copy.textContent = "Completa las dos simulaciones para descubrir qué criterios has priorizado.";
    ["guarantees", "efficiency", "resilience"].forEach((key) => {
      document.getElementById(`bar-${key}`).style.width = "0";
    });
    return;
  }

  const scores = {
    guarantees: Math.round((caseScores.guarantees + computeScores.guarantees) / 2),
    efficiency: Math.round((caseScores.efficiency + computeScores.efficiency) / 2),
    resilience: Math.round((caseScores.resilience + computeScores.resilience) / 2),
  };
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  const profiles = {
    guarantees: ["Guardiana de las garantías", "Has priorizado que las decisiones puedan revisarse y que el acceso no dependa de saber reclamar."],
    efficiency: ["Gestora pragmática", "Has protegido la continuidad y la capacidad de respuesta, aceptando que no todos los casos puedan revisarse igual."],
    resilience: ["Arquitecta de resiliencia", "Has buscado equilibrio, alternativas y capacidad para seguir funcionando cuando el sistema pierde recursos."],
  };
  title.textContent = profiles[top][0];
  copy.textContent = `${profiles[top][1]} Ningún perfil constituye una respuesta correcta: cada prioridad deja algo fuera.`;
  Object.entries(scores).forEach(([key, value]) => {
    document.getElementById(`bar-${key}`).style.width = `${value}%`;
  });
}

document.getElementById("reset-demo")?.addEventListener("click", () => {
  state.caseChoice = null;
  state.allocation = null;
  document.querySelectorAll("[data-case-choice]").forEach((item) => item.classList.remove("selected"));
  document.getElementById("case-result").hidden = true;
  document.getElementById("compute-result").hidden = true;
  const defaults = { hospital: 35, fire: 30, utilities: 20, citizen: 15 };
  sliders.forEach((input) => { input.value = defaults[input.id]; });
  updateAllocationUI();
  updateProfile();
  routeTo("inicio");
});

updateAllocationUI();
routeTo(location.hash.slice(1) || "inicio", false);
