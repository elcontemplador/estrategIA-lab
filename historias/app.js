(() => {
  const data = window.HISTORIAS_DATA;
  if (!data) return;

  const initialParams = new URLSearchParams(window.location.search);
  const requestedYear = initialParams.get("temporada");
  const requestedTheme = initialParams.get("tema");
  const requestedStory = initialParams.get("historia");
  const validYears = new Set(data.seasons.map((season) => String(season.year)));
  const validThemes = new Set(data.themes.map((theme) => theme.id));
  const validStories = new Set(data.stories.map((story) => story.id));
  const state = {
    year: validYears.has(requestedYear) ? requestedYear : "all",
    theme: validThemes.has(requestedTheme) ? requestedTheme : "all"
  };
  const byId = (id) => document.getElementById(id);
  const storyGrid = byId("story-grid");
  const dialog = byId("story-dialog");
  const pdfDialog = byId("pdf-dialog");
  const pdfFrame = byId("pdf-reader-frame");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const siteHeader = document.querySelector(".site-header");
  let dialogTrigger = null;
  let pdfDialogTrigger = null;
  let activeStoryId = null;
  let copyFeedbackTimer = null;

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const themeLabel = (id) => data.themes.find((theme) => theme.id === id)?.label || id;
  const seasonFor = (year) => data.seasons.find((season) => season.year === year);
  const archiveImageFor = (story) => story.archive_image?.web_path || "";
  const imagesFor = (story) => story.images?.length ? story.images : (archiveImageFor(story) ? [archiveImageFor(story)] : []);
  const primaryImageFor = (story) => story.image || imagesFor(story)[0] || "";
  const imageAltFor = (story) => story.image_alt || story.archive_image?.alt || `Ilustración de ${story.title}`;
  const imageNoteFor = (story) => story.image_note || story.archive_image?.note || "";

  function urlForState(storyId = null) {
    const nextUrl = new URL(window.location.href);
    if (state.year === "all") nextUrl.searchParams.delete("temporada");
    else nextUrl.searchParams.set("temporada", state.year);
    if (state.theme === "all") nextUrl.searchParams.delete("tema");
    else nextUrl.searchParams.set("tema", state.theme);
    if (storyId) nextUrl.searchParams.set("historia", storyId);
    else nextUrl.searchParams.delete("historia");
    nextUrl.hash = "archivo";
    return nextUrl;
  }

  const storyHref = (storyId) => urlForState(storyId).href;

  function syncFilterUrl() {
    window.history.replaceState({}, "", urlForState());
  }

  function syncStoryUrl(storyId) {
    window.history.replaceState({}, "", urlForState(storyId));
  }

  function setMenu(open) {
    siteHeader.classList.toggle("menu-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Cerrar navegación" : "Abrir navegación");
  }

  function renderHero() {
    byId("story-count").textContent = data.stories.length;
    byId("season-count").textContent = data.seasons.length;
    byId("theme-count").textContent = data.themes.length;
    const selected = [
      data.stories.find((story) => story.id === "2024-bostezo-digital"),
      data.stories.find((story) => story.id === "2025-margen-dormir"),
      data.stories.find((story) => story.id === "2026-ultima-firma"),
      data.stories.find((story) => story.id === "2026-cuidador-llamar")
    ].filter(Boolean);
    byId("hero-gallery").innerHTML = selected.map((story, index) => `
      <figure class="hero-image hero-image-${index + 1}">
        ${story.image ? `<img src="${escapeHtml(story.image)}" alt="Ilustración de ${escapeHtml(story.title)}">` : ""}
        <figcaption>${story.year} · ${escapeHtml(story.title)}</figcaption>
      </figure>
    `).join("");
  }

  function renderProject() {
    byId("project-text").innerHTML = data.project.introduction
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join("");
    byId("method-list").innerHTML = data.project.method_points
      .map((point) => `<li>${escapeHtml(point)}</li>`)
      .join("");
  }

  function renderSeasons() {
    byId("season-grid").innerHTML = data.seasons.map((season) => {
      const count = data.stories.filter((story) => story.year === season.year).length;
      const status = "Temporada completa";
      return `
        <article class="season-card season-${season.year}" id="temporada-${season.year}">
          <a class="season-card-link" href="?temporada=${season.year}#archivo" data-season="${season.year}" aria-label="Explorar la temporada ${season.year}: ${escapeHtml(season.title)}">
            <div class="season-topline"><span>${escapeHtml(season.eyebrow)}</span><b>${count} historias</b></div>
            <p class="season-year">${season.year}</p>
            <h3>${escapeHtml(season.title)}</h3>
            <p>${escapeHtml(season.description)}</p>
            <div class="season-key"><span>${status}</span><p>${escapeHtml(season.editorial_key)}</p></div>
            <span class="season-card-cta">Explorar ${season.year} <span aria-hidden="true">→</span></span>
          </a>
        </article>
      `;
    }).join("");
  }

  function renderFilters() {
    const years = ["all", ...data.seasons.map((season) => String(season.year))];
    byId("year-filters").innerHTML = years.map((year) => `
      <button type="button" data-year="${year}" class="${state.year === year ? "active" : ""}" aria-pressed="${state.year === year}">
        ${year === "all" ? "Todas" : year}
      </button>
    `).join("");
    const themes = [{ id: "all", label: "Todos" }, ...data.themes];
    byId("theme-filters").innerHTML = themes.map((theme) => `
      <button type="button" data-theme="${theme.id}" class="${state.theme === theme.id ? "active" : ""}" aria-pressed="${state.theme === theme.id}">
        ${escapeHtml(theme.label)}
      </button>
    `).join("");
  }

  function updateFilterControls() {
    document.querySelectorAll("[data-year]").forEach((button) => {
      const active = button.dataset.year === state.year;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-theme]").forEach((button) => {
      const active = button.dataset.theme === state.theme;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function filteredStories() {
    return data.stories.filter((story) => {
      const yearMatch = state.year === "all" || String(story.year) === state.year;
      const themeMatch = state.theme === "all" || story.themes.includes(state.theme);
      return yearMatch && themeMatch;
    });
  }

  function renderStories() {
    const stories = filteredStories();
    byId("result-count").textContent = stories.length;
    byId("empty-state").hidden = stories.length !== 0;
    storyGrid.innerHTML = stories.map((story) => {
      const primaryImage = primaryImageFor(story);
      const imageAlt = imageAltFor(story);
      const imageNote = imageNoteFor(story);
      const imageCredit = imageNote
        ? `<span class="story-image-credit">Creada para el archivo</span>`
        : "";
      return `
        <article class="story-card" data-story-id="${story.id}">
          <a class="story-card-link" href="${escapeHtml(storyHref(story.id))}" data-open-story="${story.id}" aria-label="Abrir la ficha de ${escapeHtml(story.title)}">
            <div class="story-image">
              ${primaryImage ? `<img src="${escapeHtml(primaryImage)}" alt="${escapeHtml(imageAlt)}" loading="lazy">` : `<span>${story.year}</span>`}
              <p>${story.year} / ${String(story.order).padStart(2, "0")}</p>
              ${imageCredit}
            </div>
            <div class="story-content">
              <p class="story-model">estrategIA #${story.issue} · ${escapeHtml(story.model)}</p>
              <h3>${escapeHtml(story.title)}</h3>
              <p class="story-premise">${escapeHtml(story.premise)}</p>
              <div class="story-tags">${story.themes.map((theme) => `<span>${escapeHtml(themeLabel(theme))}</span>`).join("")}</div>
              <span class="story-card-cta">Abrir ficha <span aria-hidden="true">→</span></span>
            </div>
          </a>
        </article>
      `;
    }).join("");
  }

  function applyFilters() {
    updateFilterControls();
    renderStories();
  }

  function openStory(storyId, trigger, syncUrl = true) {
    const story = data.stories.find((item) => item.id === storyId);
    if (!story) return;
    dialogTrigger = trigger || null;
    activeStoryId = storyId;
    clearTimeout(copyFeedbackTimer);
    byId("dialog-permalink").textContent = "Copiar enlace";
    byId("dialog-eyebrow").textContent = `${seasonFor(story.year)?.title || story.year} · historia ${String(story.order).padStart(2, "0")}`;
    byId("dialog-title").textContent = story.title;
    byId("dialog-meta").textContent = `estrategIA #${story.issue} · ${story.model} · ${story.word_count} palabras`;
    byId("dialog-premise").textContent = story.premise;
    byId("after-label").textContent = story.year === 2026 ? "Después de la ficción" : "La pregunta que deja";
    byId("dialog-after").innerHTML = story.after_fiction
      .split(/\n\n+/)
      .filter(Boolean)
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join("");
    byId("dialog-link").href = story.url;
    const images = imagesFor(story);
    const imageNote = imageNoteFor(story);
    byId("dialog-gallery").innerHTML = images.length
      ? images.map((image, index) => {
        const alt = index === 0 && (story.image_alt || story.archive_image?.alt)
          ? imageAltFor(story)
          : `Ilustración ${index + 1} de ${story.title}`;
        return `<img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" loading="lazy">`;
      }).join("") + (imageNote ? `<p class="dialog-image-note">${escapeHtml(imageNote)}</p>` : "")
      : `<div class="dialog-placeholder"><span>${story.year}</span></div>`;
    dialog.showModal();
    document.body.classList.add("dialog-open");
    if (syncUrl) syncStoryUrl(story.id);
  }

  function closeStory() {
    dialog.close();
    document.body.classList.remove("dialog-open");
    dialogTrigger?.focus();
    syncFilterUrl();
  }

  function openPdfReader(trigger) {
    pdfDialogTrigger = trigger;
    pdfFrame.src = "descargas/archivo_historias_2024_2026.pdf#page=1&view=FitH";
    pdfDialog.showModal();
    document.body.classList.add("dialog-open");
  }

  function closePdfReader() {
    pdfDialog.close();
    pdfFrame.removeAttribute("src");
    document.body.classList.remove("dialog-open");
    pdfDialogTrigger?.focus();
  }

  async function copyStoryLink(button) {
    if (!activeStoryId) return;
    const permalink = storyHref(activeStoryId);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(permalink);
      button.textContent = "Enlace copiado";
    } catch {
      const helper = document.createElement("textarea");
      helper.value = permalink;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.append(helper);
      helper.select();
      const copied = document.execCommand("copy");
      helper.remove();
      button.textContent = copied ? "Enlace copiado" : "No se pudo copiar";
    }
    clearTimeout(copyFeedbackTimer);
    copyFeedbackTimer = setTimeout(() => {
      button.textContent = "Copiar enlace";
    }, 2400);
  }

  document.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-menu-toggle]");
    if (toggle) {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
      return;
    }
    if (event.target.closest("#primary-nav a")) setMenu(false);
    const yearButton = event.target.closest("[data-year]");
    if (yearButton) {
      state.year = yearButton.dataset.year;
      applyFilters();
      syncFilterUrl();
      return;
    }
    const themeButton = event.target.closest("[data-theme]");
    if (themeButton) {
      state.theme = themeButton.dataset.theme;
      applyFilters();
      syncFilterUrl();
      return;
    }
    const seasonButton = event.target.closest("[data-season]");
    if (seasonButton) {
      event.preventDefault();
      state.year = seasonButton.dataset.season;
      state.theme = "all";
      applyFilters();
      syncFilterUrl();
      byId("archivo").scrollIntoView({ behavior: "smooth" });
      return;
    }
    const routeButton = event.target.closest("[data-route-theme]");
    if (routeButton) {
      state.year = "all";
      state.theme = routeButton.dataset.routeTheme;
      applyFilters();
      syncFilterUrl();
      byId("archivo").scrollIntoView({ behavior: "smooth" });
      return;
    }
    const storyButton = event.target.closest("[data-open-story]");
    if (storyButton) {
      event.preventDefault();
      openStory(storyButton.dataset.openStory, storyButton);
      return;
    }
    const pdfButton = event.target.closest("[data-open-pdf]");
    if (pdfButton && window.matchMedia("(min-width: 761px)").matches) {
      event.preventDefault();
      openPdfReader(pdfButton);
      return;
    }
    const copyButton = event.target.closest("#dialog-permalink");
    if (copyButton) {
      copyStoryLink(copyButton);
      return;
    }
    if (event.target.closest("[data-close-dialog]")) closeStory();
    if (event.target.closest("[data-close-pdf]")) closePdfReader();
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeStory();
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeStory();
  });
  pdfDialog.addEventListener("click", (event) => {
    if (event.target === pdfDialog) closePdfReader();
  });
  pdfDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closePdfReader();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && siteHeader.classList.contains("menu-open")) {
      setMenu(false);
      menuToggle.focus();
    }
  });

  window.matchMedia("(min-width: 1051px)").addEventListener("change", (event) => {
    if (event.matches) setMenu(false);
  });

  renderHero();
  renderProject();
  renderSeasons();
  renderFilters();
  applyFilters();
  if (validStories.has(requestedStory)) openStory(requestedStory, null, false);
})();
