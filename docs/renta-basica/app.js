"use strict";

(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const integer = new Intl.NumberFormat("es-ES", {maximumFractionDigits: 0});
  const decimal = new Intl.NumberFormat("es-ES", {minimumFractionDigits: 1, maximumFractionDigits: 1});
  const write = (id, text) => { document.getElementById(id).textContent = text; };

  function initCalculator() {
    const inputs = Object.fromEntries(
      ["population", "payment", "recovery"].map(id => [id, document.getElementById(id)])
    );
    const reset = document.getElementById("reset-calculator");
    Object.values(inputs).forEach(input => { input.disabled = false; });
    reset.disabled = false;
    let announcement;
    function update(announce = true) {
      const population = Number(inputs.population.value);
      const payment = Number(inputs.payment.value);
      const recovery = Number(inputs.recovery.value);
      const gross = population * payment * 12 / 1000;
      const recovered = gross * recovery / 100;
      const balance = gross - recovered;
      const populationText = population === 1 ? "1 millón" : integer.format(population) + " millones";
      write("population-value", populationText);
      write("payment-value", integer.format(payment) + " €");
      write("recovery-value", integer.format(recovery) + " %");
      inputs.population.setAttribute("aria-valuetext", populationText + " de personas");
      inputs.payment.setAttribute("aria-valuetext", integer.format(payment) + " euros mensuales por persona");
      inputs.recovery.setAttribute("aria-valuetext", recovery + " por ciento del coste bruto");
      write("gross-value", decimal.format(gross));
      write("recovered-value", decimal.format(recovered) + " mil M€");
      write("balance-value", decimal.format(balance) + " mil M€");
      write("balance-preview", decimal.format(balance) + " mil M€");
      write("gross-preview", decimal.format(gross) + " mil M€");
      write("calculation", populationText + " × " + integer.format(payment) + " € × 12 meses = " + decimal.format(gross) + " mil M€.");
      document.getElementById("recovered-bar").style.width = recovery + "%";
      document.getElementById("balance-bar").style.width = (100 - recovery) + "%";
      clearTimeout(announcement);
      if (announce) {
        announcement = setTimeout(() => {
          write("calculator-status", "Saldo anual por financiar: " + decimal.format(balance) +
            " mil millones de euros. Coste bruto: " + decimal.format(gross) +
            "; recuperación fiscal supuesta: " + decimal.format(recovered) + " mil millones.");
        }, 250);
      }
    }
    Object.values(inputs).forEach(input => input.addEventListener("input", () => update()));
    reset.addEventListener("click", () => {
      inputs.population.value = "10";
      inputs.payment.value = "800";
      inputs.recovery.value = "35";
      update();
    });
    update(false);
  }

  function initScenarios() {
    const tabs = document.querySelector(".scenario-tabs");
    const buttons = Array.from(document.querySelectorAll("[data-scenario]"));
    const panels = Array.from(document.querySelectorAll(".scenario-panel"));
    tabs.hidden = false;
    tabs.setAttribute("role", "tablist");
    function select(name, focus = false) {
      buttons.forEach(button => {
        const active = button.dataset.scenario === name;
        button.classList.toggle("active", active);
        button.setAttribute("role", "tab");
        button.setAttribute("aria-selected", String(active));
        button.removeAttribute("aria-pressed");
        button.setAttribute("aria-controls", "escenario-" + button.dataset.scenario);
        button.tabIndex = active ? 0 : -1;
        if (active && focus) button.focus();
      });
      panels.forEach(panel => {
        panel.hidden = panel.id !== "escenario-" + name;
      });
    }
    // The panel selection is kept with the button state, including deep links.
    function activate(name, focus = false) {
      if (!buttons.some(button => button.dataset.scenario === name)) return;
      select(name, focus);
    }
    buttons.forEach((button, index) => {
      button.id = "tab-" + button.dataset.scenario;
      button.addEventListener("click", () => activate(button.dataset.scenario));
      button.addEventListener("keydown", event => {
        const isVertical = getComputedStyle(tabs).flexDirection === "column";
        const forward = isVertical ? "ArrowDown" : "ArrowRight";
        const backward = isVertical ? "ArrowUp" : "ArrowLeft";
        let target;
        if (event.key === forward) target = (index + 1) % buttons.length;
        else if (event.key === backward) target = (index + buttons.length - 1) % buttons.length;
        else if (event.key === "Home") target = 0;
        else if (event.key === "End") target = buttons.length - 1;
        if (target === undefined) return;
        event.preventDefault();
        activate(buttons[target].dataset.scenario, true);
      });
    });
    panels.forEach(panel => {
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", "tab-" + panel.id.replace("escenario-", ""));
      panel.tabIndex = 0;
    });
    const orientation = () => tabs.setAttribute(
      "aria-orientation", getComputedStyle(tabs).flexDirection === "column" ? "vertical" : "horizontal"
    );
    function applyHash() {
      if (location.hash.startsWith("#escenario-")) {
        activate(location.hash.slice("#escenario-".length));
      }
    }
    activate("complemento");
    applyHash();
    orientation();
    window.addEventListener("resize", orientation);
    return {
      activate,
      current: () => buttons.find(button => button.classList.contains("active"))?.dataset.scenario
    };
  }

  function initSources(scenarios) {
    let pendingRestore = null;
    let explicitHash = null;
    const links = Array.from(document.querySelectorAll('a[href^="#"]'));
    links.forEach((link, linkIndex) => {
      link.addEventListener("click", event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
            event.ctrlKey || event.shiftKey || event.altKey) return;
        pendingRestore = null;
        explicitHash = link.hash;
        const citation = link.matches(".cite") ? link : null;
        // Every departure records the current reading position. A later chapter
        // visit must replace, rather than reuse, an earlier citation snapshot.
        history.replaceState({
          ...history.state,
          rentaCitation: citation ? citation.id : null,
          rentaLink: linkIndex,
          rentaScroll: {x: window.scrollX, y: window.scrollY},
          rentaScenario: scenarios.current()
        }, "");
        const source = citation && document.getElementById(citation.hash.slice(1));
        const back = source && source.querySelector(".source-return");
        if (back) {
          back.href = "#" + citation.id;
          back.setAttribute("aria-label", "Volver al pasaje que cita esta fuente");
        }
        if (link.hash === location.hash) {
          event.preventDefault();
          explicitHash = null;
          revealTarget(true, true);
          history.replaceState({...history.state, rentaCitation: null, rentaScroll: null}, "");
        }
      });
    });
    function revealElement(target) {
      const panel = target.closest(".scenario-panel");
      if (panel) scenarios.activate(panel.id.replace("escenario-", ""));
      if (target.tagName === "DETAILS") target.open = true;
      let parent = target.parentElement;
      while (parent) {
        if (parent.tagName === "DETAILS") parent.open = true;
        parent = parent.parentElement;
      }
    }
    function revealTarget(focus = false, scroll = false) {
      if (!location.hash) return;
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (!target) return;
      revealElement(target);
      const reference = target.matches(".cite") || target.id.startsWith("fuente-");
      if (focus && target.tagName === "DETAILS") {
        target.querySelector("summary")?.focus({preventScroll: true});
      } else if (focus && reference) {
        target.focus({preventScroll: true});
      }
      if (scroll || (focus && reference)) {
        target.scrollIntoView({block: "start", behavior: "instant"});
      }
    }
    window.addEventListener("hashchange", () => {
      // Explicit links go to their fragment; Back/Forward restore a reading
      // position, which may be far from the fragment left in the address bar.
      if (explicitHash === location.hash) {
        explicitHash = null;
        revealTarget(true);
      }
    });
    window.addEventListener("popstate", event => {
      if (explicitHash === location.hash) return;
      explicitHash = null;
      pendingRestore = null;
      const state = event.state;
      const position = state && state.rentaScroll;
      if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
        if (state && state.rentaScenario) scenarios.activate(state.rentaScenario);
        else revealTarget();
        return;
      }
      pendingRestore = state;
      // Run after native fragment/scroll restoration and its hashchange event.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (pendingRestore !== state) return;
        if (state.rentaScenario) scenarios.activate(state.rentaScenario);
        const citation = document.getElementById(state.rentaCitation);
        if (citation && citation.matches(".cite")) revealElement(citation);
        window.scrollTo({left: position.x, top: position.y, behavior: "instant"});
        if (citation && citation.matches(".cite")) {
          citation.focus({preventScroll: true});
          const box = citation.getBoundingClientRect();
          const navHeight = document.querySelector(".chapter-nav").getBoundingClientRect().height;
          if (box.top < navHeight || box.bottom > window.innerHeight) {
            citation.scrollIntoView({block: "center", behavior: "instant"});
          }
        } else {
          const link = links[state.rentaLink];
          if (link) link.focus({preventScroll: true});
        }
        // The browser tracks subsequent reading. Do not replay this snapshot
        // after another Back/Forward journey without a new link departure.
        history.replaceState({...history.state, rentaCitation: null, rentaScroll: null}, "");
        pendingRestore = null;
      }));
    });
    revealTarget();
  }

  function initChapters() {
    const nav = document.querySelector(".chapter-nav .chapter-links");
    const links = Array.from(nav.querySelectorAll("a"));
    const sections = [
      ["resumen", "resumen"], ["prepararse", "prepararse"], ["cambio-trabajo", "prepararse"], ["idea", "idea"], ["evidencia", "evidencia"], ["ia", "ia"],
      ["escenarios", "ia"], ["postescasez", "ia"], ["coste", "coste"],
      ["objeciones", "coste"], ["transicion", "transicion"],
      ["archivo", "transicion"], ["fuentes", "fuentes"]
    ].map(([id, chapter]) => ({element: document.getElementById(id), chapter}));
    let scheduled = false;
    let lastChapter = "";
    function update() {
      let current = "";
      const threshold = Math.max(100, window.innerHeight * 0.25);
      sections.forEach(item => {
        if (item.element.getBoundingClientRect().top <= threshold) current = item.chapter;
      });
      links.forEach(link => {
        const active = link.hash === "#" + current;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
        if (active && current !== lastChapter && nav.scrollWidth > nav.clientWidth &&
            !nav.matches(":focus-within")) {
          const box = link.getBoundingClientRect();
          const navBox = nav.getBoundingClientRect();
          if (box.left < navBox.left + 12 || box.right > navBox.right - 12) {
            nav.scrollTo({
              left: nav.scrollLeft + box.left - navBox.left - (nav.clientWidth - box.width) / 2,
              behavior: reduceMotion.matches ? "instant" : "smooth"
            });
          }
        }
      });
      lastChapter = current;
      scheduled = false;
    }
    function schedule() {
      if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
    }
    window.addEventListener("scroll", schedule, {passive: true});
    window.addEventListener("resize", schedule);
    update();
  }

  function initPrint() {
    let originalStates;
    window.addEventListener("beforeprint", () => {
      if (originalStates) return;
      originalStates = Array.from(document.querySelectorAll("details")).map(details => [details, details.open]);
      originalStates.forEach(([details]) => { details.open = true; });
    });
    window.addEventListener("afterprint", () => {
      if (!originalStates) return;
      originalStates.forEach(([details, open]) => { details.open = open; });
      originalStates = undefined;
    });
  }

  initCalculator();
  const scenarios = initScenarios();
  initSources(scenarios);
  initChapters();
  initPrint();
})();
