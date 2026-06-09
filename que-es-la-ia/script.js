const revealItems = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  { threshold: 0.14 }
);

revealItems.forEach((item) => revealObserver.observe(item));

const completionData = {
  cielo: {
    fragment: "El cielo es...",
    options: [
      ["azul", 78, "#6aa1b8"],
      ["gris", 14, "#adaeb0"],
      ["inmenso", 8, "#c39a57"]
    ]
  },
  ayuntamiento: {
    fragment: "Un ayuntamiento puede usar IA para...",
    options: [
      ["resumir expedientes", 46, "#6aa1b8"],
      ["orientar consultas", 34, "#59614c"],
      ["decidir sanciones", 20, "#9d2235"]
    ]
  },
  campana: {
    fragment: "En una campaña electoral, la IA puede...",
    options: [
      ["analizar discursos", 42, "#6aa1b8"],
      ["probar mensajes", 37, "#c39a57"],
      ["fabricar certezas", 21, "#9d2235"]
    ]
  }
};

const completionSelect = document.querySelector("[data-completion-select]");
const completionFragment = document.querySelector("[data-completion-fragment]");
const probabilityList = document.querySelector("[data-probability-list]");

function renderCompletion(key) {
  const data = completionData[key];
  completionFragment.textContent = data.fragment;
  probabilityList.innerHTML = data.options
    .map(
      ([label, value, color]) => `
        <div class="prob-row">
          <strong>${label}</strong>
          <div class="prob-track"><span style="width: ${value}%; background: ${color}"></span></div>
          <span>${value}%</span>
        </div>
      `
    )
    .join("");
}

if (completionSelect) {
  renderCompletion(completionSelect.value);
  completionSelect.addEventListener("change", () => renderCompletion(completionSelect.value));
}

const flowData = {
  reactivo: {
    caption:
      "Ejemplo: preguntas qué subvenciones hay para digitalización de pymes y recibes una explicación general. Puede orientar, pero tú tendrás que buscar convocatorias, comprobar plazos y preparar la solicitud.",
    steps: [
      ["entrada", "El usuario pregunta."],
      ["modelo", "El sistema genera una respuesta."],
      ["salida", "La persona revisa, corrige y decide qué hacer."]
    ]
  },
  agentico: {
    caption:
      "Ejemplo: le pides que busque subvenciones; consulta fuentes autorizadas, filtra convocatorias abiertas, compara requisitos con tu organización y prepara un borrador. Tú revisas antes de enviar nada.",
    steps: [
      ["objetivo", "Define la tarea y los límites."],
      ["plan", "Divide el trabajo en pasos."],
      ["herramientas", "Consulta documentos, datos o sistemas autorizados."],
      ["verificación", "Contrasta el resultado y detecta huecos."],
      ["entrega", "Propone una salida revisable por una persona."]
    ]
  }
};

const flowButtons = document.querySelectorAll("[data-flow]");
const flowVisual = document.querySelector("[data-flow-visual]");
const flowCaption = document.querySelector("[data-flow-caption]");

function renderFlow(key) {
  const data = flowData[key];
  flowVisual.innerHTML = data.steps
    .map(
      ([title, copy]) => `
        <article class="flow-step">
          <span>${title}</span>
          <p>${copy}</p>
        </article>
      `
    )
    .join("");
  flowCaption.textContent = data.caption;
}

if (flowVisual) {
  renderFlow("reactivo");
  flowButtons.forEach((button) => {
    button.addEventListener("click", () => {
      flowButtons.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      renderFlow(button.dataset.flow);
    });
  });
}

const promptBlocks = {
  rol: "Actúa como asesor de políticas públicas.",
  tarea: "Resume el documento y extrae las decisiones pendientes.",
  contexto: "El texto se usará en una reunión de equipo municipal.",
  limites: "No inventes datos y marca cualquier punto no confirmado.",
  formato: "Entrega 5 viñetas y una tabla de riesgos.",
  criterio: "Prioriza claridad, trazabilidad y utilidad para decidir."
};

const blockExplanations = {
  rol: "El rol orienta el criterio: no es lo mismo responder como jurista, docente, técnico municipal o periodista.",
  tarea: "La tarea evita que el modelo improvise: resumir, comparar, redactar, detectar riesgos o preparar una decisión no son lo mismo.",
  contexto: "El contexto adapta el nivel, el tono y la utilidad. Una nota para ciudadanía no se escribe igual que un informe interno.",
  limites: "Los límites reducen errores: puedes prohibir inventar datos, pedir cautelas o exigir que marque dudas.",
  formato: "El formato convierte la respuesta en algo usable: tabla, viñetas, checklist, correo, informe o guion.",
  criterio: "El criterio define qué es una buena salida: claridad, trazabilidad, brevedad, prudencia, rigor o utilidad práctica."
};

const blockButtons = document.querySelectorAll("[data-block]");
const assembledPrompt = document.querySelector("[data-assembled-prompt]");
const promptScore = document.querySelector("[data-prompt-score]");
const promptDiagnosis = document.querySelector("[data-prompt-diagnosis]");
const blockExplainer = document.querySelector("[data-block-explainer]");
const activeBlocks = new Set();

function renderPrompt() {
  const parts = [...activeBlocks].map((key) => promptBlocks[key]);
  promptScore.textContent = `${parts.length}/6`;
  assembledPrompt.textContent = parts.length
    ? parts.join(" ")
    : "Pulsa bloques para construir una instrucción de trabajo.";
  if (parts.length < 3) {
    promptDiagnosis.textContent =
      "Todavía es un encargo débil: el modelo tendrá que adivinar contexto, límites o formato.";
  } else if (parts.length < 6) {
    promptDiagnosis.textContent =
      "Ya es una instrucción útil. Añadir límites y criterio mejora la revisión humana.";
  } else {
    promptDiagnosis.textContent =
      "Encargo completo: define rol, tarea, contexto, límites, formato y criterio de calidad.";
  }
}

blockButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.block;
    if (activeBlocks.has(key)) {
      activeBlocks.delete(key);
      button.classList.remove("is-active");
    } else {
      activeBlocks.add(key);
      button.classList.add("is-active");
    }
    blockExplainer.textContent = blockExplanations[key];
    renderPrompt();
  });
});

const scenarioData = {
  legal: {
    text:
      '"El Reglamento Europeo de IA obliga a todas las administraciones locales a publicar cada semana un informe automático de uso de algoritmos desde enero de 2026. Por tanto, cualquier ayuntamiento que use un chatbot debe registrar todas las conversaciones en abierto."',
    claims: [
      ["normal", '"Reglamento Europeo de IA"'],
      ["hallucination", '"cada semana" y "desde enero de 2026"'],
      ["normal", '"ayuntamiento que use un chatbot"']
    ],
    success:
      "Bien detectado: fechas, periodicidades y obligaciones legales concretas deben verificarse. Son detalles que suenan precisos y por eso mismo pueden colarse con facilidad.",
    miss:
      "Esa parte puede necesitar contexto, pero no es la señal más sospechosa. Busca cifras, fechas, obligaciones absolutas o formulaciones legales demasiado seguras."
  },
  fuente: {
    text:
      '"Según un estudio de la Universidad de Oxford de 2024, el 83% de los municipios europeos que usan IA redujeron sus tiempos de tramitación a la mitad en menos de seis meses."',
    claims: [
      ["normal", '"Universidad de Oxford"'],
      ["hallucination", '"83%" y "a la mitad en menos de seis meses"'],
      ["normal", '"municipios europeos que usan IA"']
    ],
    success:
      "Correcto: una fuente prestigiosa más una cifra exacta no bastan. Hay que localizar el estudio, comprobar metodología y ver si esa cifra existe.",
    miss:
      "La pista fuerte está en la combinación de fuente prestigiosa, porcentaje exacto y conclusión llamativa sin enlace o referencia verificable."
  },
  logica: {
    text:
      '"Como la IA puede resumir expedientes con rapidez, cualquier decisión administrativa basada en IA será más objetiva que una decisión humana."',
    claims: [
      ["normal", '"puede resumir expedientes con rapidez"'],
      ["hallucination", '"será más objetiva que una decisión humana"'],
      ["normal", '"decisión administrativa basada en IA"']
    ],
    success:
      "Bien visto: la rapidez no implica objetividad. Un sistema puede acelerar una tarea y reproducir sesgos, errores de datos o criterios mal definidos.",
    miss:
      "La trampa no es técnica, es lógica: salta de una capacidad real, resumir rápido, a una conclusión que no se deduce, decidir mejor."
  },
  sesgo: {
    text:
      '"Si quieres demostrar que la IA siempre mejora la atención ciudadana, basta con comparar ejemplos de chatbots exitosos y excluir los casos fallidos por mala implantación."',
    claims: [
      ["hallucination", '"excluir los casos fallidos"'],
      ["normal", '"comparar ejemplos de chatbots exitosos"'],
      ["normal", '"atención ciudadana"']
    ],
    success:
      "Exacto: aquí la IA refuerza una conclusión deseada en vez de cuestionar el planteamiento. Es sesgo de confirmación convertido en método.",
    miss:
      "El problema es metodológico: si solo miras casos que confirman la tesis, la respuesta puede parecer sólida aunque esté sesgada desde el encargo."
  }
};

const scenarioButtons = document.querySelectorAll("[data-scenario]");
const scenarioText = document.querySelector("[data-scenario-text]");
const claimList = document.querySelector("[data-claim-list]");
const hallucinationFeedback = document.querySelector("[data-hallucination-feedback]");

function renderScenario(key) {
  const data = scenarioData[key];
  scenarioText.textContent = data.text;
  claimList.innerHTML = data.claims
    .map(([type, label]) => `<button data-claim="${type}">${label}</button>`)
    .join("");
  hallucinationFeedback.textContent =
    "Pulsa la parte más sospechosa. El objetivo no es memorizar normas, sino entrenar el reflejo de verificación.";
  claimList.querySelectorAll("[data-claim]").forEach((button) => {
    button.addEventListener("click", () => {
      claimList.querySelectorAll("[data-claim]").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      hallucinationFeedback.textContent =
        button.dataset.claim === "hallucination" ? data.success : data.miss;
    });
  });
}

if (scenarioText) {
  renderScenario("legal");
  scenarioButtons.forEach((button) => {
    button.addEventListener("click", () => {
      scenarioButtons.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      renderScenario(button.dataset.scenario);
    });
  });
}

const riskData = {
  bajo: {
    title: "Riesgo bajo",
    copy: "Ejemplo: redactar un primer borrador de nota interna o resumir una reunión sin datos sensibles. El coste de un error es bajo si alguien revisa.",
    width: "28%",
    color: "#59614c",
    controls: ["Revisión humana", "No introducir información sensible", "Trazabilidad mínima"]
  },
  medio: {
    title: "Riesgo medio",
    copy: "Ejemplo: un chatbot que responde dudas sobre trámites. Si informa mal de un plazo, puede perjudicar a una persona. Necesita fuentes, registro y escalado humano.",
    width: "62%",
    color: "#c39a57",
    controls: ["Base documental aprobada", "Registro de respuestas", "Circuito de escalado humano"]
  },
  alto: {
    title: "Riesgo alto",
    copy: "Ejemplo: priorizar solicitudes de ayuda social. Hay que comprobar sesgos por código postal, edad, renta, nacionalidad u otras variables sensibles.",
    width: "94%",
    color: "#9d2235",
    controls: ["Evaluación previa", "Auditoría", "Explicación a personas afectadas", "Supervisión reforzada"]
  }
};

const riskButtons = document.querySelectorAll("[data-risk]");
const riskFill = document.querySelector("[data-risk-fill]");
const riskTitle = document.querySelector("[data-risk-title]");
const riskCopy = document.querySelector("[data-risk-copy]");
const riskControls = document.querySelector("[data-risk-controls]");

riskButtons.forEach((button) => {
  button.addEventListener("click", () => {
    riskButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    const data = riskData[button.dataset.risk];
    riskFill.style.width = data.width;
    riskFill.style.background = data.color;
    riskTitle.textContent = data.title;
    riskCopy.textContent = data.copy;
    riskControls.innerHTML = data.controls.map((item) => `<li>${item}</li>`).join("");
  });
});

document.querySelectorAll(".flashcard").forEach((card) => {
  card.addEventListener("click", () => {
    card.classList.toggle("is-active");
  });
});

const checklist = document.querySelector("[data-checklist]");
const checklistProgress = document.querySelector("[data-checklist-progress]");

if (checklist) {
  const boxes = checklist.querySelectorAll("input[type='checkbox']");
  const updateChecklist = () => {
    const done = [...boxes].filter((box) => box.checked).length;
    checklistProgress.textContent = `${done} de ${boxes.length} preguntas marcadas`;
  };
  boxes.forEach((box) => box.addEventListener("change", updateChecklist));
  updateChecklist();
}
