(function () {
  const STORAGE_KEY = "cn_theme";
  const SEARCH_INDEX_CACHE_KEY = "cn_search_index_v1";
  const SEARCH_PAGES = [
    "index.html",
    "inicio.html",
    "quimica.html",
    "quimica_estados.html",
    "quimica_propiedades.html",
    "fisica.html",
    "biologia.html",
    "quimica_t1_materia_propiedades.html",
    "quimica_t2_estados_cambios.html",
    "quimica_t3_modelo_corpuscular.html",
    "quimica_t4_sistemas_materiales.html",
    "quimica_t5_mezclas.html",
    "quimica_t6_soluciones.html",
    "quimica_t7_metodos_separacion.html",
    "fisica_t1_movimientos.html",
    "fisica_t2_tierra_universo.html",
    "fisica_t3_energia.html",
    "fisica_t4_ondulatorios.html",
    "biologia_t1_vida_unidad_diversidad.html",
    "biologia_t2_relaciones_troficas.html",
    "biologia_t3_organismos_microscopicos.html",
    "biologia_t4_plantas.html",
    "biologia_t5_animales.html",
    "biologia_t6_hongos.html",
    "biologia_t7_cuerpo_humano.html",
    "biologia_t8_esi_alimentacion.html"
  ];

  const root = document.documentElement;
  const toggle = document.getElementById("theme-toggle");
  const HOME_PAGE = "inicio.html";
  const WEATHER_CACHE_KEY = "cn_weather_ba_malvinas_v1";
  const WEATHER_CACHE_TTL_MS = 20 * 60 * 1000;
  const WEATHER_ENDPOINT =
    "https://api.open-meteo.com/v1/forecast?latitude=-34.5208&longitude=-58.7006&current=temperature_2m,weather_code,is_day&timezone=America%2FArgentina%2FBuenos_Aires";

  function normalizeText(text) {
    return (text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function fixMojibake(text) {
    const value = String(text || "");
    if (!/[ÃÂ�]/.test(value)) return value;

    try {
      return decodeURIComponent(escape(value));
    } catch (error) {
      return value;
    }
  }

  function slugify(text) {
    return normalizeText(text)
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function ensureHeadingAnchors(scope) {
    const used = new Set();
    const headings = (scope || document).querySelectorAll("main h2, main h3, main h4");

    headings.forEach(function (heading) {
      if (heading.id) {
        used.add(heading.id);
        return;
      }

      const base = slugify(heading.textContent || "seccion") || "seccion";
      let id = base;
      let count = 2;
      while (used.has(id) || document.getElementById(id)) {
        id = base + "-" + count;
        count += 1;
      }
      heading.id = id;
      used.add(id);
    });
  }

  function applyTheme(theme) {
    const current = theme === "dark" ? "dark" : "light";
    root.setAttribute("data-theme", current);
    if (toggle) {
      const dark = current === "dark";
      toggle.setAttribute("aria-pressed", String(dark));
      toggle.textContent = dark ? "Modo claro" : "Modo oscuro";
    }
  }

  function describeWeather(code, isDay) {
    const dayIcon = isDay ? "☀️" : "🌙";
    if (code === 0) return { icon: dayIcon, label: isDay ? "Despejado" : "Cielo despejado" };
    if (code === 1 || code === 2) return { icon: "⛅", label: "Parcialmente nublado" };
    if (code === 3) return { icon: "☁️", label: "Nublado" };
    if (code === 45 || code === 48) return { icon: "🌫️", label: "Niebla" };
    if ([51, 53, 55, 56, 57].includes(code)) return { icon: "🌦️", label: "Llovizna" };
    if ([61, 63, 65, 66, 67].includes(code)) return { icon: "🌧️", label: "Lluvia" };
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: "❄️", label: "Nieve" };
    if ([80, 81, 82].includes(code)) return { icon: "🌦️", label: "Chaparrones" };
    if ([95, 96, 99].includes(code)) return { icon: "⛈️", label: "Tormenta" };
    return { icon: "🌤️", label: "Condición variable" };
  }

  function createWeatherWidgetUI() {
    const headerInner = document.querySelector(".header-inner");
    if (!headerInner) return null;

    let widget = document.getElementById("weather-widget");
    if (!widget) {
      widget = document.createElement("div");
      widget.id = "weather-widget";
      widget.className = "weather-widget";
      widget.setAttribute("role", "status");
      widget.setAttribute("aria-live", "polite");
      widget.innerHTML =
        '<span class="weather-icon" aria-hidden="true">🛰️</span>' +
        '<div class="weather-text">' +
        '<p class="weather-line"><strong>Malvinas Argentinas, BA</strong></p>' +
        '<p class="weather-line weather-loading">Cargando clima...</p>' +
        "</div>";

      const toggleButton = headerInner.querySelector("#theme-toggle");
      if (toggleButton) {
        headerInner.insertBefore(widget, toggleButton);
      } else {
        headerInner.appendChild(widget);
      }
    }

    return widget;
  }

  function renderWeather(widget, data) {
    if (!widget) return;

    const iconNode = widget.querySelector(".weather-icon");
    const loadingNode = widget.querySelector(".weather-loading");
    const textWrap = widget.querySelector(".weather-text");
    if (!iconNode || !loadingNode || !textWrap) return;

    if (!data) {
      iconNode.textContent = "🌡️";
      loadingNode.textContent = "Clima no disponible";
      return;
    }

    const weather = describeWeather(data.weather_code, data.is_day === 1);
    const temp = typeof data.temperature_2m === "number" ? Math.round(data.temperature_2m) : "--";
    iconNode.textContent = weather.icon;
    loadingNode.textContent = weather.label + " · " + temp + "°C · 🌡️";
    widget.setAttribute("aria-label", "Clima actual en Malvinas Argentinas: " + weather.label + ", " + temp + " grados");
  }

  function readWeatherCache() {
    try {
      const raw = localStorage.getItem(WEATHER_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.ts || !parsed.data) return null;
      if (Date.now() - parsed.ts > WEATHER_CACHE_TTL_MS) return null;
      return parsed.data;
    } catch (error) {
      return null;
    }
  }

  function writeWeatherCache(data) {
    try {
      localStorage.setItem(
        WEATHER_CACHE_KEY,
        JSON.stringify({
          ts: Date.now(),
          data: data
        })
      );
    } catch (error) {
      // Si cache falla, no bloqueamos el render.
    }
  }

  async function loadWeatherWidget() {
    const widget = createWeatherWidgetUI();
    if (!widget) return;

    const cached = readWeatherCache();
    if (cached) {
      renderWeather(widget, cached);
    }

    try {
      const response = await fetch(WEATHER_ENDPOINT, { method: "GET" });
      if (!response.ok) {
        if (!cached) renderWeather(widget, null);
        return;
      }

      const payload = await response.json();
      const current = payload && payload.current ? payload.current : null;
      if (!current) {
        if (!cached) renderWeather(widget, null);
        return;
      }

      writeWeatherCache(current);
      renderWeather(widget, current);
    } catch (error) {
      if (!cached) renderWeather(widget, null);
    }
  }

  function buildBreadcrumbs() {
    const breadcrumbNode = document.getElementById("breadcrumbs");
    if (!breadcrumbNode) return;

    const page = document.body.getAttribute("data-page") || "Inicio";
    const section = document.body.getAttribute("data-section");
    const sectionHref = document.body.getAttribute("data-section-href") || "";
    const crumbs = [{ label: "Inicio", href: HOME_PAGE }];

    if (section) {
      crumbs.push({ label: section, href: sectionHref });
    }
    crumbs.push({ label: page, href: "" });

    const ol = document.createElement("ol");
    crumbs.forEach(function (crumb, index) {
      const li = document.createElement("li");
      if (index < crumbs.length - 1) {
        const a = document.createElement("a");
        a.href = crumb.href;
        a.textContent = crumb.label;
        li.appendChild(a);
      } else {
        const span = document.createElement("span");
        span.setAttribute("aria-current", "page");
        span.textContent = crumb.label;
        li.appendChild(span);
      }
      ol.appendChild(li);
    });

    breadcrumbNode.innerHTML = "";
    breadcrumbNode.appendChild(ol);
  }

  function initSwitchers() {
    const switchers = document.querySelectorAll("[data-switcher]");
    switchers.forEach(function (switcher) {
      const buttons = switcher.querySelectorAll("[data-target]");
      const panels = switcher.querySelectorAll("[data-panel]");
      const status = switcher.querySelector("[data-status]");

      function showPanel(panelId) {
        panels.forEach(function (panel) {
          panel.setAttribute("visibility", panel.getAttribute("data-panel") === panelId ? "visible" : "hidden");
        });

        buttons.forEach(function (button) {
          const selected = button.getAttribute("data-target") === panelId;
          button.setAttribute("aria-pressed", String(selected));
        });

        if (status) {
          const sourceButton = switcher.querySelector('[data-target="' + panelId + '"]');
          status.textContent = sourceButton ? sourceButton.getAttribute("data-description") || "" : "";
        }
      }

      buttons.forEach(function (button) {
        button.addEventListener("click", function () {
          showPanel(button.getAttribute("data-target"));
        });
      });

      const initial = switcher.getAttribute("data-initial");
      if (initial) {
        showPanel(initial);
      } else if (buttons.length > 0) {
        showPanel(buttons[0].getAttribute("data-target"));
      }
    });
  }

  function createSearchUI() {
    const header = document.querySelector(".site-header");
    if (!header) return null;

    const container = document.createElement("section");
    container.className = "site-search";
    container.innerHTML =
      '<div class="container site-search-inner">' +
      '<label for="topic-search" class="site-search-label">Buscar tema o concepto</label>' +
      '<input id="topic-search" class="site-search-input" type="search" autocomplete="off" placeholder="Ej: energia, celula, mezcla..." aria-describedby="search-help">' +
      '<p id="search-help" class="site-search-help">Escribi una palabra y selecciona un resultado.</p>' +
      '<div id="search-results" class="search-results" hidden aria-live="polite"></div>' +
      "</div>";

    const nav = header.querySelector(".main-nav");
    if (nav && nav.parentNode) {
      nav.parentNode.insertBefore(container, nav.nextSibling);
    } else {
      header.appendChild(container);
    }

    return {
      input: container.querySelector("#topic-search"),
      results: container.querySelector("#search-results")
    };
  }

  function parseIndexFromHtml(html, file) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const body = doc.body;
    const section = fixMojibake(body ? body.getAttribute("data-section") || "" : "");
    const page = fixMojibake(body ? body.getAttribute("data-page") || "" : "");
    const pageTitle = fixMojibake(page || (doc.title ? doc.title.replace(/\s*\|.*/, "") : file));
    const entries = [];
    const seenIds = new Set();

    entries.push({
      label: pageTitle,
      page: file,
      anchor: "",
      section: section,
      pageTitle: pageTitle,
      type: "page"
    });

    const headings = doc.querySelectorAll("main h2, main h3, main h4");
    headings.forEach(function (heading) {
      const label = fixMojibake((heading.textContent || "").trim());
      if (!label) return;

      const baseId = slugify(label) || "seccion";
      let anchor = baseId;
      let count = 2;
      while (seenIds.has(anchor)) {
        anchor = baseId + "-" + count;
        count += 1;
      }
      seenIds.add(anchor);

      entries.push({
        label: label,
        page: file,
        anchor: anchor,
        section: section,
        pageTitle: pageTitle,
        type: "heading"
      });
    });

    return entries;
  }

  async function buildSearchIndex() {
    try {
      const cached = sessionStorage.getItem(SEARCH_INDEX_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      // si falla cache, seguimos con indexado en vivo
    }

    const allEntries = [];
    for (const file of SEARCH_PAGES) {
      try {
        const response = await fetch(file);
        if (!response.ok) continue;
        const html = await response.text();
        allEntries.push.apply(allEntries, parseIndexFromHtml(html, file));
      } catch (error) {
        // en file:// puede fallar fetch; seguimos con lo disponible
      }
    }

    if (allEntries.length > 0) {
      try {
        sessionStorage.setItem(SEARCH_INDEX_CACHE_KEY, JSON.stringify(allEntries));
      } catch (error) {
        // no bloqueamos la UI si cache no puede guardarse
      }
    }

    return allEntries;
  }

  function scoreEntry(entry, query) {
    const q = normalizeText(query);
    if (!q) return -1;

    const label = normalizeText(entry.label);
    const pageTitle = normalizeText(entry.pageTitle);
    const section = normalizeText(entry.section);
    let score = 0;

    if (label.startsWith(q)) score += 80;
    else if (label.includes(q)) score += 55;

    if (pageTitle.includes(q)) score += 20;
    if (section.includes(q)) score += 10;
    if (entry.type === "heading") score += 8;

    return score;
  }

  function initTopicSearch() {
    ensureHeadingAnchors(document);

    const ui = createSearchUI();
    if (!ui || !ui.input || !ui.results) return;

    let index = [];
    buildSearchIndex().then(function (entries) {
      index = entries || [];
    });

    function renderResults(matches) {
      ui.results.innerHTML = "";

      if (!matches.length) {
        const empty = document.createElement("p");
        empty.className = "search-empty";
        empty.textContent = "No encontramos resultados para esa busqueda.";
        ui.results.appendChild(empty);
        ui.results.hidden = false;
        return;
      }

      const list = document.createElement("ul");
      list.className = "search-results-list";

      matches.forEach(function (item) {
        const li = document.createElement("li");
        const link = document.createElement("a");
        link.className = "search-result-link";
        link.href = item.page + (item.anchor ? "#" + item.anchor : "");

        const title = document.createElement("span");
        title.className = "search-result-title";
        title.textContent = item.label;

        const meta = document.createElement("span");
        meta.className = "search-result-meta";
        meta.textContent = (item.section ? item.section + " · " : "") + item.pageTitle;

        link.appendChild(title);
        link.appendChild(meta);
        li.appendChild(link);
        list.appendChild(li);
      });

      ui.results.appendChild(list);
      ui.results.hidden = false;
    }

    function search(query) {
      const q = normalizeText(query);
      if (!q || q.length < 2) {
        ui.results.hidden = true;
        ui.results.innerHTML = "";
        return;
      }

      const matches = index
        .map(function (entry) {
          return { entry: entry, score: scoreEntry(entry, q) };
        })
        .filter(function (row) {
          return row.score > 0;
        })
        .sort(function (a, b) {
          return b.score - a.score;
        })
        .slice(0, 12)
        .map(function (row) {
          return row.entry;
        });

      renderResults(matches);
    }

    ui.input.addEventListener("input", function () {
      search(ui.input.value);
    });

    ui.input.addEventListener("focus", function () {
      if (ui.input.value.trim().length >= 2) {
        search(ui.input.value);
      }
    });

    document.addEventListener("click", function (event) {
      if (!event.target.closest(".site-search")) {
        ui.results.hidden = true;
      }
    });
  }

  function highlightKeywords() {
    const keywords = {
      importante: "keyword-important",
      atencion: "keyword-important",
      ejemplo: "keyword-example",
      experimento: "keyword-experiment",
      pregunta: "keyword-question"
    };

    const activities = document.querySelectorAll(".activity");
    activities.forEach(function (activity) {
      let html = activity.innerHTML;
      for (const keyword in keywords) {
        const regex = new RegExp("\\b" + keyword + "\\b", "gi");
        html = html.replace(regex, function (match) {
          return '<mark class="' + keywords[keyword] + '">' + match + "</mark>";
        });
      }
      activity.innerHTML = html;
    });
  }

  function addReadingTime() {
    const article = document.querySelector("main");
    if (!article) return;

    const text = article.textContent || "";
    const wordsPerMinute = 200;
    const wordCount = text.trim().split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);

    const hero = document.querySelector(".hero");
    if (hero && readingTime > 0) {
      const timeIndicator = document.createElement("p");
      timeIndicator.style.cssText = "font-size: 0.9rem; color: var(--muted); margin-top: 0.5rem;";
      timeIndicator.innerHTML =
        "Tiempo de lectura estimado: <strong>" + readingTime + " minuto" + (readingTime > 1 ? "s" : "") + "</strong>";
      hero.appendChild(timeIndicator);
    }
  }

  function addScrollToTop() {
    const scrollButton = document.createElement("button");
    scrollButton.innerHTML = "Volver arriba";
    scrollButton.className = "scroll-to-top";
    scrollButton.style.cssText =
      "position: fixed; bottom: 2rem; right: 2rem; padding: 0.75rem 1rem; background: var(--primary); color: white; border: none; border-radius: 2rem; cursor: pointer; opacity: 0; transition: opacity 0.3s; z-index: 1000; box-shadow: var(--shadow); font-weight: bold;";
    scrollButton.setAttribute("aria-label", "Volver al inicio de la pagina");
    document.body.appendChild(scrollButton);

    window.addEventListener("scroll", function () {
      scrollButton.style.opacity = window.scrollY > 500 ? "1" : "0";
    });

    scrollButton.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function observeCards() {
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
            setTimeout(function () {
              entry.target.style.transform = "";
            }, 620);
          }
        });
      },
      { threshold: 0.1 }
    );

    const panels = document.querySelectorAll(".panel, .card, .topic-card");
    panels.forEach(function (panel) {
      // Evita que el transform inline del observer pise el hover de las 3 cards del inicio.
      if (panel.classList.contains("card") && panel.parentElement && panel.parentElement.classList.contains("cards")) {
        return;
      }

      panel.style.opacity = "0";
      panel.style.transform = "translateY(20px)";
      panel.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      observer.observe(panel);
    });
  }

  function addTooltips() {
    const terms = {
      fotosintesis: "Proceso por el cual las plantas producen su propio alimento usando luz solar, agua y CO2.",
      homeostasis: "Capacidad de mantener condiciones internas estables.",
      adn: "Acido desoxirribonucleico: molecula que contiene la informacion genetica.",
      energia: "Capacidad de producir cambios, realizar trabajo o generar movimiento.",
      celula: "Unidad basica de la vida.",
      autotrofo: "Organismo que produce su propio alimento.",
      heterotrofo: "Organismo que obtiene energia consumiendo otros seres vivos."
    };

    const content = document.querySelector("main");
    if (!content) return;

    for (const term in terms) {
      const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null, false);
      let replaced = false;

      while (walker.nextNode()) {
        const node = walker.currentNode;
        const parent = node.parentElement;
        if (!parent || parent.tagName === "SCRIPT" || parent.tagName === "STYLE" || parent.hasAttribute("title")) continue;

        const original = node.textContent || "";
        const plain = normalizeText(original);
        const termRegex = new RegExp("\\b" + term + "\\b", "i");

        if (!replaced && termRegex.test(plain)) {
          const match = original.match(termRegex);
          if (!match) continue;

          const span = document.createElement("span");
          span.innerHTML = original.replace(
            termRegex,
            '<abbr title="' + terms[term] + '" style="text-decoration: underline dotted; cursor: help;">$&</abbr>'
          );
          parent.replaceChild(span, node);
          replaced = true;
        }
      }
    }
  }

  function applyFooterBranding() {
    const footer = document.querySelector(".site-footer");
    if (!footer) return;

    let textNode = footer.querySelector("p");
    if (!textNode) {
      const container = footer.querySelector(".container") || footer;
      textNode = document.createElement("p");
      container.appendChild(textNode);
    }

    textNode.textContent = "Ciencias Naturales, Profesor Javier Pereyra";
  }

  const savedTheme = localStorage.getItem(STORAGE_KEY);
  applyTheme(savedTheme || "light");

  if (toggle) {
    toggle.addEventListener("click", function () {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
    });
  }

  function initAll() {
    loadWeatherWidget();
    buildBreadcrumbs();
    initSwitchers();
    initTopicSearch();
    applyFooterBranding();
    addReadingTime();
    addScrollToTop();
    observeCards();
    addTooltips();
    highlightKeywords();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
