const patternOutput = document.querySelector("[data-pattern-output]");
const patternTokens = Array.from(document.querySelectorAll("[data-pattern-demo] .pattern-token"));

const patternMessages = {
  texto: "Con textos puede resumir, clasificar documentos, redactar borradores o extraer argumentos.",
  imagen: "Con imágenes puede reconocer elementos visuales, describir escenas o detectar patrones gráficos.",
  numero: "Con datos numericos puede estimar tendencias, detectar anomalias o comparar escenarios.",
  codigo: "Con instrucciones y codigo puede automatizar tareas y ayudar a construir herramientas digitales.",
  mixto: "Al combinar formatos aparece la IA multimodal: texto, imágenes, datos y herramientas en un mismo flujo."
};

patternTokens.forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.toggle("is-active");
    const activeKinds = new Set(
      patternTokens.filter((item) => item.classList.contains("is-active")).map((item) => item.dataset.kind)
    );

    if (activeKinds.size === 0) {
      patternOutput.textContent = "Elige varios ejemplos para ver qué tarea podría aprender.";
      return;
    }

    if (activeKinds.size > 1) {
      patternOutput.textContent = patternMessages.mixto;
      return;
    }

    patternOutput.textContent = patternMessages[[...activeKinds][0]];
  });
});

const promptData = {
  vago: {
    text: "Explicame la IA.",
    response: "El modelo puede responder de forma genérica, larga o poco adaptada. Falta objetivo, público, formato y criterio."
  },
  util: {
    text: "Explica qué es la IA a una persona sin conocimientos técnicos en 5 párrafos breves.",
    response: "La respuesta mejora: tiene público, extensión y nivel. Aún podría faltar el enfoque o el uso que se espera del texto."
  },
  institucional: {
    text: "Explica qué es la IA para cargos públicos y equipos de comunicación. Usa lenguaje claro, distingue usos y riesgos, y cierra con una checklist de decisión.",
    response: "El modelo recibe contexto, destinatario, tono, estructura y criterio. La salida será más útil y más fácil de revisar."
  }
};

const promptButtons = Array.from(document.querySelectorAll("[data-prompt]"));
const promptText = document.querySelector("[data-prompt-text]");
const promptResponse = document.querySelector("[data-prompt-response]");

promptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    promptButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    const data = promptData[button.dataset.prompt];
    promptText.textContent = data.text;
    promptResponse.textContent = data.response;
  });
});

const riskData = {
  bajo: {
    title: "Riesgo bajo",
    copy: "Buen caso para acelerar trabajo si no incluye datos sensibles y una persona revisa el resultado.",
    width: "28%",
    color: "#59614c"
  },
  medio: {
    title: "Riesgo medio",
    copy: "Necesita tono adecuado, revisión humana, trazabilidad y cuidado con datos personales o respuestas automatizadas.",
    width: "62%",
    color: "#c39a57"
  },
  alto: {
    title: "Riesgo alto",
    copy: "Debe tratarse como una decisión sensible: requiere controles, auditoría, responsables claros y garantías para las personas afectadas.",
    width: "94%",
    color: "#9d2235"
  }
};

const riskButtons = Array.from(document.querySelectorAll("[data-risk]"));
const riskFill = document.querySelector("[data-risk-fill]");
const riskTitle = document.querySelector("[data-risk-title]");
const riskCopy = document.querySelector("[data-risk-copy]");

riskButtons.forEach((button) => {
  button.addEventListener("click", () => {
    riskButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    const data = riskData[button.dataset.risk];
    riskFill.style.width = data.width;
    riskFill.style.background = data.color;
    riskTitle.textContent = data.title;
    riskCopy.textContent = data.copy;
  });
});

const mapMessages = {
  datos: "Sin datos adecuados no hay sistema fiable. En el sector público, además, los datos exigen legitimidad, calidad y protección.",
  infraestructura: "La capacidad de computación, nube y conectividad condiciona quién puede entrenar, desplegar o controlar sistemas avanzados.",
  regulacion: "Las reglas determinan usos permitidos, responsabilidades, transparencia, supervisión y garantías para la ciudadanía.",
  talento: "La adopción real depende de perfiles capaces de traducir problemas institucionales en sistemas útiles y gobernables.",
  servicios: "La IA puede redisenar tramites, atencion ciudadana y gestion interna, pero debe preservar derechos y control humano.",
  comunicacion: "La IA acelera producción, análisis y segmentación de mensajes. También aumenta la necesidad de criterio, verificación y confianza."
};

const mapButtons = Array.from(document.querySelectorAll("[data-node]"));
const mapNote = document.querySelector("[data-map-note]");

mapButtons.forEach((button) => {
  button.addEventListener("click", () => {
    mapButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    mapNote.textContent = mapMessages[button.dataset.node];
  });
});
