(() => {
  const data = window.HISTORIAS_DATA;
  if (!data) return;

  const requestedYear = new URLSearchParams(window.location.search).get("temporada");
  const validYears = new Set(data.seasons.map((season) => String(season.year)));
  const state = { year: validYears.has(requestedYear) ? requestedYear : "all", theme: "all" };
  const byId = (id) => document.getElementById(id);
  const storyGrid = byId("story-grid");
  const dialog = byId("story-dialog");
  let dialogTrigger = null;

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const themeLabel = (id) => data.themes.find((theme) => theme.id === id)?.label || id;
  const seasonFor = (year) => data.seasons.find((season) => season.year === year);

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
          <div class="season-topline"><span>${escapeHtml(season.eyebrow)}</span><b>${count} historias</b></div>
          <p class="season-year">${season.year}</p>
          <h3>${escapeHtml(season.title)}</h3>
          <p>${escapeHtml(season.description)}</p>
          <div class="season-key"><span>${status}</span><p>${escapeHtml(season.editorial_key)}</p></div>
          <a href="?temporada=${season.year}#archivo" data-season="${season.year}">Explorar ${season.year}</a>
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
    storyGrid.innerHTML = stories.map((story) => `
      <article class="story-card" data-story-id="${story.id}">
        <div class="story-image">
          ${story.image ? `<img src="${escapeHtml(story.image)}" alt="Ilustración de ${escapeHtml(story.title)}" loading="lazy">` : `<span>${story.year}</span>`}
          <p>${story.year} / ${String(story.order).padStart(2, "0")}</p>
        </div>
        <div class="story-content">
          <p class="story-model">estrategIA #${story.issue} · ${escapeHtml(story.model)}</p>
          <h3>${escapeHtml(story.title)}</h3>
          <p class="story-premise">${escapeHtml(story.premise)}</p>
          <div class="story-tags">${story.themes.map((theme) => `<span>${escapeHtml(themeLabel(theme))}</span>`).join("")}</div>
          <button type="button" data-open-story="${story.id}">Abrir ficha <span aria-hidden="true">↗</span></button>
        </div>
      </article>
    `).join("");
  }

  function applyFilters() {
    renderFilters();
    renderStories();
  }

  function syncSeasonUrl() {
    const nextUrl = new URL(window.location.href);
    if (state.year === "all") nextUrl.searchParams.delete("temporada");
    else nextUrl.searchParams.set("temporada", state.year);
    nextUrl.hash = "archivo";
    window.history.replaceState({}, "", nextUrl);
  }

  function openStory(storyId, trigger) {
    const story = data.stories.find((item) => item.id === storyId);
    if (!story) return;
    dialogTrigger = trigger || null;
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
    const images = story.images || [];
    byId("dialog-gallery").innerHTML = images.length
      ? images.map((image, index) => `<img src="${escapeHtml(image)}" alt="Ilustración ${index + 1} de ${escapeHtml(story.title)}" loading="lazy">`).join("")
      : `<div class="dialog-placeholder"><span>${story.year}</span></div>`;
    dialog.showModal();
    document.body.classList.add("dialog-open");
  }

  function closeStory() {
    dialog.close();
    document.body.classList.remove("dialog-open");
    dialogTrigger?.focus();
  }

  document.addEventListener("click", (event) => {
    const yearButton = event.target.closest("[data-year]");
    if (yearButton) {
      state.year = yearButton.dataset.year;
      applyFilters();
      syncSeasonUrl();
      return;
    }
    const themeButton = event.target.closest("[data-theme]");
    if (themeButton) {
      state.theme = themeButton.dataset.theme;
      applyFilters();
      return;
    }
    const seasonButton = event.target.closest("[data-season]");
    if (seasonButton) {
      event.preventDefault();
      state.year = seasonButton.dataset.season;
      state.theme = "all";
      applyFilters();
      syncSeasonUrl();
      byId("archivo").scrollIntoView({ behavior: "smooth" });
      return;
    }
    const routeButton = event.target.closest("[data-route-theme]");
    if (routeButton) {
      state.year = "all";
      state.theme = routeButton.dataset.routeTheme;
      applyFilters();
      syncSeasonUrl();
      byId("archivo").scrollIntoView({ behavior: "smooth" });
      return;
    }
    const storyButton = event.target.closest("[data-open-story]");
    if (storyButton) {
      openStory(storyButton.dataset.openStory, storyButton);
      return;
    }
    if (event.target.closest("[data-close-dialog]")) closeStory();
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeStory();
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeStory();
  });

  renderHero();
  renderProject();
  renderSeasons();
  applyFilters();
})();
