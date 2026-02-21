(function () {
  const STORAGE_KEY = "cn_theme";
  const SEARCH_INDEX_CACHE_KEY = "cn_search_index_v1";
  const SEARCH_PAGES = [
    "index.html",
    "inicio.html",
    "quiz.html",
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

  function ensureQuizNavLink() {
    const nav = document.querySelector(".main-nav");
    if (!nav) return;

    let quizLink = nav.querySelector('a[href="quiz.html"]');
    if (!quizLink) {
      quizLink = document.createElement("a");
      quizLink.href = "quiz.html";
      quizLink.textContent = "Quiz";
      nav.appendChild(quizLink);
    }

    if ((document.body.getAttribute("data-page") || "") === "Quiz") {
      quizLink.setAttribute("aria-current", "page");
    }
  }

  const QUIZ_TOPICS = [
    { area: "Química", topic: "La materia y sus propiedades", question: "¿Cuál es una propiedad física?", options: ["Inflamabilidad", "Masa", "Oxidación", "Combustión"], correct: 1, feedback: "La masa se mide sin cambiar la composición de la sustancia." },
    { area: "Química", topic: "Estados y cambios de estado", question: "¿Qué cambio ocurre de líquido a gas?", options: ["Fusión", "Solidificación", "Evaporación", "Condensación"], correct: 2, feedback: "Evaporación es el paso de líquido a estado gaseoso." },
    { area: "Química", topic: "Modelo corpuscular", question: "Según el modelo corpuscular, si aumenta la temperatura las partículas:", options: ["Se detienen", "Se mueven más", "Desaparecen", "Se vuelven sólidas"], correct: 1, feedback: "A mayor energía térmica, mayor agitación de partículas." },
    { area: "Química", topic: "Sistemas materiales", question: "Un sistema con una sola fase visible es:", options: ["Heterogéneo", "Homogéneo", "Compuesto", "Inestable"], correct: 1, feedback: "Homogéneo: no se distinguen fases a simple vista." },
    { area: "Química", topic: "Mezclas homogéneas y heterogéneas", question: "Agua y aceite forman una mezcla:", options: ["Homogénea", "Saturada", "Heterogénea", "Simple"], correct: 2, feedback: "Se observan dos fases, por eso es heterogénea." },
    { area: "Química", topic: "Soluciones", question: "En una solución, la sustancia que disuelve es:", options: ["Soluto", "Solvente", "Fase", "Componente insoluble"], correct: 1, feedback: "El solvente disuelve al soluto." },
    { area: "Química", topic: "Métodos de separación", question: "Para separar arena del agua conviene usar:", options: ["Filtración", "Imantación", "Destilación", "Tamización"], correct: 0, feedback: "Filtración separa sólidos insolubles de líquidos." },

    { area: "Física", topic: "Los movimientos", question: "La velocidad es una magnitud:", options: ["Escalar", "Vectorial", "Sin unidad", "Constante siempre"], correct: 1, feedback: "Tiene módulo, dirección y sentido." },
    { area: "Física", topic: "La Tierra y el Universo", question: "El modelo heliocéntrico propone que:", options: ["La Tierra es el centro", "El Sol es el centro del Sistema Solar", "La Luna es el centro", "No hay órbitas"], correct: 1, feedback: "Heliocéntrico: el Sol ocupa el centro del sistema." },
    { area: "Física", topic: "Energía Mecánica", question: "La energía mecánica es la suma de:", options: ["Térmica + eléctrica", "Cinética + potencial", "Nuclear + química", "Luminosa + sonora"], correct: 1, feedback: "Mecánica = energía cinética + energía potencial." },
    { area: "Física", topic: "Calor y Temperatura", question: "El calor se define como:", options: ["Cantidad de masa", "Temperatura de un cuerpo", "Transferencia de energía térmica", "Tipo de fuerza"], correct: 2, feedback: "Calor es energía que se transfiere por diferencia de temperatura." },
    { area: "Física", topic: "Electricidad y Magnetismo", question: "La corriente eléctrica es:", options: ["Movimiento de cargas", "Movimiento de masas", "Ausencia de energía", "Tipo de luz"], correct: 0, feedback: "Corriente: flujo ordenado de cargas eléctricas." },
    { area: "Física", topic: "Circuitos Eléctricos", question: "En un circuito en serie:", options: ["Hay varios caminos para la corriente", "Si se corta un componente se interrumpe todo", "No hay resistencias", "La corriente no circula"], correct: 1, feedback: "En serie hay un único camino para la corriente." },
    { area: "Física", topic: "Fenómenos ondulatorios", question: "Una onda transporta:", options: ["Materia", "Solo temperatura", "Energía sin transportar materia", "Electrones siempre"], correct: 2, feedback: "Las ondas propagan energía sin traslado neto de materia." },

    { area: "Biología", topic: "La vida: unidad y diversidad", question: "La unidad básica de los seres vivos es:", options: ["Tejido", "Órgano", "Célula", "Sistema"], correct: 2, feedback: "La célula es la unidad estructural y funcional de la vida." },
    { area: "Biología", topic: "Relaciones tróficas", question: "En una cadena trófica, los productores son:", options: ["Heterótrofos", "Autótrofos", "Descomponedores", "Consumidores secundarios"], correct: 1, feedback: "Productores: organismos que elaboran su propio alimento." },
    { area: "Biología", topic: "Organismos microscópicos", question: "Las bacterias son organismos:", options: ["Pluricelulares", "Procariotas", "Animales", "Hongos"], correct: 1, feedback: "Las bacterias son procariotas y en general unicelulares." },
    { area: "Biología", topic: "Plantas autótrofas", question: "La fotosíntesis ocurre principalmente en:", options: ["Raíces", "Hojas", "Flores", "Semillas"], correct: 1, feedback: "Las hojas contienen clorofila para la fotosíntesis." },
    { area: "Biología", topic: "Animales heterótrofos", question: "Los animales obtienen su energía:", options: ["Por fotosíntesis", "Por ingestión de alimento", "Por absorción como hongos", "Del suelo directamente"], correct: 1, feedback: "Los animales son heterótrofos por ingestión." },
    { area: "Biología", topic: "Hongos heterótrofos", question: "Los hongos se nutren principalmente por:", options: ["Ingestión", "Fotosíntesis", "Absorción", "Respiración"], correct: 2, feedback: "Los hongos son heterótrofos por absorción." },
    { area: "Biología", topic: "Cuerpo humano como sistema", question: "El cuerpo humano se estudia como:", options: ["Sistema integrado", "Órganos aislados", "Mezcla homogénea", "Red eléctrica"], correct: 0, feedback: "Los sistemas corporales trabajan coordinadamente." },
    { area: "Biología", topic: "ESI: alimentación saludable", question: "Las calorías vacías aportan:", options: ["Muchas vitaminas y minerales", "Energía con bajo valor nutricional", "Proteínas completas siempre", "Solo agua"], correct: 1, feedback: "Aportan energía pero pocos nutrientes esenciales." }
  ];
  const QUIZ_PROGRESS_KEY = "cn_quiz_progress_v1";
  const QUIZ_STUDENT_KEY = "cn_quiz_student_v1";
  const QUIZ_LEADERBOARD_KEY = "cn_quiz_leaderboard_v1";
  const QUIZ_ACTIVITY_LOG_KEY = "cn_quiz_activity_log_v1";
  const QUIZ_POINTS_PER_TOPIC = 10;
  const QUIZ_CERT_MIN_POINTS = 150;

  function buildQuizQuestion(topicConfig) {
    const optionsHtml = topicConfig.options.map(function (option, index) {
      return '<button class="quiz-option" type="button" data-option-index="' + index + '">' + escapeHtml(option) + "</button>";
    }).join("");

    return (
      '<div class="quiz-question-card">' +
      '<p class="quiz-label">' + escapeHtml(topicConfig.area) + " · " + escapeHtml(topicConfig.topic) + "</p>" +
      "<h3>" + escapeHtml(topicConfig.question) + "</h3>" +
      '<div class="quiz-options">' + optionsHtml + "</div>" +
      '<p class="quiz-feedback" aria-live="polite"></p>' +
      "</div>"
    );
  }

  function initQuizPage() {
    if ((document.body.getAttribute("data-page") || "") !== "Quiz") return;

    const mount = document.getElementById("quiz-app");
    if (!mount) return;

    const selector = document.getElementById("quiz-topic-select");
    if (!selector) return;

    const scorePoints = document.getElementById("quiz-score-points");
    const scoreHits = document.getElementById("quiz-score-hits");
    const scoreAttempts = document.getElementById("quiz-score-attempts");
    const scoreReward = document.getElementById("quiz-score-reward");
    const scoreMeta = document.getElementById("quiz-score-meta");
    const nextButton = document.getElementById("quiz-next-topic");
    const resetButton = document.getElementById("quiz-reset-progress");
    const certButton = document.getElementById("quiz-generate-certificate");
    const certStatus = document.getElementById("quiz-certificate-status");
    const certPreviewName = document.getElementById("quiz-cert-name");
    const certPreviewCourse = document.getElementById("quiz-cert-course");
    const certPreviewSchool = document.getElementById("quiz-cert-school");
    const certPreviewReward = document.getElementById("quiz-cert-reward");
    const certPreviewPoints = document.getElementById("quiz-cert-points");
    const studentNameInput = document.getElementById("quiz-student-name");
    const studentSurnameInput = document.getElementById("quiz-student-surname");
    const studentCourseInput = document.getElementById("quiz-student-course");
    const studentSchoolInput = document.getElementById("quiz-student-school");
    const leaderboardMount = document.getElementById("quiz-leaderboard");
    const leaderboardButton = document.getElementById("quiz-save-leaderboard");
    const clearStudentButton = document.getElementById("quiz-clear-student");
    const activityLogMount = document.getElementById("quiz-activity-log");
    const clearLogButton = document.getElementById("quiz-clear-log");

    function readProgress() {
      try {
        const raw = localStorage.getItem(QUIZ_PROGRESS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        return parsed;
      } catch (error) {
        return null;
      }
    }

    function readStudent() {
      try {
        const raw = localStorage.getItem(QUIZ_STUDENT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        return parsed;
      } catch (error) {
        return null;
      }
    }

    function writeStudent(student) {
      try {
        localStorage.setItem(QUIZ_STUDENT_KEY, JSON.stringify(student));
      } catch (error) {
        // no bloqueamos la app
      }
    }

    function clearStudentStorage() {
      try {
        localStorage.removeItem(QUIZ_STUDENT_KEY);
      } catch (error) {
        // no bloqueamos
      }
    }

    function readLeaderboard() {
      try {
        const raw = localStorage.getItem(QUIZ_LEADERBOARD_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }

    function writeLeaderboard(entries) {
      try {
        localStorage.setItem(QUIZ_LEADERBOARD_KEY, JSON.stringify(entries || []));
      } catch (error) {
        // no bloqueamos
      }
    }

    function readActivityLog() {
      try {
        const raw = localStorage.getItem(QUIZ_ACTIVITY_LOG_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }

    function writeActivityLog(entries) {
      try {
        localStorage.setItem(QUIZ_ACTIVITY_LOG_KEY, JSON.stringify(entries || []));
      } catch (error) {
        // no bloqueamos
      }
    }

    function defaultProgress() {
      return {
        points: 0,
        hits: 0,
        attempts: 0,
        solved: {}
      };
    }

    let progress = readProgress() || defaultProgress();
    let student = readStudent() || { name: "", surname: "", course: "", school: "" };

    function writeProgress() {
      try {
        localStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(progress));
      } catch (error) {
        // no bloqueamos el quiz si no hay storage
      }
    }

    function getReward(points) {
      if (points >= 220) return "Premio Diamante";
      if (points >= 150) return "Premio Oro";
      if (points >= 90) return "Premio Plata";
      if (points >= 40) return "Premio Bronce";
      return "Sin premio aun";
    }

    function isCertificateUnlocked() {
      return progress.points >= QUIZ_CERT_MIN_POINTS;
    }

    function getStudentFullName() {
      return (String(student.name || "").trim() + " " + String(student.surname || "").trim()).trim();
    }

    function todayText() {
      const today = new Date();
      return today.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
    }

    function nowText() {
      return new Date().toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }

    function pushActivityLog(entry) {
      const previous = readActivityLog();
      const next = [{
        ts: Date.now(),
        dateLabel: nowText(),
        type: entry.type,
        topic: entry.topic || "",
        result: entry.result || "",
        points: Number(entry.points || 0),
        note: entry.note || ""
      }].concat(previous).slice(0, 200);
      writeActivityLog(next);
      renderActivityLog();
    }

    function renderActivityLog() {
      if (!activityLogMount) return;
      const entries = readActivityLog();
      if (!entries.length) {
        activityLogMount.innerHTML = "<p class=\"quiz-meta\">Aun no hay registros. Cuando respondas o emitas certificado, aparecera aqui.</p>";
        return;
      }

      const items = entries.slice(0, 30).map(function (entry) {
        const typeText = entry.type === "certificate" ? "Certificado" : "Intento";
        const badgeClass = entry.result === "correcto" ? "is-correct" : (entry.result === "incorrecto" ? "is-wrong" : "");
        const pointsText = entry.points > 0 ? " · +" + entry.points + " pts" : "";
        return (
          "<li>" +
          "<p><strong>" + escapeHtml(typeText) + "</strong> · " + escapeHtml(entry.dateLabel || "") + "</p>" +
          "<p>" + escapeHtml(entry.topic || entry.note || "") + "</p>" +
          "<p class=\"quiz-log-badge " + badgeClass + "\">" + escapeHtml(entry.result || "registrado") + pointsText + "</p>" +
          "</li>"
        );
      }).join("");

      activityLogMount.innerHTML = "<ol class=\"quiz-log-list\">" + items + "</ol>";
    }

    function renderCertificatePreview() {
      if (certPreviewName) certPreviewName.textContent = getStudentFullName() || "Nombre y apellido";
      if (certPreviewCourse) certPreviewCourse.textContent = String(student.course || "").trim() || "Curso";
      if (certPreviewSchool) certPreviewSchool.textContent = String(student.school || "").trim() || "No informado";
      if (certPreviewReward) certPreviewReward.textContent = getReward(progress.points);
      if (certPreviewPoints) certPreviewPoints.textContent = String(progress.points);
    }

    function renderCertificateControls() {
      const unlocked = isCertificateUnlocked();
      if (certButton) certButton.disabled = !unlocked;
      if (!certStatus) return;
      if (unlocked) {
        certStatus.textContent = "Certificado habilitado. Puedes generarlo en PDF.";
        certStatus.className = "quiz-certificate-status is-correct";
      } else {
        const missing = QUIZ_CERT_MIN_POINTS - progress.points;
        certStatus.textContent = "Faltan " + missing + " puntos para habilitar el certificado (se desbloquea en " + QUIZ_CERT_MIN_POINTS + ").";
        certStatus.className = "quiz-certificate-status is-wrong";
      }
    }

    function medalForPosition(position) {
      if (position === 0) return "🥇 Oro";
      if (position === 1) return "🥈 Plata";
      if (position === 2) return "🥉 Bronce";
      return "";
    }

    function renderLeaderboard() {
      if (!leaderboardMount) return;
      const entries = readLeaderboard()
        .sort(function (a, b) { return Number(b.points || 0) - Number(a.points || 0); })
        .slice(0, 3);

      if (!entries.length) {
        leaderboardMount.innerHTML = "<p class=\"quiz-meta\">Aun no hay puntajes registrados en este dispositivo.</p>";
        return;
      }

      const rows = entries.map(function (entry, index) {
        return (
          "<li>" +
          "<span><strong>" + medalForPosition(index) + "</strong> · " + escapeHtml(entry.name || "Estudiante") + "</span>" +
          "<span>" + escapeHtml(String(entry.course || "Curso")) + " · " + escapeHtml(String(entry.school || "Colegio s/d")) + " · " + escapeHtml(String(entry.points || 0)) + " pts</span>" +
          "</li>"
        );
      }).join("");

      leaderboardMount.innerHTML = "<ol class=\"quiz-leaderboard-list\">" + rows + "</ol>";
    }

    function saveCurrentStudentToLeaderboard() {
      const fullName = getStudentFullName();
      const course = String(student.course || "").trim();
      const school = String(student.school || "").trim();
      if (!fullName || !course) {
        if (certStatus) {
          certStatus.textContent = "Para registrar podio, completa nombre, apellido y curso.";
          certStatus.className = "quiz-certificate-status is-wrong";
        }
        return;
      }

      const entries = readLeaderboard();
      const currentPoints = Number(progress.points || 0);
      const existingIndex = entries.findIndex(function (entry) {
        return normalizeText(entry.name || "") === normalizeText(fullName) &&
          normalizeText(entry.course || "") === normalizeText(course) &&
          normalizeText(entry.school || "") === normalizeText(school);
      });

      if (existingIndex >= 0) {
        const prev = Number(entries[existingIndex].points || 0);
        if (currentPoints >= prev) {
          entries[existingIndex].points = currentPoints;
        }
      } else {
        entries.push({ name: fullName, course: course, school: school, points: currentPoints });
      }

      entries.sort(function (a, b) { return Number(b.points || 0) - Number(a.points || 0); });
      writeLeaderboard(entries.slice(0, 20));
      renderLeaderboard();
      if (certStatus) {
        certStatus.textContent = "Puntaje registrado en el podio local.";
        certStatus.className = "quiz-certificate-status is-correct";
      }
    }

    function clearCurrentStudentData() {
      const previousName = getStudentFullName();
      const previousCourse = String(student.course || "").trim();
      const previousSchool = String(student.school || "").trim();

      if (previousName && previousCourse) {
        const entries = readLeaderboard().filter(function (entry) {
          return !(
            normalizeText(entry.name || "") === normalizeText(previousName) &&
            normalizeText(entry.course || "") === normalizeText(previousCourse) &&
            normalizeText(entry.school || "") === normalizeText(previousSchool)
          );
        });
        writeLeaderboard(entries);
      }

      student = { name: "", surname: "", course: "", school: "" };
      clearStudentStorage();
      preloadStudentInputs();
      renderCertificatePreview();
      renderLeaderboard();

      if (certStatus) {
        certStatus.textContent = "Se borraron tus datos personales y se elimino tu registro del podio local (si existia).";
        certStatus.className = "quiz-certificate-status is-correct";
      }
    }

    function updateStudentFromInputs() {
      student = {
        name: studentNameInput ? studentNameInput.value : "",
        surname: studentSurnameInput ? studentSurnameInput.value : "",
        course: studentCourseInput ? studentCourseInput.value : "",
        school: studentSchoolInput ? studentSchoolInput.value : ""
      };
      writeStudent(student);
      renderCertificatePreview();
    }

    function attachStudentInputHandlers() {
      const inputs = [studentNameInput, studentSurnameInput, studentCourseInput, studentSchoolInput].filter(Boolean);
      inputs.forEach(function (input) {
        input.addEventListener("input", updateStudentFromInputs);
      });
    }

    function preloadStudentInputs() {
      if (studentNameInput) studentNameInput.value = student.name || "";
      if (studentSurnameInput) studentSurnameInput.value = student.surname || "";
      if (studentCourseInput) studentCourseInput.value = student.course || "";
      if (studentSchoolInput) studentSchoolInput.value = student.school || "";
    }

    function openCertificatePrintWindow() {
      const fullName = getStudentFullName();
      const course = String(student.course || "").trim();
      const school = String(student.school || "").trim();
      if (!fullName || !course) {
        if (certStatus) {
          certStatus.textContent = "Completa nombre, apellido y curso para generar el certificado.";
          certStatus.className = "quiz-certificate-status is-wrong";
        }
        return;
      }
      if (!isCertificateUnlocked()) {
        renderCertificateControls();
        return;
      }

      const certHtml =
        "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>Certificado - Ciencias Naturales</title>" +
        "<style>" +
        "body{margin:0;padding:24px;background:#061727;font-family:Georgia,serif;color:#eaf7ff}" +
        ".sheet{max-width:1100px;margin:0 auto;border:2px solid #29d8ff;border-radius:18px;padding:34px;background:linear-gradient(160deg,#0b2238,#0f2f4d 60%,#143f63);box-shadow:0 0 30px rgba(41,216,255,.35)}" +
        ".line{border-top:1px solid rgba(255,255,255,.25);margin:12px 0 22px}" +
        "h1{margin:0;font-size:46px;color:#74e7ff;letter-spacing:.04em;text-align:center;text-shadow:0 0 18px rgba(116,231,255,.55)}" +
        "h2{margin:4px 0 0;text-align:center;font-size:22px;color:#d4f6ff}" +
        ".name{margin:28px 0 8px;text-align:center;font-size:40px;color:#39ff14;text-shadow:0 0 14px rgba(57,255,20,.7)}" +
        ".text{font-size:22px;line-height:1.6;text-align:center}" +
        ".meta{display:flex;justify-content:space-between;gap:20px;margin-top:30px;font-size:18px}" +
        ".pill{border:1px solid #2fd4ff;border-radius:999px;padding:10px 16px;background:rgba(13,34,53,.6)}" +
        ".sig{margin-top:44px;display:flex;justify-content:space-between;font-size:16px;color:#cbeeff}" +
        ".sig div{width:45%;text-align:center;border-top:1px solid rgba(255,255,255,.5);padding-top:8px}" +
        "@media print{body{background:white;color:#0a2032}.sheet{box-shadow:none;break-inside:avoid}}" +
        "</style></head><body>" +
        "<div class=\"sheet\">" +
        "<h1>Certificado de Logro</h1>" +
        "<h2>Ciencias Naturales · 1° año</h2>" +
        "<div class=\"line\"></div>" +
        "<p class=\"text\">Se certifica que</p>" +
        "<p class=\"name\">" + escapeHtml(fullName) + "</p>" +
        "<p class=\"text\">del curso <strong>" + escapeHtml(course) + "</strong>" + (school ? " del <strong>" + escapeHtml(school) + "</strong>" : "") + " obtuvo el nivel <strong>" + escapeHtml(getReward(progress.points)) + "</strong><br>con un acumulado de <strong>" + escapeHtml(String(progress.points)) + " puntos</strong> en el Quiz por temas.</p>" +
        "<div class=\"meta\"><p class=\"pill\">Fecha: " + escapeHtml(todayText()) + "</p><p class=\"pill\">Aciertos: " + escapeHtml(String(progress.hits)) + " / Intentos: " + escapeHtml(String(progress.attempts)) + "</p></div>" +
        "<div class=\"sig\"><div>Firma del docente</div><div>Firma del estudiante</div></div>" +
        "</div></body></html>";

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      printWindow.document.open();
      printWindow.document.write(certHtml);
      printWindow.document.close();
      pushActivityLog({
        type: "certificate",
        topic: "Certificado de logro",
        result: "emitido",
        points: 0,
        note: "Se genero certificado para " + fullName
      });
      setTimeout(function () {
        printWindow.focus();
        printWindow.print();
      }, 250);
    }

    function renderScoreboard() {
      if (scorePoints) scorePoints.textContent = String(progress.points);
      if (scoreHits) scoreHits.textContent = String(progress.hits);
      if (scoreAttempts) scoreAttempts.textContent = String(progress.attempts);
      if (scoreReward) scoreReward.textContent = getReward(progress.points);
      if (scoreMeta) {
        const solvedCount = Object.keys(progress.solved || {}).length;
        scoreMeta.textContent =
          "Temas con puntaje: " + solvedCount + " / " + QUIZ_TOPICS.length + " · " +
          QUIZ_POINTS_PER_TOPIC + " puntos por tema acertado por primera vez.";
      }
      renderCertificatePreview();
      renderCertificateControls();
    }

    function getNextUnsolvedIndex(currentIndex) {
      const total = QUIZ_TOPICS.length;
      for (let offset = 1; offset <= total; offset += 1) {
        const idx = (currentIndex + offset) % total;
        if (!progress.solved[String(idx)]) return idx;
      }
      return (currentIndex + 1) % total;
    }

    selector.innerHTML = QUIZ_TOPICS.map(function (item, index) {
      return '<option value="' + index + '">' + escapeHtml(item.area + " · " + item.topic) + "</option>";
    }).join("");

    let currentTopicIndex = 0;

    function renderTopicByIndex(index) {
      const safeIndex = Number(index);
      const topic = QUIZ_TOPICS[safeIndex];
      if (!topic) return;
      currentTopicIndex = safeIndex;

      mount.innerHTML = buildQuizQuestion(topic);

      const feedback = mount.querySelector(".quiz-feedback");
      const buttons = mount.querySelectorAll(".quiz-option");

      buttons.forEach(function (button) {
        button.addEventListener("click", function () {
          const selected = Number(button.getAttribute("data-option-index"));
          const isCorrect = selected === topic.correct;
          const topicKey = String(safeIndex);
          const alreadySolved = Boolean(progress.solved[topicKey]);
          let earned = 0;

          progress.attempts += 1;
          if (isCorrect) {
            progress.hits += 1;
            if (!alreadySolved) {
              progress.points += QUIZ_POINTS_PER_TOPIC;
              progress.solved[topicKey] = true;
              earned = QUIZ_POINTS_PER_TOPIC;
            }
          }
          writeProgress();
          renderScoreboard();

          buttons.forEach(function (btn) {
            btn.disabled = true;
            const btnIndex = Number(btn.getAttribute("data-option-index"));
            if (btnIndex === topic.correct) {
              btn.classList.add("is-correct");
            }
          });

          if (!isCorrect) {
            button.classList.add("is-wrong");
          }

          if (isCorrect && earned > 0) {
            feedback.textContent = "Correcto. +" + earned + " puntos. " + topic.feedback;
          } else if (isCorrect) {
            feedback.textContent = "Correcto. Este tema ya sumo puntos antes. " + topic.feedback;
          } else {
            feedback.textContent = "Incorrecto. " + topic.feedback;
          }
          feedback.className = "quiz-feedback " + (isCorrect ? "is-correct" : "is-wrong");
          pushActivityLog({
            type: "attempt",
            topic: topic.area + " · " + topic.topic,
            result: isCorrect ? "correcto" : "incorrecto",
            points: earned,
            note: topic.question
          });
        });
      });
    }

    selector.addEventListener("change", function () {
      renderTopicByIndex(selector.value);
    });

    if (nextButton) {
      nextButton.addEventListener("click", function () {
        const next = getNextUnsolvedIndex(currentTopicIndex);
        selector.value = String(next);
        renderTopicByIndex(next);
      });
    }

    if (resetButton) {
      resetButton.addEventListener("click", function () {
        progress = defaultProgress();
        writeProgress();
        renderScoreboard();
        renderTopicByIndex(selector.value);
      });
    }

    if (certButton) {
      certButton.addEventListener("click", openCertificatePrintWindow);
    }
    if (leaderboardButton) {
      leaderboardButton.addEventListener("click", saveCurrentStudentToLeaderboard);
    }
    if (clearStudentButton) {
      clearStudentButton.addEventListener("click", clearCurrentStudentData);
    }
    if (clearLogButton) {
      clearLogButton.addEventListener("click", function () {
        writeActivityLog([]);
        renderActivityLog();
        if (certStatus) {
          certStatus.textContent = "Se limpio el seguimiento local.";
          certStatus.className = "quiz-certificate-status is-correct";
        }
      });
    }

    preloadStudentInputs();
    attachStudentInputHandlers();
    renderScoreboard();
    renderLeaderboard();
    renderActivityLog();
    renderTopicByIndex(0);
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

  const DIDACTIC_ACTIVITY_BANK = {
    "Materia y propiedades": {
      intro:
        "Trabaja con las ideas centrales de materia, propiedades organolepticas, propiedades fisicas y propiedades quimicas.",
      pairs: [
        { concept: "Materia", clue: "Todo lo que tiene masa y ocupa un lugar en el espacio." },
        { concept: "Propiedad fisica", clue: "Se observa o mide sin cambiar la composicion de la sustancia." },
        { concept: "Propiedad quimica", clue: "Describe como una sustancia puede transformarse en otra." },
        { concept: "Solubilidad", clue: "Capacidad de una sustancia para disolverse en un solvente." },
        { concept: "Conductividad", clue: "Capacidad de un material para transmitir calor o electricidad." }
      ],
      scenario:
        "En el laboratorio escolar se comparan sal, azucar, hierro y aceite para decidir cuales conducen, se disuelven y cambian con el calor.",
      sequence: ["Observar", "Medir", "Comparar", "Concluir"]
    },
    "Estados y cambios": {
      intro: "Usa las nociones de estado solido, liquido, gaseoso y cambios de estado por ganancia o perdida de energia.",
      pairs: [
        { concept: "Solido", clue: "Tiene forma y volumen definidos; particulas muy proximas." },
        { concept: "Liquido", clue: "Mantiene volumen pero toma la forma del recipiente." },
        { concept: "Gaseoso", clue: "No tiene forma ni volumen fijos; se expande." },
        { concept: "Fusion", clue: "Cambio de solido a liquido por aumento de energia." },
        { concept: "Condensacion", clue: "Cambio de gaseoso a liquido por perdida de energia." }
      ],
      scenario:
        "Durante una salida, observan hielo en una conservadora, vapor en una olla y gotas en una ventana fria.",
      sequence: ["Identificar estado inicial", "Registrar fuente de energia", "Describir cambio", "Justificar con el modelo particulado"]
    },
    "Modelo corpuscular": {
      intro:
        "Relaciona particulas, agitacion, energia y separacion para explicar propiedades y cambios de estado.",
      pairs: [
        { concept: "Particulas", clue: "Unidades muy pequenas que componen toda la materia." },
        { concept: "Agitacion termica", clue: "Movimiento de las particulas asociado a la energia." },
        { concept: "Difusion", clue: "Dispersión de particulas desde zonas concentradas a menos concentradas." },
        { concept: "Compresion", clue: "Disminucion de volumen posible sobre todo en gases." },
        { concept: "Espacios intermoleculares", clue: "Distancias entre particulas en un material." }
      ],
      scenario:
        "Se abre un perfume en el aula y al poco tiempo el olor llega a todo el curso.",
      sequence: ["Liberacion de particulas", "Choques entre particulas", "Dispersion por el aire", "Equilibrio en el ambiente"]
    },
    "Sistemas materiales": {
      intro: "Trabaja con fase, componente, sistemas homogeneos y heterogeneos.",
      pairs: [
        { concept: "Sistema material", clue: "Porcion de materia delimitada para su estudio." },
        { concept: "Fase", clue: "Region con propiedades uniformes dentro de un sistema." },
        { concept: "Componente", clue: "Cada sustancia presente en una mezcla." },
        { concept: "Homogeneo", clue: "Presenta una sola fase visible." },
        { concept: "Heterogeneo", clue: "Presenta dos o mas fases distinguibles." }
      ],
      scenario:
        "Se analizan muestras de agua con sal, agua con arena, granito y leche.",
      sequence: ["Observar a simple vista", "Detectar fases", "Definir componentes", "Clasificar el sistema"]
    },
    Mezclas: {
      intro: "Integra clasificacion de mezclas, concepto de soluble e insoluble, y reconocimiento de fases.",
      pairs: [
        { concept: "Mezcla", clue: "Combinacion fisica de dos o mas sustancias." },
        { concept: "Homogenea", clue: "Mezcla de composicion uniforme, una sola fase." },
        { concept: "Heterogenea", clue: "Mezcla con composicion no uniforme y varias fases." },
        { concept: "Soluto", clue: "Sustancia que se disuelve en otra." },
        { concept: "Solvente", clue: "Sustancia que disuelve al soluto." }
      ],
      scenario:
        "En la cocina se preparan jugo en polvo, ensalada y agua con aceite.",
      sequence: ["Identificar sustancias", "Observar uniformidad", "Separar por fases", "Nombrar tipo de mezcla"]
    },
    Soluciones: {
      intro: "Relaciona soluto, solvente, concentracion, dilucion y saturacion.",
      pairs: [
        { concept: "Solucion", clue: "Mezcla homogenea formada por soluto y solvente." },
        { concept: "Concentrada", clue: "Tiene alta proporcion de soluto en relacion con el solvente." },
        { concept: "Diluida", clue: "Tiene baja proporcion de soluto en relacion con el solvente." },
        { concept: "Saturada", clue: "No admite mas soluto a esa temperatura." },
        { concept: "Solubilidad", clue: "Cantidad maxima de soluto que puede disolverse." }
      ],
      scenario:
        "Se preparan tres bebidas: una muy dulce, una intermedia y otra donde el azucar queda en el fondo.",
      sequence: ["Elegir soluto y solvente", "Agregar y agitar", "Comparar concentracion", "Determinar si hay saturacion"]
    },
    "Métodos de separación": {
      intro: "Aplica metodos de separacion segun las propiedades de los componentes de una mezcla.",
      pairs: [
        { concept: "Filtracion", clue: "Separa solido insoluble de un liquido por tamaño de particula." },
        { concept: "Decantacion", clue: "Separa fases por diferencia de densidad y reposo." },
        { concept: "Destilacion", clue: "Separa liquidos por diferencia de punto de ebullicion." },
        { concept: "Tamizacion", clue: "Separa solidos por tamaño usando una malla." },
        { concept: "Imantacion", clue: "Separa componentes con propiedades magneticas." }
      ],
      scenario:
        "Una muestra contiene arena, sal, agua y limaduras de hierro.",
      sequence: ["Retirar hierro", "Separar arena", "Evaporar o destilar agua", "Recuperar sal"]
    },
    "Propiedades de la materia": {
      intro: "Revisa propiedades observables y medibles para caracterizar materiales en situaciones cotidianas.",
      pairs: [
        { concept: "Color", clue: "Propiedad organoleptica percibida con la vista." },
        { concept: "Olor", clue: "Propiedad organoleptica percibida con el olfato." },
        { concept: "Masa", clue: "Cantidad de materia de un cuerpo." },
        { concept: "Volumen", clue: "Espacio que ocupa un cuerpo." },
        { concept: "Dureza", clue: "Resistencia de un material al rayado o deformacion." }
      ],
      scenario:
        "Se comparan madera, vidrio y plastico para elegir un material para botellas reutilizables.",
      sequence: ["Observar", "Medir", "Comparar propiedades", "Elegir material justificado"]
    },
    "Estados de la materia": {
      intro: "Consolida los tres estados clasicos y su relacion con energia y movimiento de particulas.",
      pairs: [
        { concept: "Solido", clue: "Particulas muy juntas y ordenadas." },
        { concept: "Liquido", clue: "Particulas cercanas con movilidad intermedia." },
        { concept: "Gas", clue: "Particulas muy separadas y de alta movilidad." },
        { concept: "Evaporacion", clue: "Paso de liquido a gas desde la superficie." },
        { concept: "Sublimacion", clue: "Paso directo de solido a gas." }
      ],
      scenario:
        "En una heladeria se observa hielo seco, agua liquida y vapor caliente.",
      sequence: ["Identificar estado", "Relacionar energia", "Describir cambio", "Explicar con particulas"]
    },
    "Los movimientos": {
      intro:
        "Integra sistema de referencia, trayectoria, desplazamiento, velocidad, aceleracion y fuerzas.",
      pairs: [
        { concept: "Sistema de referencia", clue: "Punto o marco desde el cual se describe el movimiento." },
        { concept: "Trayectoria", clue: "Camino que sigue un movil durante su movimiento." },
        { concept: "Desplazamiento", clue: "Vector desde posicion inicial hasta posicion final." },
        { concept: "Velocidad", clue: "Cambio de posicion por unidad de tiempo con direccion." },
        { concept: "Aceleracion", clue: "Cambio de velocidad por unidad de tiempo." }
      ],
      scenario:
        "Un colectivo arranca, mantiene velocidad y luego frena en una parada.",
      sequence: ["Registrar tiempos", "Calcular velocidades", "Detectar aceleracion", "Interpretar fuerzas"]
    },
    "La Tierra y el Universo": {
      intro:
        "Relaciona componentes del Sistema Solar, escalas, movimientos aparentes y modelos geocentrico-heliocentrico.",
      pairs: [
        { concept: "Sistema Solar", clue: "Conjunto formado por el Sol y los cuerpos que lo orbitan." },
        { concept: "Rotacion", clue: "Giro de un planeta sobre su propio eje." },
        { concept: "Traslacion", clue: "Movimiento orbital de un planeta alrededor del Sol." },
        { concept: "Geocentrismo", clue: "Modelo historico con la Tierra en el centro." },
        { concept: "Heliocentrismo", clue: "Modelo con el Sol como centro del Sistema Solar." }
      ],
      scenario:
        "En una observacion nocturna registran fases lunares y posiciones de planetas durante un mes.",
      sequence: ["Observar cielo", "Registrar posiciones", "Comparar con modelos", "Explicar movimiento aparente"]
    },
    "Energía, cambio y movimiento": {
      intro:
        "Trabaja formas de energia, transformaciones, conservacion y uso social de fuentes renovables y no renovables.",
      pairs: [
        { concept: "Energia mecanica", clue: "Asociada al movimiento y la posicion de los cuerpos." },
        { concept: "Energia termica", clue: "Relacionada con la agitacion de particulas y temperatura." },
        { concept: "Transformacion energetica", clue: "Cambio de una forma de energia en otra." },
        { concept: "Conservacion de la energia", clue: "La energia no se crea ni se destruye; se transforma." },
        { concept: "Degradacion energetica", clue: "Parte de la energia util termina dispersa, por ejemplo como calor." }
      ],
      scenario:
        "Se analiza una linterna de dínamo, un ventilador y un panel solar.",
      sequence: ["Identificar fuente", "Reconocer forma inicial", "Describir transformaciones", "Evaluar eficiencia y perdida"]
    },
    "Fenómenos ondulatorios": {
      intro: "Aplica propagacion de ondas, sonido, luz y mecanismos de transferencia de calor.",
      pairs: [
        { concept: "Onda", clue: "Perturbacion que transporta energia sin transportar materia." },
        { concept: "Frecuencia", clue: "Numero de oscilaciones por segundo." },
        { concept: "Longitud de onda", clue: "Distancia entre dos crestas consecutivas." },
        { concept: "Conduccion", clue: "Transferencia de calor por contacto directo." },
        { concept: "Radiacion", clue: "Transferencia de energia mediante ondas electromagneticas." }
      ],
      scenario:
        "En un aula se comparan eco, musica en parlante y calentamiento de una cuchara en agua caliente.",
      sequence: ["Identificar fenomeno", "Determinar tipo de onda o transferencia", "Describir medio", "Explicar intercambio de energia"]
    },
    "Vida: unidad y diversidad": {
      intro:
        "Recupera caracteristicas comunes de los seres vivos, niveles de organizacion y criterios de clasificacion.",
      pairs: [
        { concept: "Celula", clue: "Unidad estructural y funcional basica de los seres vivos." },
        { concept: "Nutricion", clue: "Proceso por el cual se obtiene y transforma materia y energia." },
        { concept: "Relacion", clue: "Respuesta de un organismo a estimulos del ambiente." },
        { concept: "Reproduccion", clue: "Proceso por el cual se generan nuevos individuos." },
        { concept: "Evolucion", clue: "Cambio de las poblaciones a lo largo del tiempo." }
      ],
      scenario:
        "Se comparan una bacteria, una planta y un animal para clasificar similitudes y diferencias.",
      sequence: ["Observar caracteristicas", "Aplicar criterios", "Clasificar", "Justificar con vocabulario cientifico"]
    },
    "Relaciones tróficas": {
      intro:
        "Aplica redes troficas, productores, consumidores, descomponedores y equilibrio de ecosistemas.",
      pairs: [
        { concept: "Productor", clue: "Organismo autotrofo que fabrica su alimento." },
        { concept: "Consumidor", clue: "Organismo heterotrofo que se alimenta de otros." },
        { concept: "Descomponedor", clue: "Organismo que transforma materia organica muerta." },
        { concept: "Cadena trofica", clue: "Secuencia lineal de transferencia de materia y energia." },
        { concept: "Red trofica", clue: "Conjunto de cadenas troficas interconectadas." }
      ],
      scenario:
        "En un humedal local disminuye la poblacion de insectos durante varios meses.",
      sequence: ["Identificar nivel afectado", "Prever impactos en otros niveles", "Representar red trofica", "Proponer medidas"]
    },
    "Organismos microscópicos": {
      intro:
        "Relaciona estructuras y funciones de bacterias y protistas, con efectos beneficiosos y perjudiciales.",
      pairs: [
        { concept: "Bacteria", clue: "Organismo unicelular procariota." },
        { concept: "Protista", clue: "Grupo diverso de organismos eucariotas, muchos unicelulares." },
        { concept: "Fermentacion", clue: "Proceso metabolico utilizado por microorganismos en ausencia de oxigeno." },
        { concept: "Patogeno", clue: "Microorganismo capaz de causar enfermedad." },
        { concept: "Biotecnologia microbiana", clue: "Uso de microorganismos para obtener productos utiles." }
      ],
      scenario:
        "Se compara la elaboracion de yogur con una situacion de contaminacion por agua no potable.",
      sequence: ["Identificar microorganismo", "Definir efecto", "Relacionar con salud y ambiente", "Proponer prevencion"]
    },
    "Plantas autótrofas": {
      intro: "Integra estructuras vegetales y procesos de nutricion, relacion y reproduccion en plantas.",
      pairs: [
        { concept: "Raiz", clue: "Estructura que fija la planta y absorbe agua y sales." },
        { concept: "Tallo", clue: "Sostiene la planta y transporta sustancias." },
        { concept: "Hoja", clue: "Principal organo donde ocurre fotosintesis." },
        { concept: "Fotosintesis", clue: "Proceso de produccion de glucosa usando luz, agua y CO2." },
        { concept: "Polinizacion", clue: "Transferencia de polen necesaria para la reproduccion." }
      ],
      scenario:
        "Dos macetas iguales reciben distinta cantidad de luz y agua por tres semanas.",
      sequence: ["Diseñar experiencia", "Registrar cambios", "Comparar resultados", "Explicar nutricion vegetal"]
    },
    "Animales heterótrofos": {
      intro: "Trabaja nutricion, relacion y reproduccion en animales vertebrados e invertebrados.",
      pairs: [
        { concept: "Heterotrofo por ingestion", clue: "Organismo que obtiene alimento incorporando otros organismos." },
        { concept: "Vertebrado", clue: "Animal con columna vertebral." },
        { concept: "Invertebrado", clue: "Animal sin columna vertebral." },
        { concept: "Sistema digestivo", clue: "Conjunto de organos para transformar y absorber nutrientes." },
        { concept: "Adaptacion", clue: "Caracteristica que mejora la supervivencia en un ambiente." }
      ],
      scenario:
        "Se estudian dieta y habitat de pez, ave, vaca y lombriz.",
      sequence: ["Identificar tipo de alimentacion", "Relacionar estructura y funcion", "Comparar grupos", "Concluir adaptaciones"]
    },
    "Hongos heterótrofos": {
      intro:
        "Relaciona estructuras de los hongos con nutricion por absorcion e impacto ambiental y social.",
      pairs: [
        { concept: "Hongo", clue: "Organismo eucariota heterotrofo por absorcion." },
        { concept: "Micelio", clue: "Conjunto de hifas que forma el cuerpo vegetativo del hongo." },
        { concept: "Hifa", clue: "Filamento que absorbe nutrientes del sustrato." },
        { concept: "Espora", clue: "Estructura reproductiva de dispersion." },
        { concept: "Descomposicion", clue: "Proceso de degradacion de materia organica." }
      ],
      scenario:
        "Aparecen hongos en pan humedo y tambien se usa levadura para elaborar panificados.",
      sequence: ["Identificar contexto", "Clasificar efecto", "Explicar nutricion por absorcion", "Proponer cuidados"]
    },
    "Cuerpo humano": {
      intro:
        "Integra al cuerpo como sistema complejo, con funciones de nutricion, relacion y reproduccion.",
      pairs: [
        { concept: "Homeostasis", clue: "Mantenimiento de condiciones internas estables." },
        { concept: "Sistema digestivo", clue: "Incorpora y procesa alimentos para obtener nutrientes." },
        { concept: "Sistema respiratorio", clue: "Intercambia oxigeno y dioxido de carbono con el ambiente." },
        { concept: "Sistema circulatorio", clue: "Transporta sustancias por todo el organismo." },
        { concept: "Sistema nervioso", clue: "Coordina respuestas y procesa informacion." }
      ],
      scenario:
        "Durante actividad fisica intensa aumentan pulso, respiracion y temperatura corporal.",
      sequence: ["Observar cambios", "Relacionar sistemas", "Explicar regulacion", "Proponer habitos saludables"]
    },
    "ESI alimentación": {
      intro:
        "Relaciona diferencia entre alimentos y nutrientes, alimentacion saludable y calorias vacias.",
      pairs: [
        { concept: "Alimento", clue: "Producto que ingerimos para nutrirnos." },
        { concept: "Nutriente", clue: "Componente quimico del alimento que cumple una funcion biologica." },
        { concept: "Calorias vacias", clue: "Aporte energetico alto con bajo valor nutricional." },
        { concept: "Dieta equilibrada", clue: "Incluye variedad y proporciones adecuadas de grupos alimentarios." },
        { concept: "Hidratacion", clue: "Consumo suficiente de agua para funciones corporales." }
      ],
      scenario:
        "Se comparan colaciones escolares: gaseosa y snack vs fruta, agua y sandwich casero.",
      sequence: ["Leer etiquetas", "Identificar nutrientes", "Detectar calorias vacias", "Justificar eleccion saludable"]
    }
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildDidacticActivitiesHtml(page, config) {
    const pairs = Array.isArray(config.pairs) ? config.pairs.slice(0, 5) : [];
    if (pairs.length < 4) return "";

    const sequence = Array.isArray(config.sequence) && config.sequence.length >= 4
      ? config.sequence.slice(0, 4)
      : ["Observar", "Analizar", "Relacionar conceptos", "Concluir"];

    const shuffledClues = pairs.map(function (pair, index) {
      return {
        id: String.fromCharCode(65 + index),
        clue: pair.clue
      };
    });

    return (
      '<h2>Actividades didacticas del tema (10 puntos)</h2>' +
      "<p>" + escapeHtml(config.intro || "") + " Todas las consignas se resuelven usando la informacion desarrollada en esta misma pagina.</p>" +

      "<h3>1) Cuadro de estudio (completar)</h3>" +
      '<table class="study-table"><thead><tr><th>Concepto</th><th>Definicion con tus palabras</th><th>Ejemplo de la pagina</th></tr></thead><tbody>' +
      pairs.slice(0, 4).map(function (pair) {
        return "<tr><td><strong>" + escapeHtml(pair.concept) + "</strong></td><td>__________________________</td><td>__________________________</td></tr>";
      }).join("") +
      "</tbody></table>" +

      "<h3>2) Opcion multiple</h3>" +
      "<ol>" +
      pairs.slice(0, 3).map(function (pair, index) {
        const wrongA = pairs[(index + 1) % pairs.length].clue;
        const wrongB = pairs[(index + 2) % pairs.length].clue;
        const wrongC = pairs[(index + 3) % pairs.length].clue;
        return (
          "<li><strong>" + escapeHtml(pair.concept) + "</strong>: marca la definicion correcta.<br>" +
          "a) " + escapeHtml(pair.clue) + "<br>" +
          "b) " + escapeHtml(wrongA) + "<br>" +
          "c) " + escapeHtml(wrongB) + "<br>" +
          "d) " + escapeHtml(wrongC) + "</li>"
        );
      }).join("") +
      "</ol>" +

      "<h3>3) Verdadero o Falso</h3>" +
      "<ol>" +
      "<li>" + escapeHtml(pairs[0].concept) + ": " + escapeHtml(pairs[0].clue) + " (V/F)</li>" +
      "<li>" + escapeHtml(pairs[1].concept) + ": " + escapeHtml(pairs[2].clue) + " (V/F)</li>" +
      "<li>" + escapeHtml(pairs[2].concept) + ": " + escapeHtml(pairs[2].clue) + " (V/F)</li>" +
      "<li>" + escapeHtml(pairs[3].concept) + ": " + escapeHtml(pairs[4].clue) + " (V/F)</li>" +
      "<li>" + escapeHtml(pairs[4].concept) + ": " + escapeHtml(pairs[4].clue) + " (V/F)</li>" +
      "</ol>" +

      "<h3>4) Completar frases</h3>" +
      "<ol>" +
      "<li>En este tema, el concepto <strong>__________</strong> se usa para explicar: " + escapeHtml(pairs[0].clue) + ".</li>" +
      "<li>Cuando analizamos <strong>" + escapeHtml(page) + "</strong>, un termino clave es <strong>__________</strong>.</li>" +
      "<li>Segun la pagina, <strong>" + escapeHtml(pairs[2].concept) + "</strong> significa <strong>__________</strong>.</li>" +
      "<li>Un ejemplo concreto del texto para <strong>" + escapeHtml(pairs[3].concept) + "</strong> es <strong>__________</strong>.</li>" +
      "<li>La relacion entre <strong>" + escapeHtml(pairs[0].concept) + "</strong> y <strong>" + escapeHtml(pairs[1].concept) + "</strong> se observa cuando <strong>__________</strong>.</li>" +
      "</ol>" +

      "<h3>5) Cuestionario breve</h3>" +
      "<ol>" +
      "<li>Define con precision " + escapeHtml(pairs[0].concept) + " y cita una parte del desarrollo teorico.</li>" +
      "<li>Compara " + escapeHtml(pairs[1].concept) + " con " + escapeHtml(pairs[2].concept) + " usando una diferencia concreta.</li>" +
      "<li>Explica como interviene " + escapeHtml(pairs[3].concept) + " en un caso real.</li>" +
      "<li>Relaciona este tema con otro contenido de Ciencias Naturales visto en la materia.</li>" +
      "<li>Indica una duda que te haya surgido y formula una hipotesis de respuesta.</li>" +
      "</ol>" +

      "<h3>6) Relacionar columnas</h3>" +
      '<table class="study-table"><thead><tr><th>Columna A</th><th>Columna B</th></tr></thead><tbody>' +
      pairs.map(function (pair, index) {
        const clue = shuffledClues[(index + 2) % shuffledClues.length];
        return "<tr><td>" + (index + 1) + ". " + escapeHtml(pair.concept) + "</td><td>" + clue.id + ") " + escapeHtml(clue.clue) + "</td></tr>";
      }).join("") +
      "</tbody></table>" +
      "<p>Escribe las correspondencias correctas: 1-__, 2-__, 3-__, 4-__, 5-__.</p>" +

      "<h3>7) Situacion de aplicacion</h3>" +
      "<p><strong>Caso:</strong> " + escapeHtml(config.scenario || "") + "</p>" +
      "<ol>" +
      "<li>Subraya en el caso dos evidencias que se relacionen con el tema.</li>" +
      "<li>Selecciona al menos tres conceptos del cuadro y aplicalos al caso.</li>" +
      "<li>Explica una posible consecuencia si cambia una condicion del caso.</li>" +
      "<li>Plantea una recomendacion o decision fundamentada cientificamente.</li>" +
      "</ol>" +

      "<h3>8) Ordenar la secuencia</h3>" +
      "<p>Ordena de manera logica este proceso de trabajo (del 1 al 4):</p>" +
      "<ul>" +
      sequence.map(function (step) {
        return "<li>___ " + escapeHtml(step) + "</li>";
      }).join("") +
      "</ul>" +

      "<h3>9) Produccion escrita corta</h3>" +
      "<p>Redacta un texto de 8 a 10 renglones explicando el tema <strong>" + escapeHtml(page) + "</strong>. Debe incluir obligatoriamente los terminos: <strong>" +
      escapeHtml(pairs[0].concept) + "</strong>, <strong>" + escapeHtml(pairs[1].concept) + "</strong> y <strong>" + escapeHtml(pairs[2].concept) + "</strong>.</p>" +

      "<h3>10) Autoevaluacion y metacognicion</h3>" +
      "<ul>" +
      "<li>[ ] Puedo definir los conceptos centrales sin mirar apuntes.</li>" +
      "<li>[ ] Puedo resolver una situacion nueva usando el vocabulario del tema.</li>" +
      "<li>[ ] Puedo justificar mis respuestas con informacion de la pagina.</li>" +
      "<li>[ ] Identifique el punto que necesito repasar antes de la evaluacion.</li>" +
      "</ul>"
    );
  }

  function ensureDidacticActivities() {
    const body = document.body;
    const page = body ? body.getAttribute("data-page") || "" : "";
    const section = body ? body.getAttribute("data-section") || "" : "";
    if (!page || !section || !["Química", "Física", "Biología"].includes(section)) return;
    if (["Química", "Física", "Biología"].includes(page)) return;

    const config = DIDACTIC_ACTIVITY_BANK[page];
    if (!config) return;

    const main = document.querySelector("main");
    if (!main) return;

    let panel = null;
    const panels = main.querySelectorAll("section.panel");
    panels.forEach(function (item) {
      if (panel) return;
      const heading = item.querySelector("h2");
      if (!heading) return;
      const normalized = normalizeText(heading.textContent || "");
      if (normalized.includes("actividades didacticas")) {
        panel = item;
      }
    });

    if (!panel) {
      panel = document.createElement("section");
      panel.className = "panel";
      main.appendChild(panel);
    }

    panel.innerHTML = buildDidacticActivitiesHtml(page, config);
    panel.setAttribute("data-generated-activities", "true");
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

  function addReadingProgressBar() {
    if (document.body.getAttribute("data-page") === "Inicio" || document.body.getAttribute("data-page") === "Bienvenida") return;

    const container = document.createElement("div");
    container.className = "reading-progress-container";
    const bar = document.createElement("div");
    bar.className = "reading-progress-bar";
    container.appendChild(bar);
    document.body.prepend(container);

    window.addEventListener("scroll", function () {
      const scrollTotal = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPosition = window.scrollY;
      const progress = scrollTotal > 0 ? (scrollPosition / scrollTotal) * 100 : 0;
      bar.style.width = progress + "%";
    }, { passive: true });
  }

  function addBackButton() {
    if (document.body.getAttribute("data-page") === "Inicio" || document.body.getAttribute("data-page") === "Bienvenida") return;

    // Check if we are in a main section (Química, Física, Biología) -> don't show back button there, or link explicitly to Inicio
    // But since breadcrumbs exist, a floating back might be specifically helpful to just go `history.back()`
    const btn = document.createElement("button");
    btn.className = "floating-back-btn";
    btn.setAttribute("aria-label", "Volver atrás");
    btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Volver`;

    btn.addEventListener("click", function () {
      if (document.referrer && document.referrer.includes(window.location.host)) {
        window.history.back();
      } else {
        window.location.href = "inicio.html";
      }
    });

    document.body.appendChild(btn);
  }

  function initAll() {
    loadWeatherWidget();
    buildBreadcrumbs();
    ensureQuizNavLink();
    initSwitchers();
    ensureDidacticActivities();
    initQuizPage();
    initTopicSearch();
    applyFooterBranding();
    addReadingTime();
    addScrollToTop();
    observeCards();
    addTooltips();
    highlightKeywords();
    addReadingProgressBar();
    addBackButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
