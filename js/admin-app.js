/* ============================================================
   MASIVO CONTROL — Aplicación del panel interno
   Router, vistas, formularios y acciones.
   ============================================================ */

(() => {
  "use strict";

  const D = window.MasivoData.util;
  const S = window.MasivoStore;
  const C = window.MasivoCharts;

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const nf = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
  const money = (value) => `$${nf.format(Math.round(Number(value || 0)))}`;
  const moneyC = (value) => {
    const number = Number(value || 0);
    const abs = Math.abs(number);
    if (abs >= 1000000) return `$${(number / 1000000).toFixed(abs >= 10000000 ? 0 : 1).replace(".", ",")}M`;
    if (abs >= 1000) return `$${Math.round(number / 1000)}k`;
    return `$${Math.round(number)}`;
  };
  const num = (value) => nf.format(Number(value || 0));
  const pct = (value) => `${Math.round(Number(value || 0))}%`;
  const esc = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const dayFmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" });
  const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" });
  const timeFmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const date = (value) => {
    const parsed = D.parseISO(value);
    return parsed ? dayFmt.format(parsed).replace(".", "") : "—";
  };
  const dateFull = (value) => {
    const parsed = D.parseISO(value);
    return parsed ? dateFmt.format(parsed).replace(/\./g, "") : "—";
  };
  const dateTime = (value) => {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : timeFmt.format(parsed).replace(/\./g, "");
  };
  const relative = (value) => {
    if (!value) return "—";
    const then = new Date(value).getTime();
    const diff = Date.now() - then;
    if (Number.isNaN(diff)) return "—";
    const mins = Math.max(1, Math.round(diff / 60000));
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.round(hours / 24);
    if (days === 1) return "ayer";
    if (days < 30) return `hace ${days} d`;
    return date(value);
  };
  const ageLabel = (iso) => {
    const today = D.parseISO(D.iso(new Date()));
    const then = D.parseISO(iso);
    if (!then) return "—";
    const days = Math.round((today - then) / 86400000);
    if (days === 0) return "hoy";
    if (days === 1) return "ayer";
    if (days < 0) return `en ${Math.abs(days)} d`;
    return `hace ${days} d`;
  };
  const initials = (userOrName) =>
    typeof userOrName === "string"
      ? userOrName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
      : userOrName?.initials || initials(userOrName?.name || "");
  const avatar = (user, size = "", extra = "") =>
    `<span class="avatar ${size} tone-${esc(user?.tone || "cyan")} ${extra}" aria-hidden="true">${esc(initials(user))}</span>`;
  const btn = (label, options = {}) => {
    const { action = "", route = "", icon = "", variant = "ghost", size = "", id = "", extra = "", type = "button" } = options;
    const attrs = [
      `type="${type}"`,
      variant ? `class="btn btn--${variant}${size ? ` btn--${size}` : ""}"` : `class="btn ${size ? `btn--${size}` : ""}"`,
      action ? `data-action="${action}"` : "",
      route ? `data-route="${route}"` : "",
      id ? `data-id="${esc(id)}"` : "",
      extra
    ].filter(Boolean).join(" ");
    return `<button ${attrs}>${icon ? `<svg><use href="#i-${icon}"/></svg>` : ""}${label}</button>`;
  };
  const status = (label, tone = "muted") => `<span class="status status--${tone}">${esc(label)}</span>`;
  const tag = (label, tone = "") => `<span class="tag ${tone ? `tag--${tone}` : ""}">${esc(label)}</span>`;
  const emptyState = (title, text = "", icon = "layers") =>
    `<div class="empty"><svg><use href="#i-${icon}"/></svg><b>${esc(title)}</b>${text ? `<p>${esc(text)}</p>` : ""}</div>`;
  const progressBar = (value, tone = "") =>
    `<div class="progress ${tone ? `progress--${tone}` : ""}"><span style="--value:${Math.max(0, Math.min(100, Math.round(value)))}%"></span></div>`;
  const counter = (value, format = "compact", suffix = "") =>
    `<span data-counter="${Number(value || 0)}" data-format="${format}" data-suffix="${esc(suffix)}">${format === "compact" ? moneyC(value) : num(value)}</span>`;
  const plural = (count, singular, pluralWord) => `${count} ${Number(count) === 1 ? singular : pluralWord}`;

  const ui = {
    month: D.monthKey(0),
    contentWeek: D.weekStart(0),
    opsTab: "tareas",
    academyTab: "resumen",
    pointsTab: "puntos",
    strikeFilter: "activos",
    unitFilter: "",
    txType: "",
    txQuery: "",
    auditQuery: "",
    auditEntity: "",
    auditUser: "",
    taskFilter: "todas",
    studentsQuery: "",
    studentsLevel: "",
    studentsStatus: ""
  };

  const ROUTES = {
    resumen: { label: "Resumen", group: "Control" },
    unidades: { label: "Unidades", group: "Control" },
    equipo: { label: "Equipo", group: "Personas" },
    barberos: { label: "Barberos", group: "Personas" },
    barbero: { label: "Ficha", group: "Personas" },
    operacion: { label: "Operación", group: "Operación" },
    contenido: { label: "Contenido", group: "Operación" },
    capacitaciones: { label: "Capacitaciones", group: "Operación" },
    puntos: { label: "Puntos y strikes", group: "Operación" },
    academia: { label: "Academia", group: "Academia" },
    auditoria: { label: "Auditoría", group: "Sistema" },
    config: { label: "Configuración", group: "Sistema" },
    "mi-panel": { label: "Mi panel", group: "Mi espacio" },
    "mi-ficha": { label: "Mi ficha", group: "Mi espacio" },
    "mis-tareas": { label: "Mis tareas", group: "Mi espacio" },
    "mi-contenido": { label: "Mi contenido", group: "Mi espacio" },
    "mis-capacitaciones": { label: "Mis capacitaciones", group: "Mi espacio" },
    "mis-puntos": { label: "Mis puntos", group: "Mi espacio" }
  };

  const NAV = [
    {
      title: "Control",
      items: [
        { route: "resumen", label: "Resumen", icon: "home", roles: ["owner", "manager"] },
        { route: "unidades", label: "Unidades", icon: "layers", roles: ["owner"] }
      ]
    },
    {
      title: "Personas",
      items: [
        { route: "equipo", label: "Equipo y roles", icon: "users", roles: ["owner", "manager"] },
        { route: "barberos", label: "Barberos", icon: "scissors", roles: ["owner", "manager"] }
      ]
    },
    {
      title: "Operación",
      items: [
        { route: "operacion", label: "Operación", icon: "check-square", roles: ["owner", "manager"], badge: () => S.overdueTasks().length },
        { route: "contenido", label: "Contenido", icon: "image", roles: ["owner", "manager"] },
        { route: "capacitaciones", label: "Capacitaciones", icon: "graduation", roles: ["owner", "manager"] },
        { route: "puntos", label: "Puntos y strikes", icon: "zap", roles: ["owner", "manager"], badge: () => S.barbers().reduce((sum, barber) => sum + S.activeStrikes(barber.id).length, 0) }
      ]
    },
    {
      title: "Academia",
      items: [
        { route: "academia", label: "Academia", icon: "award", roles: ["owner", "manager", "academy"], badge: () => (S.can("academia.pagos") ? S.overduePayments().length : 0) }
      ]
    },
    {
      title: "Sistema",
      items: [
        { route: "auditoria", label: "Auditoría", icon: "shield", roles: ["owner"] },
        { route: "config", label: "Configuración", icon: "settings", roles: ["owner"] }
      ]
    },
    {
      title: "Mi espacio",
      items: [
        { route: "mi-panel", label: "Mi panel", icon: "home", roles: ["barber"] },
        { route: "mi-ficha", label: "Mi ficha", icon: "user", roles: ["barber"] },
        { route: "mis-tareas", label: "Mis tareas", icon: "check-square", roles: ["barber"], badge: () => S.openTasks(S.currentUserId()).length },
        { route: "mi-contenido", label: "Mi contenido", icon: "image", roles: ["barber"] },
        { route: "mis-capacitaciones", label: "Mis capacitaciones", icon: "graduation", roles: ["barber"] },
        { route: "mis-puntos", label: "Mis puntos", icon: "zap", roles: ["barber"], badge: () => S.activeStrikes(S.currentUserId()).length }
      ]
    }
  ];

  /* ---------------- router / init ---------------- */

  const ROUTE_PERMISSION = {
    resumen: "resumen",
    unidades: "unidades",
    equipo: "equipo",
    barberos: "barberos",
    barbero: "barberos",
    operacion: "operacion",
    contenido: "contenido",
    capacitaciones: "capacitaciones",
    puntos: "puntos",
    academia: "academia",
    auditoria: "auditoria",
    config: "config",
    "mi-panel": "self",
    "mi-ficha": "self",
    "mis-tareas": "self",
    "mi-contenido": "self",
    "mis-capacitaciones": "self",
    "mis-puntos": "self"
  };

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, "");
    const parts = raw.split("/").filter(Boolean);
    let base = parts[0] || "";
    const sub = parts[1] || "";
    if (!base || !ROUTES[base]) base = defaultRoute();
    return { base, sub };
  }

  function defaultRoute() {
    const user = S.currentUser();
    if (!user) return "resumen";
    if (user.role === "academy" && canAccess("academia")) return "academia";
    const flat = NAV.flatMap((group) => group.items);
    const first = flat.find((item) => canAccess(item.route));
    return first?.route || (user.role === "barber" ? "mi-panel" : "resumen");
  }

  function canAccess(base) {
    const user = S.currentUser();
    if (!user) return false;
    if (/^mis?-/.test(String(base))) return user.role === "barber" && S.can("self");
    return S.can(ROUTE_PERMISSION[base] || base);
  }

  function navigate(route) {
    if (!route) return;
    const target = `#/${route}`;
    if (location.hash === target) renderView();
    else location.hash = target;
  }

  function init() {
    const year = $("#login-year");
    if (year) year.textContent = new Date().getFullYear();
    renderLogin();
    bindGlobal();
    if (S.currentUser()) enterApp();
    else showLogin();
  }

  function showLogin() {
    $("#login-screen").hidden = false;
    $("#admin-app").hidden = true;
    document.body.classList.remove("no-scroll", "sidebar-open");
    renderLogin();
  }

  function enterApp() {
    $("#login-screen").hidden = true;
    $("#admin-app").hidden = false;
    const parsed = parseHash();
    if (!location.hash) {
      history.replaceState(null, "", `#/${defaultRoute()}`);
    } else if (!canAccess(parsed.base)) {
      history.replaceState(null, "", `#/${defaultRoute()}`);
    }
    renderShell();
    renderView();
  }

  function afterLogin() {
    enterApp();
    const user = S.currentUser();
    toast(`Entraste como ${user?.name || "equipo"}.`);
  }

  /* ---------------- login ---------------- */

  function renderLogin() {
    const form = $("#login-form");
    if (!form) return;
    const error = $("#login-error");
    if (error) {
      error.hidden = true;
      error.textContent = "";
    }
    const user = $("#login-user");
    const pass = $("#login-password");
    const hint = $("#login-demo-hint");
    if (hint) {
      const demo = S.getState().users.find((item) => item.username === "nico" && item.active);
      hint.hidden = !(demo && demo.password === "masivo");
    }
    if (pass) pass.value = "";
    if (user && !form.dataset.touched) {
      user.value = "";
    }
  }

  function showLoginError(message) {
    const error = $("#login-error");
    const card = $(".login-card");
    if (error) {
      error.textContent = message;
      error.hidden = false;
    }
    if (card) {
      card.classList.remove("is-shake");
      void card.offsetWidth;
      card.classList.add("is-shake");
    }
  }

  /* ---------------- shell ---------------- */

  function renderShell() {
    const user = S.currentUser();
    if (!user) return;
    $("#top-avatar").outerHTML = avatar(user, "avatar--sm", "").replace('class="avatar', 'id="top-avatar" class="avatar');
    $("#top-name").textContent = user.name.split(" ")[0];
    $("#top-role").textContent = S.roleLabel(user.role);
    const topUserLabel = $("#top-user-label");
    if (topUserLabel) topUserLabel.textContent = `Perfil de ${user.name}`;
    $("#top-avatar").className = `avatar avatar--sm tone-${user.tone || "cyan"}`;

    const current = parseHash().base;
    const nav = $("#side-nav");
    nav.innerHTML = NAV.map((group) => {
      const items = group.items
        .filter((item) => canAccess(item.route))
        .map((item) => {
          const badge = typeof item.badge === "function" ? item.badge() : 0;
          const active = current === item.route || (item.route === "barberos" && current === "barbero");
          return `<a class="nav-item ${active ? "active" : ""}" href="#/${item.route}">
            <svg><use href="#i-${item.icon}"/></svg>
            <span>${esc(item.label)}</span>
            ${badge ? `<span class="nav-badge">${badge}</span>` : ""}
          </a>`;
        })
        .join("");
      return items ? `<div class="nav-section"><span class="nav-section-title">${esc(group.title)}</span>${items}</div>` : "";
    }).join("");

    const storage = S.storageInfo();
    $("#storage-label").textContent = `${Math.max(1, Math.round(storage.bytes / 1024))} KB · local`;
    updateNotificationBadge();
  }

  function updateNotificationBadge() {
    const count = notifications().length;
    const badge = $("#notif-count");
    if (!badge) return;
    badge.textContent = count ? String(count) : "";
    badge.dataset.empty = count ? "false" : "true";
    const bell = badge.closest("button");
    if (bell) bell.setAttribute("aria-label", count ? `Alertas, ${count} sin leer` : "Alertas, sin novedades");
  }

  function updateBreadcrumb(base) {
    const label = ROUTES[base]?.label || "Panel";
    $("#breadcrumb").innerHTML = `<span>${esc(ROUTES[base]?.group || "Control")}</span><svg><use href="#i-chevron"/></svg><b>${esc(label)}</b>`;
  }

  /* ---------------- render ---------------- */

  function renderView() {
    const user = S.currentUser();
    if (!user) {
      showLogin();
      return;
    }
    const parsed = parseHash();
    if (!canAccess(parsed.base)) {
      const fallback = defaultRoute();
      if (parsed.base !== fallback) {
        toast("Ese sector no está disponible para tu perfil.", "error");
        history.replaceState(null, "", `#/${fallback}`);
        renderView();
        return;
      }
    }
    const { base, sub } = parsed;
    if (base === "academia" && ["pagos", "metricas"].includes(sub)) {
      const need = sub === "pagos" ? "academia.pagos" : "academia.metricas";
      if (!S.can(need)) {
        ui.academyTab = "resumen";
        history.replaceState(null, "", "#/academia");
        renderView();
        return;
      }
    }
    syncTabFromRoute(base, sub);
    const view = $("#view");
    let html = "";
    switch (base) {
      case "resumen":
        html = renderDashboard();
        break;
      case "unidades":
        html = renderUnits();
        break;
      case "equipo":
        html = renderTeam();
        break;
      case "barberos":
        html = renderBarbers();
        break;
      case "barbero":
        html = renderBarberProfilePage(sub);
        break;
      case "operacion":
        html = renderOps();
        break;
      case "contenido":
        html = renderContent();
        break;
      case "capacitaciones":
        html = renderTraining();
        break;
      case "puntos":
        html = renderPoints();
        break;
      case "academia":
        html = renderAcademy();
        break;
      case "auditoria":
        html = renderAudit();
        break;
      case "config":
        html = renderSettings();
        break;
      case "mi-panel":
        html = renderBarberHome();
        break;
      case "mi-ficha":
        html = renderBarberProfilePage(S.currentUserId(), true);
        break;
      case "mis-tareas":
        html = renderMyTasks();
        break;
      case "mi-contenido":
        html = renderContent(true);
        break;
      case "mis-capacitaciones":
        html = renderTraining(true);
        break;
      case "mis-puntos":
        html = renderPoints(true);
        break;
      default:
        html = renderDashboard();
    }
    view.innerHTML = html;
    renderShell();
    updateBreadcrumb(base);
    document.title = `MASIVO CONTROL · ${ROUTES[base]?.label || "Panel"}`;
    document.body.classList.remove("sidebar-open");
    const backdrop = $(".sidebar-backdrop");
    if (backdrop) backdrop.hidden = true;
    $("#notif-panel").hidden = true;
    $("#user-menu").hidden = true;
    $("#quick-menu").hidden = true;
    bindReveals(view);
    bindSpotlight(view);
    initLambo(view);
    animateCounters(view);
    window.scrollTo({ top: 0, behavior: "instant" in document.documentElement.style ? "instant" : "auto" });
  }

  function syncTabFromRoute(base, sub) {
    if (base === "operacion" && ["tareas", "checklists", "reuniones"].includes(sub)) ui.opsTab = sub;
    if (base === "academia" && ["resumen", "embudo", "alumnos", "pagos", "stock", "metricas"].includes(sub)) ui.academyTab = sub;
    if (base === "puntos" && ["puntos", "strikes"].includes(sub)) ui.pointsTab = sub;
  }

  function bindReveals(root) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elements = $$("[data-reveal]", root);
    elements.forEach((element, index) => {
      element.style.setProperty("--reveal-delay", `${Math.min(index * 28, 280)}ms`);
    });
    if (reduce || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06, rootMargin: "0px 0px -20px" });
    elements.forEach((element) => observer.observe(element));
  }

  function bindSpotlight(root) {
    $$("[data-spotlight]", root).forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        const rect = element.getBoundingClientRect();
        element.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
        element.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
      });
    });
  }

  function animateCounters(root) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $$("[data-counter]", root).forEach((element) => {
      const target = Number(element.dataset.counter || 0);
      const format = element.dataset.format || "compact";
      const suffix = element.dataset.suffix || "";
      if (reduce) {
        element.textContent = formatValue(target, format) + suffix;
        return;
      }
      const duration = 850;
      const start = performance.now();
      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = formatValue(target * eased, format) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  function formatValue(value, format) {
    if (format === "money") return money(value);
    if (format === "compact") return moneyC(value);
    if (format === "percent") return pct(value);
    return num(value);
  }

  /* ---------------- lamborghini 3d ---------------- */

  const LAMBO = {
    key: "masivo.lambo.v1",
    model: "/admin/assets/lamborghini-aventador-sv.glb",
    sound: "/admin/assets/lamborghini-rev.m4a",
    cdn: "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.4.0/dist/model-viewer.min.js",
    base: { theta: 122, phi: 70 },
    diagonal: 0,
    lib: false,
    audio: null,
    active: null
  };

  const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

  function lamboPrefs() {
    try {
      const saved = JSON.parse(localStorage.getItem(LAMBO.key) || "{}");
      return saved && typeof saved === "object" ? saved : {};
    } catch {
      return {};
    }
  }

  function saveLamboPrefs(patch) {
    try {
      localStorage.setItem(LAMBO.key, JSON.stringify({ ...lamboPrefs(), ...patch }));
    } catch {
      /* almacenamiento no disponible */
    }
  }

  function lamboRadius(size) {
    const diagonal = LAMBO.diagonal || 600;
    const t = (clampNumber(size, 80, 130) - 80) / 50;
    return diagonal * (1.56 - 0.50 * t);
  }

  function lamboAudio() {
    if (!LAMBO.audio) {
      const audio = new Audio(LAMBO.sound);
      audio.preload = "none";
      audio.volume = 0.55;
      LAMBO.audio = audio;
    }
    return LAMBO.audio;
  }

  function cleanupLambo() {
    if (!LAMBO.active) return;
    LAMBO.active.destroy();
    LAMBO.active = null;
  }

  function initLambo(root) {
    cleanupLambo();
    const card = $("[data-lambo]", root);
    if (!card) return;

    const stage = $("[data-lambo-stage]", card);
    const loader = $("[data-lambo-loader]", card);
    const progress = $("[data-lambo-progress]", card);
    const hint = $("[data-lambo-hint]", card);
    const soundBtn = $("[data-lambo-sound]", card);
    const slider = $("[data-lambo-size]", card);
    const sizeLabel = $("[data-lambo-size-label]", card);
    if (!stage) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const prefs = lamboPrefs();
    let size = clampNumber(Number(prefs.size) || 100, 80, 130);
    let muted = prefs.muted === true;
    let model = null;
    let loaded = false;
    let visible = true;
    let hovering = false;
    let drag = null;
    let hoverOrigin = LAMBO.base.theta;
    let raf = 0;
    let lastRender = 0;
    let revStart = 0;
    let revTimer = 0;
    let loadQueued = false;
    let destroyed = false;
    let unlockToken = 0;
    const soundGate = { last: 0 };
    const state = { ...LAMBO.base, radius: lamboRadius(size) };
    const target = { ...state };

    function orbitString(theta, phi, radius) {
      return `${theta.toFixed(2)}deg ${phi.toFixed(2)}deg ${radius.toFixed(2)}m`;
    }

    function paint() {
      if (!model) return;
      const energy = revEnergy(performance.now());
      const theta = state.theta + Math.sin(performance.now() / 85) * 1.6 * energy;
      const phi = clampNumber(state.phi - 5.5 * energy, 48, 92);
      const radius = state.radius * (1 - 0.16 * energy);
      model.cameraOrbit = orbitString(theta, phi, radius);
    }

    function revEnergy(now) {
      if (!revStart) return 0;
      const t = (now - revStart) / 1050;
      if (t >= 1) {
        revStart = 0;
        return 0;
      }
      return t < 0.16 ? t / 0.16 : Math.pow(1 - (t - 0.16) / 0.84, 1.6);
    }

    function start() {
      if (raf || !loaded || reduce || destroyed) return;
      lastRender = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function frame(now) {
      raf = 0;
      if (destroyed || !loaded || !visible || document.hidden) return;
      if (now - lastRender < 32) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const dt = Math.min((now - lastRender) / 1000, 0.1);
      lastRender = now;
      const baseRadius = lamboRadius(size);
      if (hovering || drag) {
        const ease = 1 - Math.exp(-dt * 9);
        state.theta += (target.theta - state.theta) * ease;
        state.phi += (target.phi - state.phi) * ease;
        state.radius += (target.radius - state.radius) * ease;
      } else {
        state.theta = (state.theta + 13 * dt) % 360;
        state.phi += (LAMBO.base.phi - state.phi) * Math.min(1, dt * 5);
        state.radius += (baseRadius - state.radius) * Math.min(1, dt * 6);
      }
      paint();
      raf = requestAnimationFrame(frame);
    }

    function paintSound() {
      if (!soundBtn) return;
      soundBtn.setAttribute("aria-pressed", muted ? "false" : "true");
      soundBtn.classList.toggle("is-muted", muted);
      soundBtn.title = muted ? "Activar sonido del motor" : "Silenciar sonido del motor";
      const use = soundBtn.querySelector("use");
      if (use) use.setAttribute("href", muted ? "#i-volume-off" : "#i-volume");
    }

    function playSound() {
      if (muted) return;
      const now = performance.now();
      if (now - soundGate.last < 1800) return;
      soundGate.last = now;
      unlockToken += 1;
      try {
        const audio = lamboAudio();
        audio.muted = false;
        audio.currentTime = 0;
        const promise = audio.play();
        if (promise && promise.catch) promise.catch(() => {});
      } catch {
        /* el navegador bloqueó el audio */
      }
    }

    function rev() {
      if (reduce) return;
      const now = performance.now();
      if (now - revStart < 650) return;
      revStart = now;
      card.classList.add("is-revving");
      clearTimeout(revTimer);
      revTimer = setTimeout(() => card.classList.remove("is-revving"), 1250);
      start();
    }

    function paintSize() {
      const min = Number(slider?.min || 80);
      const max = Number(slider?.max || 130);
      slider?.style.setProperty("--fill", `${((size - min) / (max - min)) * 100}%`);
      if (sizeLabel) sizeLabel.textContent = `${size}%`;
    }

    function onPointerEnter(event) {
      if (event.pointerType && event.pointerType !== "mouse") return;
      hoverOrigin = state.theta;
      hovering = true;
      card.classList.add("is-hover");
      rev();
      playSound();
      if (!reduce) start();
    }

    function onPointerMove(event) {
      if (event.pointerType === "touch") {
        if (!drag) return;
        target.theta = drag.theta - (event.clientX - drag.x) * 0.55;
        target.phi = LAMBO.base.phi;
        target.radius = lamboRadius(size);
        if (!reduce) start();
        return;
      }
      if (!hovering) {
        hoverOrigin = state.theta;
        hovering = true;
        card.classList.add("is-hover");
      }
      const rect = stage.getBoundingClientRect();
      const nx = clampNumber((event.clientX - rect.left) / rect.width, 0, 1) * 2 - 1;
      const ny = clampNumber((event.clientY - rect.top) / rect.height, 0, 1) * 2 - 1;
      target.theta = hoverOrigin + nx * 40;
      target.phi = clampNumber(LAMBO.base.phi - ny * 9, 54, 88);
      target.radius = lamboRadius(size);
      hint?.classList.add("is-hidden");
      if (!reduce) start();
    }

    function onPointerLeave() {
      if (drag) return;
      hovering = false;
      card.classList.remove("is-hover");
      target.phi = LAMBO.base.phi;
      target.radius = lamboRadius(size);
    }

    function onPointerDown(event) {
      rev();
      playSound();
      hint?.classList.add("is-hidden");
      if (event.pointerType === "touch") {
        drag = { x: event.clientX, theta: state.theta };
        hovering = true;
        hoverOrigin = state.theta;
      }
    }

    function endDrag() {
      if (!drag) return;
      drag = null;
      hovering = false;
      card.classList.remove("is-hover");
      target.theta = state.theta;
      target.phi = LAMBO.base.phi;
      target.radius = lamboRadius(size);
    }

    function onSoundToggle() {
      muted = !muted;
      saveLamboPrefs({ muted });
      paintSound();
      if (muted) {
        if (LAMBO.audio) {
          LAMBO.audio.pause();
          LAMBO.audio.currentTime = 0;
        }
        return;
      }
      soundGate.last = 0;
      const audio = lamboAudio();
      audio.muted = false;
      playSound();
    }

    function unlockAudio() {
      if (muted) return;
      const audio = lamboAudio();
      const wasMuted = audio.muted;
      const token = ++unlockToken;
      try {
        audio.muted = true;
        const promise = audio.play();
        if (promise && promise.then) {
          promise.then(() => {
            if (token !== unlockToken) return;
            audio.pause();
            audio.currentTime = 0;
            audio.muted = wasMuted;
          }).catch(() => { audio.muted = wasMuted; });
        } else {
          audio.muted = wasMuted;
        }
      } catch {
        audio.muted = wasMuted;
      }
      document.removeEventListener("pointerdown", unlockAudio, true);
    }

    function onVisibility() {
      if (document.hidden) stop();
      else if (visible && loaded) start();
    }

    function fail() {
      if (destroyed) return;
      card.dataset.lamboState = "error";
      card.classList.add("is-error");
      const text = loader?.querySelector("em");
      if (text) text.textContent = "No se pudo cargar el 3D";
      if (progress) progress.style.width = "100%";
    }

    function buildModel() {
      if (destroyed || !card.isConnected || model) return;
      const view = document.createElement("model-viewer");
      view.className = "lambo-model";
      view.setAttribute("alt", "Lamborghini Aventador SV girando en 3D");
      view.setAttribute("loading", "eager");
      view.setAttribute("reveal", "auto");
      view.setAttribute("disable-zoom", "");
      view.setAttribute("interaction-prompt", "none");
      view.setAttribute("touch-action", "pan-y");
      view.setAttribute("shadow-intensity", "0.65");
      view.setAttribute("shadow-softness", "0.85");
      view.setAttribute("exposure", "1.15");
      view.setAttribute("environment-image", "neutral");
      view.setAttribute("camera-orbit", `${LAMBO.base.theta}deg ${LAMBO.base.phi}deg auto`);
      view.addEventListener("progress", (event) => {
        const ratio = Number(event.detail?.totalProgress || 0);
        if (progress) progress.style.width = `${Math.max(8, Math.round(ratio * 100))}%`;
      });
      view.addEventListener("load", () => {
        loaded = true;
        try {
          const dims = view.getDimensions();
          const diagonal = Math.hypot(dims.x, dims.y, dims.z);
          if (Number.isFinite(diagonal) && diagonal > 0) LAMBO.diagonal = diagonal;
        } catch {
          /* sin medida del modelo usamos el fallback */
        }
        state.radius = target.radius = lamboRadius(size);
        state.phi = target.phi = LAMBO.base.phi;
        state.theta = target.theta = LAMBO.base.theta;
        card.dataset.lamboState = "ready";
        card.classList.add("is-ready");
        if (progress) progress.style.width = "100%";
        setTimeout(() => loader?.remove(), 500);
        if (reduce) paint();
        else start();
      });
      view.addEventListener("error", fail);
      view.src = LAMBO.model;
      model = view;
      stage.prepend(view);
      if (reduce) view.cameraOrbit = orbitString(state.theta, state.phi, state.radius);
    }

    function loadModel() {
      if (destroyed || card.dataset.lamboState) return;
      card.dataset.lamboState = "loading";
      if (LAMBO.lib) {
        buildModel();
        return;
      }
      const script = document.createElement("script");
      script.type = "module";
      script.src = LAMBO.cdn;
      script.crossOrigin = "anonymous";
      script.addEventListener("load", () => {
        if (!window.customElements) return fail();
        window.customElements.whenDefined("model-viewer")
          .then(() => {
            LAMBO.lib = true;
            buildModel();
          })
          .catch(() => fail());
      });
      script.addEventListener("error", fail);
      document.head.append(script);
    }

    function scheduleLoad() {
      if (loadQueued || card.dataset.lamboState) return;
      loadQueued = true;
      const run = () => {
        loadQueued = false;
        loadModel();
      };
      if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 1400 });
      else setTimeout(run, 300);
    }

    // Preferencias guardadas.
    if (slider) slider.value = String(size);
    paintSize();
    paintSound();
    if (muted && LAMBO.audio) LAMBO.audio.pause();

    // Interacción.
    stage.addEventListener("pointerenter", onPointerEnter);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerleave", onPointerLeave);
    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    soundBtn?.addEventListener("click", onSoundToggle);
    $("[data-lambo-rev]", card)?.addEventListener("click", () => {
      rev();
      playSound();
    });
    slider?.addEventListener("input", () => {
      size = clampNumber(Number(slider.value) || 100, 80, 130);
      paintSize();
      saveLamboPrefs({ size });
      target.radius = lamboRadius(size);
      if (reduce) {
        state.radius = target.radius;
        paint();
      } else {
        start();
      }
    });
    document.addEventListener("visibilitychange", onVisibility);
    if (!muted) document.addEventListener("pointerdown", unlockAudio, true);

    // Carga diferida: primero el visor y el GLB cuando la tarjeta se acerca al viewport.
    let io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          visible = entry.isIntersecting;
          if (visible) {
            if (loaded) start();
            else scheduleLoad();
          } else {
            stop();
          }
        });
      }, { rootMargin: "320px 0px" });
      io.observe(card);
    } else {
      scheduleLoad();
    }

    LAMBO.active = {
      destroy() {
        destroyed = true;
        stop();
        clearTimeout(revTimer);
        io?.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        document.removeEventListener("pointerdown", unlockAudio, true);
        if (LAMBO.audio) LAMBO.audio.pause();
      }
    };
  }

  /* ---------------- shared UI ---------------- */

  function pageHead({ kicker, title, desc = "", actions = "", meta = "", hero = false }) {
    return `<header class="page-head ${hero ? "page-head--hero" : ""}">
      <div class="page-head-copy">
        <span class="kicker"><i></i>${kicker}</span>
        <h1 class="page-title">${title}</h1>
        ${desc ? `<p class="page-desc">${desc}</p>` : ""}
        ${meta ? `<div class="page-meta">${meta}</div>` : ""}
      </div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ""}
    </header>`;
  }

  function metricCard({ label, value, icon, tone = "", foot = "", delta = null, spark = "", counterValue = null, format = "compact", suffix = "", wide = false }) {
    const deltaHtml = delta === null ? "" : `<span class="delta ${delta > 0 ? "up" : delta < 0 ? "down" : "flat"}">${delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} ${Math.abs(delta).toFixed(1).replace(".", ",")}%</span>`;
    return `<article class="metric-card ${wide ? "metric-card--wide" : ""}" data-spotlight data-reveal>
      <div class="metric-top">
        <span class="metric-label">${esc(label)}</span>
        <span class="metric-icon ${tone}"><svg><use href="#i-${icon}"/></svg></span>
      </div>
      <div class="metric-value">${counterValue !== null ? counter(counterValue, format, suffix) : value}</div>
      <div class="metric-foot">${deltaHtml}${foot ? `<span>${foot}</span>` : ""}</div>
      ${spark ? `<div class="metric-spark">${spark}</div>` : ""}
    </article>`;
  }

  function sectionHead(title, sub = "", extra = "", icon = "") {
    return `<div class="section-head">
      <div>
        <h2 class="section-title">${icon ? `<svg><use href="#i-${icon}"/></svg>` : ""}${title}</h2>
        ${sub ? `<p class="section-sub">${sub}</p>` : ""}
      </div>
      ${extra}
    </div>`;
  }

  function monthSwitcher() {
    return `<div class="month-switcher">
      <button type="button" data-action="month-prev" aria-label="Mes anterior"><svg><use href="#i-chevron" style="transform:rotate(90deg)"/></svg></button>
      <span>${esc(D.monthLabel(ui.month))}</span>
      <button type="button" data-action="month-next" aria-label="Mes siguiente"><svg><use href="#i-chevron" style="transform:rotate(-90deg)"/></svg></button>
    </div>`;
  }

  function userInline(user, sub = "") {
    return `<div class="cell-main">${avatar(user, "avatar--sm")}<div><b>${esc(user?.name || "Sin asignar")}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</div></div>`;
  }

  function unitTag(unit) {
    if (!unit) return "";
    return `<span class="tag" style="color:${unit.color}">${esc(unit.name)}</span>`;
  }

  /* ---------------- notificaciones / menús ---------------- */

  function notifications() {
    const user = S.currentUser();
    if (!user) return [];
    if (user.role === "barber") {
      const list = [];
      S.activeStrikes(user.id).forEach((strike) => list.push({ id: strike.id, tone: "danger", icon: "shield", title: "Strike activo", detail: strike.reason, route: "mis-puntos" }));
      S.overdueTasks(user.id).forEach((task) => list.push({ id: task.id, tone: "warning", icon: "clock", title: "Tarea vencida", detail: task.title, route: "mis-tareas" }));
      const stats = S.contentStats(user.id);
      if (stats.compliance < 100) list.push({ id: "content", tone: "warning", icon: "image", title: "Contenido pendiente", detail: `Vas ${stats.compliance}% de la meta semanal.`, route: "mi-contenido" });
      const training = S.trainingStats(user.id);
      if (training.pending) list.push({ id: "training", tone: "warning", icon: "graduation", title: "Capacitación pendiente", detail: `Tenés ${training.pending} para completar.`, route: "mis-capacitaciones" });
      return list;
    }
    return S.alerts();
  }

  function renderNotifications() {
    const list = notifications();
    $("#notif-panel").innerHTML = `
      <div class="popover-head"><strong>Alertas</strong><span>${list.length} pendientes</span></div>
      <div class="notif-list">
        ${list.length ? list.map((item) => `
          <button class="notif-item" type="button" data-action="go" data-route="${esc(item.route)}">
            <span class="notif-icon ${item.tone === "danger" ? "danger" : ""}"><svg><use href="#i-${item.icon}"/></svg></span>
            <span class="notif-copy"><b>${esc(item.title)}</b><small>${esc(item.detail)}</small></span>
          </button>`).join("") : emptyState("Todo en orden", "No hay alertas para tu perfil.", "check-circle")}
      </div>
      <div class="popover-foot">Se actualiza con cada movimiento</div>`;
  }

  function renderQuickMenu() {
    const user = S.currentUser();
    const items = [];
    if (user.role === "owner") {
      items.push(
        { key: "billing", icon: "wallet", label: "Cargar facturación", sub: "Barbería · cierre mensual" },
        { key: "task", icon: "check-square", label: "Nueva tarea", sub: "Responsable y fecha límite" },
        { key: "lead", icon: "target", label: "Nuevo lead", sub: "Academia · embudo" },
        { key: "points", icon: "zap", label: "Sumar puntos", sub: "Reconocimiento objetivo" },
        { key: "content", icon: "image", label: "Nueva pieza", sub: "Contenido semanal" }
      );
    } else if (user.role === "manager") {
      items.push(
        { key: "task", icon: "check-square", label: "Nueva tarea", sub: "Responsable y fecha límite" },
        { key: "content", icon: "image", label: "Nueva pieza", sub: "Contenido semanal" },
        { key: "lead", icon: "target", label: "Nuevo lead", sub: "Academia · embudo" },
        { key: "strike", icon: "shield", label: "Registrar strike", sub: "Con motivo y evidencia" },
        { key: "report", icon: "file", label: "Reporte de trabajo", sub: "Cierre o incidente" }
      );
    } else {
      items.push(
        { key: "content", icon: "image", label: "Subir contenido", sub: "Grabado, Drive o publicado" },
        { key: "report", icon: "file", label: "Mi reporte", sub: "Cierre de semana o incidente" },
        { key: "points", icon: "zap", label: "Mis puntos", sub: "Ver historial" }
      );
    }
    $("#quick-menu").innerHTML = items.map((item) => `
      <button class="quick-item" type="button" data-action="quick" data-quick="${item.key}">
        <span class="quick-icon"><svg><use href="#i-${item.icon}"/></svg></span>
        <span><b>${item.label}</b><small>${item.sub}</small></span>
      </button>`).join("");
  }

  function renderUserMenu() {
    const user = S.currentUser();
    $("#user-menu").innerHTML = `
      <div class="user-menu-head">${avatar(user, "")}<div><b>${esc(user.name)}</b><small>${esc(S.roleLabel(user.role))} · ${esc(user.email || "")}</small></div></div>
      <div class="user-menu-list">
        <button class="user-menu-item" type="button" data-action="open-search"><svg><use href="#i-search"/></svg> Buscar en el panel</button>
        ${S.can("config") ? `<button class="user-menu-item" type="button" data-action="go" data-route="config"><svg><use href="#i-settings"/></svg> Configuración</button>` : ""}
      </div>
      <div class="user-menu-list" style="border-top:1px solid var(--line)">
        <button class="user-menu-item danger" type="button" data-action="logout"><svg><use href="#i-logout"/></svg> Cerrar sesión</button>
      </div>`;
  }

  function closePopovers(except = null) {
    ["notif-panel", "user-menu", "quick-menu"].forEach((id) => {
      if (id !== except) {
        const element = document.getElementById(id);
        if (element) element.hidden = true;
      }
    });
  }

  /* ---------------- dashboard ---------------- */

  function renderDashboard() {
    return S.isBarber() ? renderBarberHome() : S.isOwner() ? renderOwnerDashboard() : renderManagerDashboard();
  }

  function weeklyKicker() {
    return `Resumen semanal · S${String(D.isoWeek(D.weekStart(0))).padStart(2, "0")} · ${D.weekLabel(D.weekStart(0))}`;
  }

  function lamboCard(goalPct) {
    return `<article class="lambo-card" data-lambo data-reveal aria-label="Lamborghini Aventador SV en 3D">
        <header class="lambo-head">
          <div class="lambo-copy">
            <span class="lambo-kicker"><i></i>Meta en pista</span>
            <b class="lambo-name">Aventador SV</b>
            <small class="lambo-sub">${goalPct >= 100 ? "Objetivo cumplido" : `${goalPct}% de la meta del mes`}</small>
          </div>
          <button class="lambo-sound" type="button" data-lambo-sound aria-pressed="true" aria-label="Sonido del motor" title="Silenciar sonido del motor">
            <svg><use href="#i-volume"/></svg>
          </button>
        </header>
        <div class="lambo-stage" data-lambo-stage>
          <span class="lambo-halo" aria-hidden="true"></span>
          <span class="lambo-floor" aria-hidden="true"></span>
          <span class="lambo-streaks" aria-hidden="true"><i></i><i></i><i></i></span>
          <div class="lambo-loader" data-lambo-loader>
            <span class="lambo-loader-bar"><i data-lambo-progress></i></span>
            <em>Cargando el Aventador</em>
          </div>
          <div class="lambo-hint" data-lambo-hint>
            <button type="button" data-lambo-rev aria-label="Acelerar el Lamborghini">
              <svg><use href="#i-zap"/></svg>
              <span class="lambo-hint-mouse">Pasá el mouse para girarlo</span>
              <span class="lambo-hint-touch">Tocá para acelerar</span>
            </button>
          </div>
        </div>
        <footer class="lambo-foot">
          <label class="lambo-size">
            <span>Tamaño <b data-lambo-size-label>100%</b></span>
            <input type="range" min="80" max="130" step="1" value="100" data-lambo-size aria-label="Tamaño del Lamborghini">
          </label>
          <a class="lambo-credit" href="https://sketchfab.com/3d-models/lamborghini-aventador-lp750-4-sv-fec3fec276d240f6b8a660e2a7874435" target="_blank" rel="noopener" title="Modelo 3D: Lamborghini Aventador LP750-4 SV por Hari en Sketchfab · Licencia CC BY 4.0">3D: Hari · CC BY 4.0</a>
        </footer>
      </article>`;
  }

  function renderOwnerDashboard() {
    const summary = S.ownerSummary(ui.month);
    const series = S.monthlySeries(6);
    const units = S.getState().units.filter((unit) => unit.active);
    const unitSummaries = units.map((unit) => S.unitSummary(unit.id, ui.month));
    const alerts = S.alerts();
    const content = S.contentOverview();
    const meeting = S.getState().meetings[0];
    const labels = series.map((item) => item.label);
    const stack = units.map((unit) => ({
      name: unit.name,
      color: unit.color,
      values: D.monthKey ? Array.from({ length: 6 }, (_, index) => S.unitSummary(unit.id, D.monthKey(index - 5)).income) : []
    }));
    const donutSegments = unitSummaries.filter((item) => item.income > 0).map((item) => ({
      label: item.unit.name,
      value: item.income,
      color: item.unit.color,
      display: moneyC(item.income)
    }));
    const activity = S.getState().audit.slice(0, 5);
    const week = S.weekSummary();
    const activeUnits = S.getState().units.filter((unit) => unit.active).map((unit) => unit.name.toLowerCase());
    const unitList = activeUnits.length > 2
      ? `${activeUnits.slice(0, -1).join(", ")} y ${activeUnits[activeUnits.length - 1]}`
      : activeUnits.join(" y ");
    const monthlyGoal = Number(S.getState().settings.monthlyGoal || 0);
    const goalPct = monthlyGoal > 0 ? Math.min(100, Math.round((summary.revenue / monthlyGoal) * 100)) : 0;
    const goalMissing = Math.max(monthlyGoal - summary.revenue, 0);
    const isCurrentMonth = ui.month === D.monthKey(0);
    const today = new Date();
    const daysLeft = isCurrentMonth ? Math.max(0, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate()) : 0;
    const goalHint = isCurrentMonth
      ? `${goalMissing > 0 ? `Faltan ${moneyC(goalMissing)}` : "Meta cumplida"} · quedan ${daysLeft} ${daysLeft === 1 ? "día" : "días"}`
      : "Mes cerrado";

    return `<section class="page">
      ${pageHead({
        kicker: `Resumen · ${D.monthLabel(ui.month)}`,
        title: "Cómo vas este mes",
        desc: `Facturación, margen y pulso del equipo. <strong>${D.monthLabel(ui.month)}</strong> incluye ${unitList || "todas las unidades"}.`,
        actions: `${monthSwitcher()}${btn("Cargar facturación", { action: "billing", icon: "wallet", variant: "primary" })}`,
        meta: `<span><svg><use href="#i-pin"/></svg>${esc(S.getState().settings.businessName || "Masivo")} · Canning</span><span><svg><use href="#i-refresh"/></svg>Actualizado ${relative(S.getState().updatedAt)}</span>`,
        hero: true
      })}

      <div class="owner-top">
      <article class="owner-hero" data-reveal>
        <div class="owner-hero-main">
          <span class="owner-hero-label"><i></i>Facturación de ${D.monthLabel(ui.month).toLowerCase()}</span>
          <div class="owner-hero-value">${moneyC(summary.revenue)}<small>ARS</small></div>
          <div class="owner-hero-deltas">
            <span class="delta ${summary.revenueDelta >= 0 ? "up" : "down"}">${summary.revenueDelta >= 0 ? "↑" : "↓"} ${Math.abs(summary.revenueDelta).toFixed(1).replace(".", ",")}%</span>
            <span>vs. mes anterior</span>
            <span class="status ${summary.marginPct >= 30 ? "status--ok" : "status--warn"}">${pct(summary.marginPct)} de margen</span>
          </div>
          <div class="owner-hero-goal">
            <div class="owner-hero-goal-head"><span>Meta del mes <b>${moneyC(monthlyGoal)}</b></span><b>${goalPct}%</b></div>
            <div class="owner-hero-track"><span style="--value:${goalPct}%"></span></div>
            <p class="owner-hero-hint">${goalHint}</p>
          </div>
        </div>
        <div class="owner-hero-side">
          <div class="owner-hero-minis">
            <div class="owner-mini"><span>Margen estimado</span><b>${moneyC(summary.margin)}</b><small>${pct(summary.marginPct)} de la facturación</small></div>
            <div class="owner-mini"><span>Alumnos activos</span><b>${num(summary.activeStudents)}</b><small>+${num(summary.newStudents)} este mes</small></div>
            <div class="owner-mini"><span>Contenido</span><b>${summary.contentCompliance}%</b><small>meta semanal del equipo</small></div>
            <div class="owner-mini"><span>Strikes activos</span><b>${num(summary.activeStrikes)}</b><small>límite ${S.getState().settings.strikeLimit} por persona</small></div>
          </div>
        </div>
      </article>
      ${lamboCard(goalPct)}
      </div>

      <div class="week-strip" data-reveal>
        <div class="week-item"><span>Ingresos de la semana</span><b>${moneyC(week.income)}</b><small>${D.weekLabel(week.start)}</small></div>
        <div class="week-item"><span>Leads nuevos</span><b>${week.leads}</b><small>consultas que entraron</small></div>
        <div class="week-item"><span>Contenido publicado</span><b>${week.published}<em>/${week.contentGoal}</em></b><small>meta del equipo</small></div>
        <div class="week-item"><span>Alumnos nuevos</span><b>${week.newStudents}</b><small>inscriptos esta semana</small></div>
        <div class="week-item"><span>Tareas cerradas</span><b>${week.doneTasks}</b><small>${summary.overdueTasks} vencidas hoy</small></div>
        <div class="week-item"><span>Strikes activos</span><b>${week.strikes}</b><small>límite ${S.getState().settings.strikeLimit} por persona</small></div>
      </div>

      <div class="grid grid--2-1">
        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered">
            <div><h2 class="panel-title">Ingresos vs. costos</h2><p class="panel-sub">Últimos 6 meses · todas las unidades</p></div>
            <div class="chart-legend">
              <span class="legend-item"><i class="legend-dot" style="--color:#a78bfa"></i>Ingresos</span>
              <span class="legend-item"><i class="legend-dot" style="--color:#fb7185"></i>Costos</span>
            </div>
          </div>
          <div class="panel-body chart-holder">${C.areaChart(labels, [
            { name: "Ingresos", values: series.map((item) => item.income), color: "#a78bfa" },
            { name: "Costos", values: series.map((item) => item.cost), color: "#fb7185" }
          ], { height: 275 })}</div>
          <div class="panel-foot"><span>Margen acumulado ${moneyC(series.reduce((sum, item) => sum + item.margin, 0))}</span><span>Moneda: ARS</span></div>
        </article>

        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Para mirar hoy</h2><p class="panel-sub">${alerts.length} alertas activas</p></div><span class="status status--warn">Prioridad</span></div>
          ${alerts.length ? `<div class="alert-list">${alerts.slice(0, 5).map((alert) => `
            <button class="alert-item ${alert.tone === "danger" ? "danger" : ""}" type="button" data-action="go" data-route="${esc(alert.route)}">
              <span class="alert-icon"><svg><use href="#i-${alert.icon}"/></svg></span>
              <span class="alert-copy"><b>${esc(alert.title)}</b><small>${esc(alert.detail)}</small><span class="link-btn">Ver <svg><use href="#i-arrow"/></svg></span></span>
            </button>`).join("")}</div>` : `<div class="panel-body">${emptyState("Todo bajo control", "No hay alertas operativas ahora.", "check-circle")}</div>`}
        </article>
      </div>

      <div class="grid grid--2-1">
        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered">
            <div><h2 class="panel-title">Ingresos por unidad</h2><p class="panel-sub">Composición de los últimos 6 meses</p></div>
            <a class="link-btn" href="#/unidades">Ver unidades <svg><use href="#i-arrow"/></svg></a>
          </div>
          <div class="panel-body chart-holder">${C.stackedBars(labels, stack, { height: 270 })}</div>
          <div class="panel-body panel-body--tight"><div class="unit-mini-grid">
            ${unitSummaries.map((item) => `<div class="unit-mini" style="--unit-color:${item.unit.color}">
              <div class="unit-mini-top"><span>${esc(item.unit.name)}</span><svg><use href="#i-${item.unit.icon}"/></svg></div>
              <b>${moneyC(item.income)}</b>
              <small>${pct(item.marginPct)} margen</small>
            </div>`).join("")}
          </div></div>
        </article>

        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Mix del mes</h2><p class="panel-sub">Participación por facturación</p></div></div>
          <div class="panel-body" style="display:flex;flex-direction:column;align-items:center;gap:16px">
            ${C.donut(donutSegments, { size: 168, thickness: 13, center: moneyC(summary.revenue), sub: "total del mes", label: "Mix de unidades" })}
            <div class="chart-legend" style="justify-content:center">
              ${unitSummaries.map((item) => `<span class="legend-item"><i class="legend-dot" style="--color:${item.unit.color}"></i>${esc(item.unit.name)}</span>`).join("")}
            </div>
          </div>
          <div class="panel-foot"><span>Margen ${moneyC(summary.margin)}</span><span>${pct(summary.marginPct)}</span></div>
        </article>
      </div>

      <div class="grid grid--2-1">
        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered">
            <div><h2 class="panel-title">Contenido de la semana</h2><p class="panel-sub">Meta: ${S.getState().settings.contentGoal} piezas por barbero</p></div>
            <a class="link-btn" href="#/contenido">Abrir tablero <svg><use href="#i-arrow"/></svg></a>
          </div>
          <div class="content-mini-list">${content.map((item) => `
            <div class="content-mini">
              ${avatar(item.barber, "avatar--sm")}
              <div><b>${esc(item.barber.name)}</b><small>${item.published}/${item.goal} publicadas</small></div>
              ${progressBar(item.compliance, item.compliance >= 100 ? "green" : item.compliance < 50 ? "amber" : "")}
              <span>${item.compliance}%</span>
            </div>`).join("")}</div>
          <div class="panel-foot"><span>Promedio del equipo: ${S.averageContentCompliance()}%</span><a class="link-btn" href="#/contenido">Cargar pieza <svg><use href="#i-plus"/></svg></a></div>
        </article>

        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Últimos movimientos</h2><p class="panel-sub">Quién hizo qué</p></div><a class="link-btn" href="#/auditoria">Auditoría <svg><use href="#i-arrow"/></svg></a></div>
          <div class="activity-list">${activity.map((item) => {
            const user = S.userById(item.userId);
            return `<div class="activity-item">
              <span class="activity-icon"><svg><use href="#i-${auditIcon(item.entity)}"/></svg></span>
              <div class="activity-copy"><p><b>${esc(user?.name || "Sistema")}</b> ${esc(item.action)} ${esc(item.entity.toLowerCase())} · ${esc(item.detail)}</p><time>${relative(item.at)}</time></div>
            </div>`;
          }).join("")}</div>
        </article>
      </div>

      ${meeting ? `<article class="panel panel--violet" data-reveal>
        <div class="panel-head panel-head--bordered">
          <div><span class="kicker"><i></i>Último MeetBarber</span><h2 class="panel-title" style="margin-top:6px">${esc(meeting.title)}</h2><p class="panel-sub">${dateFull(meeting.date)} · ${meeting.attendees.length} personas</p></div>
          <a class="link-btn" href="#/operacion/reuniones">Ver reuniones <svg><use href="#i-arrow"/></svg></a>
        </div>
        <div class="panel-body" style="display:flex;gap:24px;flex-wrap:wrap">
          <p style="flex:1;min-width:240px;color:var(--muted);font-size:12px;line-height:1.65">${esc(meeting.notes)}</p>
          <div style="min-width:220px"><h3 class="field-label" style="margin-bottom:5px">Decisiones</h3><ul class="decision-list">${meeting.decisions.map((decision) => `<li>${esc(decision)}</li>`).join("")}</ul></div>
        </div>
      </article>` : ""}
    </section>`;
  }

  function renderManagerDashboard() {
    const user = S.currentUser();
    const open = S.openTasks();
    const overdue = S.overdueTasks();
    const checklistsToday = S.getState().checklists.map((checklist) => {
      const run = S.getState().checklistRuns.find((item) => item.checklistId === checklist.id && item.date === D.iso(new Date()));
      return { checklist, done: run ? run.completed.length : 0 };
    });
    const doneChecklists = checklistsToday.filter((item) => item.done >= item.checklist.items.length).length;
    const alerts = S.alerts();
    const content = S.contentOverview();
    const meeting = S.getState().meetings[0];
    const pendingTraining = S.barbers().reduce((sum, barber) => sum + S.trainingStats(barber.id).pending, 0);
    const totalStrikes = S.barbers().reduce((sum, barber) => sum + S.activeStrikes(barber.id).length, 0);
    const contentBars = content.map((item) => ({ label: item.barber.name.split(" ")[0], value: item.compliance, color: item.compliance >= 100 ? "#34d399" : "#a78bfa", display: `${item.compliance}%` }));

    return `<section class="page">
      ${pageHead({
        kicker: `${S.roleLabel(user.role)} · ${weeklyKicker()}`,
        title: "Tu semana en orden",
        desc: "Tareas, checklists, contenido y el pulso del equipo. <strong>Sin finanzas: todo lo del día.</strong>",
        actions: `${btn("Nueva tarea", { action: "task", icon: "plus", variant: "primary" })}${btn("Checklist", { action: "go", route: "operacion/checklists", icon: "check-square" })}`,
        meta: `<span><svg><use href="#i-clock"/></svg>${relative(S.getState().updatedAt)}</span><span><svg><use href="#i-users"/></svg>${S.barbers().length} barberos activos</span>`,
        hero: true
      })}

      <div class="metric-grid">
        ${metricCard({ label: "Tareas abiertas", counterValue: open.length, format: "number", icon: "check-square", foot: `${overdue.length} vencidas`, spark: C.spark([9, 8, 11, 9, 12, open.length], { color: "#a78bfa" }) })}
        ${metricCard({ label: "Checklists de hoy", value: `${doneChecklists}<small>/${checklistsToday.length}</small>`, icon: "list", tone: "green", foot: "apertura, cierre y limpieza" })}
        ${metricCard({ label: "Cumplimiento contenido", counterValue: S.averageContentCompliance(), format: "number", suffix: "%", icon: "image", foot: "meta semanal del equipo", spark: C.spark([55, 60, 58, 70, 76, S.averageContentCompliance()], { color: "#a78bfa" }) })}
        ${metricCard({ label: "Capacitaciones pendientes", counterValue: pendingTraining, format: "number", icon: "graduation", tone: "violet", foot: "en todo el equipo" })}
        ${metricCard({ label: "Strikes activos", counterValue: totalStrikes, format: "number", icon: "shield", tone: totalStrikes ? "red" : "green", foot: "seguimiento del encargado" })}
        ${metricCard({ label: "Alertas operativas", counterValue: alerts.length, format: "number", icon: "alert", tone: alerts.length ? "amber" : "green", foot: "para resolver hoy" })}
      </div>

      <div class="grid grid--2-1">
        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Ritmo del equipo</h2><p class="panel-sub">Cumplimiento de contenido por barbero · esta semana</p></div><a class="link-btn" href="#/contenido">Abrir <svg><use href="#i-arrow"/></svg></a></div>
          <div class="panel-body chart-holder">${C.barChart(contentBars, { height: 225, label: "Contenido por barbero" })}</div>
        </article>
        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Alertas</h2><p class="panel-sub">${alerts.length} para revisar</p></div></div>
          ${alerts.length ? `<div class="alert-list">${alerts.slice(0, 4).map((alert) => `<button class="alert-item ${alert.tone === "danger" ? "danger" : ""}" type="button" data-action="go" data-route="${esc(alert.route)}"><span class="alert-icon"><svg><use href="#i-${alert.icon}"/></svg></span><span class="alert-copy"><b>${esc(alert.title)}</b><small>${esc(alert.detail)}</small></span></button>`).join("")}</div>` : `<div class="panel-body">${emptyState("Sin alertas", "El equipo está al día.", "check-circle")}</div>`}
        </article>
      </div>

      <div class="grid grid--2-1">
        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Tareas críticas</h2><p class="panel-sub">Abiertas con fecha más próxima</p></div><a class="link-btn" href="#/operacion/tareas">Ver tablero <svg><use href="#i-arrow"/></svg></a></div>
          <div class="table-wrap"><table class="data-table"><thead><tr><th>Tarea</th><th>Responsable</th><th>Vence</th><th>Prioridad</th></tr></thead><tbody>
            ${open.slice().sort((a, b) => a.due.localeCompare(b.due)).slice(0, 6).map((task) => {
              const assignee = S.userById(task.assigneeId);
              const late = task.due < D.iso(new Date());
              return `<tr><td><b style="font-size:12px">${esc(task.title)}</b><small style="display:block;color:var(--muted-2);font-size:12.5px">${esc(S.unitById(task.unitId)?.name || "")}</small></td><td>${userInline(assignee)}</td><td><span class="${late ? "text-red" : ""}" style="font-family:var(--font-mono);font-size:12.5px">${date(task.due)}</span></td><td><span class="priority ${task.priority}">${esc(task.priority)}</span></td></tr>`;
            }).join("") || `<tr><td colspan="4">${emptyState("Sin tareas abiertas", "Todo al día.", "check-circle")}</td></tr>`}
          </tbody></table></div>
        </article>

        <div class="stack">
          <article class="panel" data-reveal>
            <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Checklists de hoy</h2><p class="panel-sub">Apertura, cierre, limpieza</p></div></div>
            <div class="panel-body" style="display:flex;flex-direction:column;gap:10px">
              ${checklistsToday.map(({ checklist, done }) => `
                <button type="button" data-action="run-checklist" data-id="${checklist.id}" style="text-align:left;display:flex;flex-direction:column;gap:4px">
                  <span style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:12px;font-weight:600">${esc(checklist.title)}</b><small style="font-family:var(--font-mono);font-size:12px;color:var(--muted-2)">${done}/${checklist.items.length}</small></span>
                  ${progressBar((done / checklist.items.length) * 100, done >= checklist.items.length ? "green" : "violet")}
                </button>`).join("")}
            </div>
          </article>
          ${meeting ? `<article class="panel panel--violet" data-reveal><div class="panel-head"><div><h2 class="panel-title">${esc(meeting.title)}</h2><p class="panel-sub">${dateFull(meeting.date)} · ${meeting.attendees.length} personas</p></div></div><div class="panel-body"><p style="color:var(--muted);font-size:11.5px;line-height:1.6">${esc(meeting.notes)}</p><a class="link-btn" href="#/operacion/reuniones" style="margin-top:9px">Ver acta <svg><use href="#i-arrow"/></svg></a></div></article>` : ""}
        </div>
      </div>
    </section>`;
  }

  function renderBarberHome() {
    const user = S.currentUser();
    const stats = S.barberStats(user.id);
    const content = stats.content;
    const tasks = S.openTasks(user.id).slice().sort((a, b) => a.due.localeCompare(b.due));
    const points = S.getState().points.filter((item) => item.userId === user.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    const pendingTraining = S.trainingStats(user.id).pending;
    const latestReport = S.getState().reports.find((report) => report.userId === user.id);
    const strikes = S.activeStrikes(user.id);
    const meet = S.getState().meetings[0];

    return `<section class="page">
      <header class="page-head page-head--hero">
        <div class="page-head-copy">
          <span class="kicker"><i></i>Tu semana · ${D.weekLabel(D.weekStart(0))}</span>
          <h1 class="page-title">Buenas, ${esc(user.name.split(" ")[0])}</h1>
          <p class="page-desc">Esto es lo tuyo: <strong>puntos, contenido, tareas y capacitaciones.</strong> Sin vueltas.</p>
          <div class="page-meta"><span><svg><use href="#i-scissors"/></svg>${esc(S.roleLabel(user.role))} · ${stats.user.commission}% comisión</span><span><svg><use href="#i-calendar"/></svg>Desde ${dateFull(user.startedAt)}</span></div>
        </div>
        <div class="page-actions">${btn("Subir contenido", { action: "content", icon: "plus", variant: "primary" })}${btn("Mi ficha", { action: "go", route: "mi-ficha", icon: "user" })}</div>
      </header>

      ${strikes.length ? `<div class="risk-banner"><svg><use href="#i-alert"/></svg><div><b>Tenés ${strikes.length} strike${strikes.length > 1 ? "s" : ""} activo${strikes.length > 1 ? "s" : ""}</b><p>A los ${S.getState().settings.strikeLimit} strikes la marca puede discontinuar la relación. Podés dejar tu descargo en Mis puntos.</p></div><a class="btn btn--danger btn--sm" href="#/mis-puntos">Ver detalle</a></div>` : ""}

      <div class="metric-grid metric-grid--4">
        ${metricCard({ label: "Mis puntos", counterValue: stats.points, format: "number", icon: "zap", foot: "acumulados este año", spark: C.spark([30, 55, 70, 90, stats.points], { color: "#a78bfa" }) })}
        ${metricCard({ label: "Contenido semanal", value: `${content.compliance}<small>%</small>`, icon: "image", tone: content.compliance >= 100 ? "green" : "amber", foot: `${content.published}/${content.goal} publicadas` })}
        ${metricCard({ label: "Strikes activos", value: `${stats.strikes}<small>/${S.getState().settings.strikeLimit}</small>`, icon: "shield", tone: stats.strikes ? "red" : "green", foot: stats.strikes ? "revisá el descargo" : "todo limpio" })}
        ${metricCard({ label: "Capacitaciones", value: `${stats.training.approved}<small>/${stats.training.total}</small>`, icon: "graduation", tone: "violet", foot: pendingTraining ? `${pendingTraining} pendientes` : "todas aprobadas" })}
      </div>

      <div class="grid grid--2-1">
        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Tu contenido de la semana</h2><p class="panel-sub">Grabado → Drive → publicado</p></div><span class="status ${content.compliance >= 100 ? "status--ok" : "status--warn"}">${content.compliance >= 100 ? "Meta cumplida" : "En progreso"}</span></div>
          <div class="panel-body" style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">
            ${C.ring(content.compliance, { size: 116, thickness: 8, color: content.compliance >= 100 ? "#34d399" : "#a78bfa", label: "cumplido" })}
            <div style="flex:1;min-width:180px;display:flex;flex-direction:column;gap:7px">
              <div class="pipeline">
                <span class="pipeline-step ${content.pieces.length ? "done" : ""}"><b>${content.recorded}</b> grabado</span>
                <span class="pipeline-step ${content.inDrive ? "done" : ""}"><b>${content.inDrive}</b> en Drive</span>
                <span class="pipeline-step ${content.published ? "done" : ""}"><b>${content.published}</b> publicadas</span>
              </div>
              ${content.pieces.length ? `<div class="piece-list">${content.pieces.map((piece) => `<div class="piece"><span class="piece-copy"><b>${esc(piece.title)}</b><small>${esc(piece.type)} · ${stageLabel(piece.stage)}</small></span>${stageChip(piece.stage)}${piece.stage !== "publicado" ? `<button class="row-action" type="button" data-action="advance-content" data-id="${piece.id}" title="Avanzar etapa"><svg><use href="#i-arrow"/></svg></button>` : ""}</div>`).join("")}</div>` : `<div class="content-empty">Todavía no cargaste piezas esta semana. Sumá la primera.</div>`}
            </div>
          </div>
          <div class="panel-foot"><span>Meta: ${content.goal} piezas semanales</span><a class="link-btn" href="#/mi-contenido">Abrir tablero <svg><use href="#i-arrow"/></svg></a></div>
        </article>

        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Tus puntos</h2><p class="panel-sub">Últimos movimientos</p></div><a class="link-btn" href="#/mis-puntos">Ver todo <svg><use href="#i-arrow"/></svg></a></div>
          <div class="activity-list">${points.length ? points.map((item) => `<div class="activity-item"><span class="activity-icon"><svg><use href="#i-${pointIcon(item.category)}"/></svg></span><div class="activity-copy"><p><b style="color:var(--cyan)">+${item.points}</b> · ${esc(item.reason)}</p><time>${date(item.date)} · ${esc(categoryLabel(item.category))}</time></div></div>`).join("") : emptyState("Sin puntos todavía", "Publicá contenido o aprobá una capacitación.", "zap")}</div>
        </article>
      </div>

      <div class="grid grid--2-1">
        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Tus tareas</h2><p class="panel-sub">Lo que tenés pendiente</p></div><a class="link-btn" href="#/mis-tareas">Ver todas <svg><use href="#i-arrow"/></svg></a></div>
          <div class="table-wrap"><table class="data-table"><thead><tr><th>Tarea</th><th>Vence</th><th>Estado</th><th><span class="sr-only">Acciones</span></th></tr></thead><tbody>
            ${tasks.length ? tasks.slice(0, 5).map((task) => `<tr><td><b style="font-size:12px">${esc(task.title)}</b><small style="display:block;color:var(--muted-2);font-size:12.5px">${esc(S.unitById(task.unitId)?.name || "")}</small></td><td><span style="font-family:var(--font-mono);font-size:12.5px" class="${task.due < D.iso(new Date()) ? "text-red" : ""}">${date(task.due)}</span></td><td>${status(task.status === "en-curso" ? "En curso" : "Pendiente", task.status === "en-curso" ? "info" : "warn")}</td><td><button class="row-action" type="button" data-action="complete-task" data-id="${task.id}" title="Marcar hecha"><svg><use href="#i-check"/></svg></button></td></tr>`).join("") : `<tr><td colspan="4">${emptyState("Sin tareas pendientes", "Buenísimo.", "check-circle")}</td></tr>`}
          </tbody></table></div>
        </article>

        <div class="stack">
          <article class="panel ${pendingTraining ? "panel--accent" : ""}" data-reveal>
            <div class="panel-head panel-head--bordered"><div><span class="kicker"><i></i>Capacitación</span><h2 class="panel-title" style="margin-top:6px">${pendingTraining ? "Te queda una para cerrar" : "Todo aprobado"}</h2></div></div>
            <div class="panel-body"><p style="color:var(--muted);font-size:12px;line-height:1.6">${pendingTraining ? `Tenés ${pendingTraining} capacitaciones pendientes. Aprobarlas suma ${S.getState().settings.pointsTraining} puntos cada una.` : "Ya completaste todas las capacitaciones disponibles. Ahora a la práctica."}</p><a class="btn btn--primary btn--sm" href="#/mis-capacitaciones" style="margin-top:11px">${pendingTraining ? "Rendir ahora" : "Ver mis capacitaciones"} <svg><use href="#i-arrow"/></svg></a></div>
          </article>
          ${latestReport ? `<article class="panel" data-reveal><div class="panel-head"><div><h2 class="panel-title">Último reporte</h2><p class="panel-sub">${dateFull(latestReport.date)} · ${esc(latestReport.type)}</p></div></div><div class="panel-body"><p style="color:var(--muted);font-size:11.5px;line-height:1.6">${esc(latestReport.summary)}</p><div class="report-metrics" style="margin-top:9px"><span><b>${latestReport.metrics.cortes}</b> cortes</span><span><b>${latestReport.metrics.ventas}</b> ventas</span><span><b>${latestReport.metrics.resenas}</b> reseñas</span></div></div></article>` : ""}
        </div>
      </div>

      ${meet ? `<div class="panel" data-reveal><div class="panel-head panel-head--bordered"><div><span class="kicker"><i></i>MeetBarber</span><h2 class="panel-title" style="margin-top:6px">${esc(meet.title)}</h2><p class="panel-sub">${dateFull(meet.date)}</p></div></div><div class="panel-body"><p style="color:var(--muted);font-size:12px;line-height:1.65">${esc(meet.notes)}</p></div></div>` : ""}
    </section>`;
  }

  /* ---------------- etiquetas compartidas ---------------- */

  const PRIORITY_LABEL = { alta: "Alta", media: "Media", baja: "Baja" };
  const TASK_STATUS = {
    pendiente: { label: "Pendiente", tone: "warn" },
    "en-curso": { label: "En curso", tone: "info" },
    hecha: { label: "Hecha", tone: "ok" }
  };
  const STAGE_LABEL = { grabado: "Grabado", drive: "En Drive", publicado: "Publicado" };
  const STAGE_TONE = { grabado: "warn", drive: "violet", publicado: "ok" };
  const LEVEL_LABEL = { inicial: "Inicial", intermedio: "Intermedio", avanzado: "Avanzado", dueno: "Dueño" };
  const POINT_LABEL = { contenido: "Contenido", capacitacion: "Capacitación", ventas: "Ventas", equipo: "Equipo", manual: "Manual" };
  const LEAD_STAGE = {
    consulta: { label: "Consulta", color: "#fbbf24", tone: "amber" },
    entrevista: { label: "Entrevista", color: "#e879f9", tone: "violet" },
    inscripto: { label: "Inscripto", color: "#34d399", tone: "green" },
    perdido: { label: "Perdido", color: "#7b7196", tone: "muted" }
  };

  function stageLabel(stage) {
    return STAGE_LABEL[stage] || stage;
  }

  function stageChip(stage) {
    return status(stageLabel(stage), STAGE_TONE[stage] || "muted");
  }

  function pointIcon(category) {
    return { contenido: "image", capacitacion: "graduation", ventas: "coins", equipo: "users", manual: "zap" }[category] || "zap";
  }

  function categoryLabel(category) {
    return POINT_LABEL[category] || category;
  }

  function auditIcon(entity) {
    return {
      Tarea: "check-square",
      Lead: "target",
      Puntos: "zap",
      Strike: "shield",
      Facturación: "wallet",
      Pago: "coins",
      Unidad: "layers",
      Checklist: "list",
      Contenido: "image",
      Capacitación: "graduation",
      Persona: "users",
      Roles: "shield",
      Configuración: "settings",
      Datos: "grid",
      Asistencia: "calendar",
      Producto: "package",
      Stock: "package",
      Reunión: "message",
      Reporte: "file",
      Movimiento: "coins",
      Ingreso: "coins",
      Costo: "coins",
      Cohorte: "graduation",
      Alumno: "graduation"
    }[entity] || "grid";
  }

  function shiftMonth(key, delta) {
    const [year, month] = String(key).split("-").map(Number);
    const date = new Date(year, month - 1 + delta, 1, 12);
    return `${date.getFullYear()}-${D.pad(date.getMonth() + 1)}`;
  }

  function monthSwitcherFor(label, prevAction, nextAction) {
    return `<div class="month-switcher">
      <button type="button" data-action="${prevAction}" aria-label="Anterior"><svg><use href="#i-chevron" style="transform:rotate(90deg)"/></svg></button>
      <span>${esc(label)}</span>
      <button type="button" data-action="${nextAction}" aria-label="Siguiente"><svg><use href="#i-chevron" style="transform:rotate(-90deg)"/></svg></button>
    </div>`;
  }

  function tabs(items, active) {
    return `<nav class="page-tabs">${items.map((item) => `
      <button class="tab ${item.key === active ? "active" : ""}" type="button" data-action="go" data-route="${esc(item.route)}">
        ${esc(item.label)}${item.badge ? `<span class="tab-badge">${item.badge}</span>` : ""}
      </button>`).join("")}</nav>`;
  }

  function userOptions(selected, filter = "all") {
    return S.getState().users
      .filter((user) => filter === "all" || user.role === filter)
      .map((user) => `<option value="${esc(user.id)}" ${user.id === selected ? "selected" : ""}>${esc(user.name)} · ${esc(S.roleLabel(user.role))}</option>`)
      .join("");
  }

  function barberOptions(selected) {
    return S.barbers().map((user) => `<option value="${esc(user.id)}" ${user.id === selected ? "selected" : ""}>${esc(user.name)}</option>`).join("");
  }

  function unitOptions(selected, activeOnly = false) {
    return S.getState().units
      .filter((unit) => !activeOnly || unit.active)
      .map((unit) => `<option value="${esc(unit.id)}" ${unit.id === selected ? "selected" : ""}>${esc(unit.name)}</option>`)
      .join("");
  }

  function cohortOptions(selected) {
    return S.getState().academy.cohorts.map((cohort) => `<option value="${esc(cohort.id)}" ${cohort.id === selected ? "selected" : ""}>${esc(cohort.name)} · ${esc(LEVEL_LABEL[cohort.level] || cohort.level)}</option>`).join("");
  }

  function studentOptions(selected) {
    return S.getState().academy.students
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((student) => `<option value="${esc(student.id)}" ${student.id === selected ? "selected" : ""}>${esc(student.name)}</option>`)
      .join("");
  }

  function strikeLimit() {
    return Number(S.getState().settings.strikeLimit || 3);
  }

  function strikeBadge(count) {
    const limit = strikeLimit();
    return `<span class="strike-count">${Array.from({ length: limit }, (_, index) => `<span class="${index < count ? "on" : ""}">${index < count ? "!" : "·"}</span>`).join("")}</span>`;
  }

  function textInput(name, label, value = "", options = {}) {
    const { type = "text", placeholder = "", required = false, full = false, min = "", max = "", step = "", hint = "" } = options;
    return `<div class="field ${full ? "field--full" : ""}">
      <label for="f-${name}">${esc(label)}</label>
      <input class="input" id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? "required" : ""} ${min !== "" ? `min="${min}"` : ""} ${max !== "" ? `max="${max}"` : ""} ${step !== "" ? `step="${step}"` : ""}>
      ${hint ? `<span class="form-hint">${esc(hint)}</span>` : ""}
    </div>`;
  }

  function textArea(name, label, value = "", options = {}) {
    const { placeholder = "", required = false, full = true, rows = 3 } = options;
    return `<div class="field ${full ? "field--full" : ""}">
      <label for="f-${name}">${esc(label)}</label>
      <textarea class="textarea" id="f-${name}" name="${name}" rows="${rows}" placeholder="${esc(placeholder)}" ${required ? "required" : ""}>${esc(value)}</textarea>
    </div>`;
  }

  function selectField(name, label, options, selected, extra = "", full = false) {
    return `<div class="field ${full ? "field--full" : ""}">
      <label for="f-${name}">${esc(label)}</label>
      <select class="select" id="f-${name}" name="${name}" ${extra}>${options}</select>
    </div>`;
  }

  function checkField(name, label, checked = false, hint = "") {
    return `<label class="checkbox field--full"><input type="checkbox" name="${name}" ${checked ? "checked" : ""}><span class="box"><svg><use href="#i-check"/></svg></span><span>${esc(label)}${hint ? ` <small class="form-hint">${esc(hint)}</small>` : ""}</span></label>`;
  }

  /* ---------------- unidades ---------------- */

  function renderUnits() {
    const state = S.getState();
    const units = state.units.filter((unit) => unit.active);
    const summaries = units.map((unit) => S.unitSummary(unit.id, ui.month));
    const totals = S.totalsForMonth(ui.month);
    const billing = S.manualBilling(ui.month);
    const billingTotal = billing.reduce((sum, tx) => sum + tx.amount, 0);
    const goal = Number(state.settings.monthlyGoal || units.reduce((sum, unit) => sum + Number(unit.goal || 0), 0));
    const txs = S.transactionsForMonth(ui.month)
      .filter((tx) => (!ui.txType || tx.type === ui.txType) && (!ui.unitFilter || tx.unitId === ui.unitFilter))
      .filter((tx) => {
        if (!ui.txQuery) return true;
        const query = ui.txQuery.toLowerCase();
        return `${tx.description} ${tx.category} ${S.unitById(tx.unitId)?.name || ""}`.toLowerCase().includes(query);
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    return `<section class="page">
      ${pageHead({
        kicker: `Control de negocio · ${D.monthLabel(ui.month)}`,
        title: "Unidades y finanzas",
        desc: "Cada ingreso y cada costo tiene una unidad. La facturación de barbería se carga a mano y se suma al resto.",
        actions: `${monthSwitcher()}${btn("Nueva unidad", { action: "new-unit", icon: "plus", variant: "ghost" })}${btn("Cargar movimiento", { action: "transaction", icon: "wallet", variant: "primary" })}`,
        meta: `<span><svg><use href="#i-target"/></svg>Meta ${moneyC(goal)}</span><span><svg><use href="#i-refresh"/></svg>${txs.length} movimientos</span>`,
        hero: true
      })}

      <div class="totals-strip" data-reveal>
        <div class="total-item"><span>Ingresos</span><b class="text-cyan">${counter(totals.income, "compact")}</b><small>${units.length} unidades activas</small></div>
        <div class="total-item"><span>Costos</span><b>${counter(totals.cost, "compact")}</b><small>${totals.income ? pct((totals.cost / totals.income) * 100) : "0%"} de los ingresos</small></div>
        <div class="total-item"><span>Margen</span><b class="${totals.margin >= 0 ? "text-green" : "text-red"}">${counter(totals.margin, "compact")}</b><small>${pct(totals.marginPct)} de margen</small></div>
        <div class="total-item"><span>Facturación barbería</span><b>${counter(billingTotal, "compact")}</b><small>${billing.length} carga${billing.length === 1 ? "" : "s"} manual${billing.length === 1 ? "" : "es"}</small></div>
      </div>

      <div class="unit-grid">
        ${summaries.map((item) => `<article class="unit-card" style="--unit-color:${item.unit.color}" data-reveal>
          <div class="unit-top">
            <div class="unit-id">
              <span class="unit-icon"><svg><use href="#i-${item.unit.icon}"/></svg></span>
              <div><h2 class="unit-name">${esc(item.unit.name)}</h2><span class="unit-kind">${esc(item.unit.kind)}</span></div>
            </div>
            <button class="row-action" type="button" data-action="edit-unit" data-id="${esc(item.unit.id)}" title="Editar unidad"><svg><use href="#i-edit"/></svg></button>
          </div>
          <div class="unit-metrics">
            <div class="unit-metric"><span>Ingresos</span><b>${moneyC(item.income)}</b><small>${item.transactions.filter((tx) => tx.type === "income").length} mov.</small></div>
            <div class="unit-metric"><span>Margen</span><b class="${item.margin >= 0 ? "text-green" : "text-red"}">${moneyC(item.margin)}</b><small>${pct(item.marginPct)}</small></div>
          </div>
          <div class="unit-goal">
            <div class="unit-goal-head"><span>Meta ${moneyC(item.goal)}</span><b>${Math.round(item.goalPct)}%</b></div>
            ${progressBar(item.goalPct, item.goalPct >= 100 ? "green" : "")}
          </div>
          <div class="unit-foot">
            <span class="unit-spark">${C.spark(S.unitSeries(item.unit.id, 6).map((entry) => entry.income), { color: item.unit.color, width: 112, height: 30 })}</span>
            <button class="link-btn" type="button" data-action="filter-unit" data-id="${esc(item.unit.id)}">Ver movimientos <svg><use href="#i-arrow"/></svg></button>
          </div>
        </article>`).join("")}
        <button class="unit-card" type="button" data-action="new-unit" style="--unit-color:#a89ec4;align-items:center;justify-content:center;min-height:226px;border-style:dashed;text-align:center" data-reveal>
          <span class="unit-icon" style="width:46px;height:46px"><svg><use href="#i-plus"/></svg></span>
          <span><b class="unit-name" style="font-size:17px">Sumar unidad</b><br><small class="unit-kind" style="display:inline-block;margin-top:4px">Ecommerce, servicios, lo que venga</small></span>
        </button>
      </div>

      <div class="grid grid--2-1">
        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered">
            <div><h2 class="panel-title">Facturación manual de barbería</h2><p class="panel-sub">El número que trae el dueño cada mes · ${esc(D.monthLabel(ui.month))}</p></div>
            ${btn("Cargar", { action: "billing", icon: "plus", variant: "soft", size: "sm" })}
          </div>
          ${billing.length ? `<div class="manual-billing">${billing.map((tx) => `<div class="manual-row">
            <div><b>${esc(tx.description || "Facturación mensual")}</b><small>${dateFull(tx.date)} · ${esc(S.userById(tx.createdBy)?.name || "Sistema")}</small></div>
            <span class="cell-amount">${money(tx.amount)}</span>
            <button class="row-action" type="button" data-action="edit-transaction" data-id="${esc(tx.id)}" title="Editar"><svg><use href="#i-edit"/></svg></button>
          </div>`).join("")}</div>` : `<div class="panel-body">${emptyState("Falta el cierre del mes", "Cargá la facturación de barbería para que el total cierre.", "wallet")}</div>`}
          <div class="panel-foot"><span>Total cargado a mano</span><b class="cell-amount text-cyan">${money(billingTotal)}</b></div>
        </article>

        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Cómo se compone</h2><p class="panel-sub">Ingresos por unidad</p></div></div>
          <div class="panel-body" style="display:flex;flex-direction:column;align-items:center;gap:14px">
            ${C.donut(summaries.filter((item) => item.income > 0).map((item) => ({ label: item.unit.name, value: item.income, color: item.unit.color, display: moneyC(item.income) })), { size: 166, thickness: 13, center: moneyC(totals.income), sub: "ingresos" })}
            <div class="chart-legend" style="justify-content:center">${summaries.map((item) => `<span class="legend-item"><i class="legend-dot" style="--color:${item.unit.color}"></i>${esc(item.unit.name)}</span>`).join("")}</div>
          </div>
        </article>
      </div>

      <article class="panel" data-reveal>
        <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Movimientos del mes</h2><p class="panel-sub">Todo lo que entró y salió · ${txs.length} registros</p></div></div>
        <div class="toolbar">
          <div class="filters">
            <div class="search-input"><svg><use href="#i-search"/></svg><input class="input input--sm" type="search" placeholder="Buscar movimiento…" value="${esc(ui.txQuery)}" data-filter="tx-query"></div>
            <select class="select select--sm" data-filter="tx-type" aria-label="Tipo">
              <option value="">Todos</option>
              <option value="income" ${ui.txType === "income" ? "selected" : ""}>Ingresos</option>
              <option value="cost" ${ui.txType === "cost" ? "selected" : ""}>Costos</option>
            </select>
            <select class="select select--sm" data-filter="tx-unit" aria-label="Unidad">
              <option value="">Todas las unidades</option>
              ${S.getState().units.map((unit) => `<option value="${esc(unit.id)}" ${ui.unitFilter === unit.id ? "selected" : ""}>${esc(unit.name)}</option>`).join("")}
            </select>
          </div>
          ${btn("Nuevo movimiento", { action: "transaction", icon: "plus", size: "sm", variant: "soft" })}
        </div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Fecha</th><th>Detalle</th><th>Unidad</th><th>Tipo</th><th>Monto</th><th><span class="sr-only">Acciones</span></th></tr></thead>
          <tbody>${txs.length ? txs.map((tx) => {
            const unit = S.unitById(tx.unitId);
            return `<tr>
              <td><span class="mono" style="font-size:12.5px">${date(tx.date)}</span></td>
              <td><div class="cell-main"><div><b>${esc(tx.description || tx.category)}</b><small>${esc(tx.category)}${tx.linkedType ? " · vinculado" : ""}</small></div></div></td>
              <td>${unitTag(unit)}</td>
              <td>${status(tx.type === "income" ? "Ingreso" : "Costo", tx.type === "income" ? "ok" : "danger")}</td>
              <td><span class="cell-amount ${tx.type === "income" ? "text-green" : "text-red"}">${tx.type === "income" ? "+" : "−"}${money(tx.amount)}</span></td>
              <td><div class="cell-actions">
                <button class="row-action" type="button" data-action="edit-transaction" data-id="${esc(tx.id)}" title="Editar"><svg><use href="#i-edit"/></svg></button>
                ${tx.linkedType ? "" : `<button class="row-action danger" type="button" data-action="confirm-delete" data-kind="transaction" data-id="${esc(tx.id)}" title="Eliminar"><svg><use href="#i-trash"/></svg></button>`}
              </div></td>
            </tr>`;
          }).join("") : `<tr><td colspan="6">${emptyState("Sin movimientos", "Probá con otro filtro o cargá el primero.", "wallet")}</td></tr>`}</tbody>
        </table></div>
      </article>
    </section>`;
  }

  /* ---------------- equipo ---------------- */

  function renderTeam() {
    const state = S.getState();
    const owner = S.isOwner();
    const roles = S.roles();
    const modules = S.modules();
    const users = state.users.slice().sort((a, b) => {
      const order = { owner: 0, manager: 1, academy: 2, barber: 3 };
      return (order[a.role] ?? 4) - (order[b.role] ?? 4) || a.name.localeCompare(b.name);
    });

    return `<section class="page">
      ${pageHead({
        kicker: "Personas · roles y accesos",
        title: "Equipo y permisos",
        desc: "Cuatro jerarquías con nombres editables. El dueño define qué módulos ve cada rol; el barbero nunca ve finanzas.",
        actions: owner ? `${btn("Nueva persona", { action: "new-user", icon: "plus", variant: "primary" })}` : "",
        meta: `<span><svg><use href="#i-users"/></svg>${state.users.filter((user) => user.active).length} activos</span><span><svg><use href="#i-shield"/></svg>${roles.length} jerarquías</span>`,
        hero: true
      })}

      <div class="settings-grid">
        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Nombres de los roles</h2><p class="panel-sub">Se usan en todo el panel. Vos decidís cómo se llaman.</p></div></div>
          <div class="panel-body">
            ${owner ? `<form data-inline="roles" class="role-editor">
              ${roles.map((role) => `<div class="role-row">
                <span>${esc(role)}</span>
                <input class="input input--sm" name="${role}" maxlength="28" value="${esc(state.roles[role]?.label || role)}" aria-label="Nombre del rol ${role}">
                <span class="status status--muted">${state.users.filter((user) => user.role === role).length} pers.</span>
              </div>`).join("")}
              <div class="form-actions"><button class="btn btn--soft btn--sm" type="submit"><svg><use href="#i-check"/></svg>Guardar nombres</button></div>
            </form>` : `<div class="role-editor">${roles.map((role) => `<div class="role-row"><span>${esc(role)}</span><b style="font-size:12.5px">${esc(state.roles[role]?.label || role)}</b><span class="status status--muted">${state.users.filter((user) => user.role === role).length}</span></div>`).join("")}</div>`}
          </div>
        </article>

        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Separación de accesos</h2><p class="panel-sub">Qué módulos ve cada jerarquía</p></div>${S.can("config.permissions") ? `<a class="link-btn" href="#/config">Editar permisos <svg><use href="#i-arrow"/></svg></a>` : ""}</div>
          <div class="panel-body panel-body--flush"><div class="table-wrap"><table class="data-table permission-table">
            <thead><tr><th>Módulo</th>${roles.map((role) => `<th>${esc(state.roles[role]?.label || role)}</th>`).join("")}</tr></thead>
            <tbody>${modules.map((module) => `<tr><td><b style="font-size:12px">${esc(module.label)}</b></td>${roles.map((role) => {
              const allowed = role === "owner" || S.permissionsFor(role).includes(module.key);
              return `<td class="${allowed ? "perm-yes" : "perm-no"}">${allowed ? "✓" : "—"}</td>`;
            }).join("")}</tr>`).join("")}</tbody>
          </table></div></div>
        </article>
      </div>

      <article class="panel" data-reveal>
        <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Equipo completo</h2><p class="panel-sub">${users.length} personas en el sistema · usuario y clave se editan desde Configuración</p></div>${owner ? btn("Sumar persona", { action: "new-user", icon: "plus", size: "sm", variant: "soft" }) : ""}</div>
        <div class="panel-body">
          <div class="team-grid">
            ${users.map((user) => `<div class="team-card">
              ${avatar(user, "")}
              <div class="team-card-copy"><b>${esc(user.name)}</b><small>${esc(S.roleLabel(user.role))} · @${esc(user.username || "—")} · ${user.active ? "Activo" : "Inactivo"}</small></div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px">
                ${status(user.active ? "Activo" : "Inactivo", user.active ? "ok" : "muted")}
                ${owner ? `<div style="display:flex;gap:2px">
                  <button class="row-action" type="button" data-action="edit-user" data-id="${esc(user.id)}" title="Editar"><svg><use href="#i-edit"/></svg></button>
                  ${user.id === S.currentUserId() ? "" : `<button class="row-action danger" type="button" data-action="toggle-user" data-id="${esc(user.id)}" title="${user.active ? "Desactivar" : "Activar"}"><svg><use href="#i-${user.active ? "x" : "check"}"/></svg></button>`}
                </div>` : ""}
              </div>
            </div>`).join("")}
          </div>
        </div>
      </article>
    </section>`;
  }

  /* ---------------- barberos ---------------- */

  function renderBarbers() {
    const barbers = S.barbers();
    const month = ui.month;
    const totalPoints = barbers.reduce((sum, barber) => sum + S.userPoints(barber.id), 0);
    const totalStrikes = barbers.reduce((sum, barber) => sum + S.activeStrikes(barber.id).length, 0);
    const avgContent = S.averageContentCompliance();

    return `<section class="page">
      ${pageHead({
        kicker: "Personas · barberos",
        title: "Barberos",
        desc: "La ficha de cada barbero con puntos, strikes, contenido y capacitación. Todo el historial en un lugar.",
        actions: S.isOwner() ? btn("Nuevo barbero", { action: "new-barber", icon: "plus", variant: "primary" }) : btn("Ver equipo", { action: "go", route: "equipo", icon: "users" }),
        meta: `<span><svg><use href="#i-scissors"/></svg>${plural(barbers.length, "barbero", "barberos")}</span><span><svg><use href="#i-zap"/></svg>${num(totalPoints)} puntos</span><span><svg><use href="#i-shield"/></svg>${plural(totalStrikes, "strike activo", "strikes activos")}</span>`,
        hero: true
      })}

      <div class="metric-grid metric-grid--4">
        ${metricCard({ label: "Barberos activos", counterValue: barbers.length, format: "number", icon: "scissors", foot: "en el salón" })}
        ${metricCard({ label: "Puntos del equipo", counterValue: totalPoints, format: "number", icon: "zap", foot: "acumulados" })}
        ${metricCard({ label: "Contenido promedio", counterValue: avgContent, format: "number", suffix: "%", icon: "image", tone: avgContent >= 100 ? "green" : "amber", foot: "meta semanal" })}
        ${metricCard({ label: "Strikes activos", counterValue: totalStrikes, format: "number", icon: "shield", tone: totalStrikes ? "red" : "green", foot: `límite ${strikeLimit()} por persona` })}
      </div>

      <div class="roster-grid">
        ${barbers.map((barber) => {
          const stats = S.barberStats(barber.id);
          const content = stats.content;
          const strikes = S.activeStrikes(barber.id).length;
          const open = S.openTasks(barber.id).length;
          const training = S.trainingStats(barber.id);
          return `<article class="barber-card ${strikes >= 2 ? "is-risk" : ""}" data-reveal>
            <div class="barber-card-head">
              ${avatar(barber, "")}
              <div class="barber-id"><a class="barber-name" href="#/barbero/${esc(barber.id)}">${esc(barber.name)}</a><span class="barber-role">${esc(S.roleLabel(barber.role))} · ${barber.commission}% comisión</span></div>
            </div>
            <div class="barber-stats">
              <div class="barber-stat"><span>Puntos</span><b>${num(stats.points)}</b></div>
              <div class="barber-stat"><span>Strikes</span><b class="${strikes ? "text-red" : ""}">${strikes}</b></div>
              <div class="barber-stat"><span>Tareas</span><b>${open}</b></div>
            </div>
            <div class="barber-content">
              <span style="color:var(--muted-2);font-size:11px;font-weight:500">Contenido</span>
              <div class="progress ${content.compliance >= 100 ? "progress--green" : ""}"><span style="--value:${content.compliance}%"></span></div>
              <span>${content.compliance}%</span>
            </div>
            <div class="barber-card-foot">
              <small>${training.approved}/${training.total} capacitaciones · ${stats.reports} reportes</small>
              ${strikes >= 2 ? `<span class="risk-flag"><svg><use href="#i-alert"/></svg>En riesgo</span>` : `<a class="link-btn" href="#/barbero/${esc(barber.id)}">Ficha <svg><use href="#i-arrow"/></svg></a>`}
            </div>
          </article>`;
        }).join("") || emptyState("Todavía no hay barberos", "Sumá el primero desde Equipo.", "scissors")}
      </div>

      <article class="panel" data-reveal>
        <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Ranking de puntos</h2><p class="panel-sub">Objetivo y reconocimiento · no es sanción</p></div></div>
        <div class="panel-body"><div class="leaderboard">
          ${barbers.slice().sort((a, b) => S.userPoints(b.id) - S.userPoints(a.id)).map((barber, index) => {
            const points = S.userPoints(barber.id);
            const max = Math.max(...barbers.map((item) => S.userPoints(item.id)), 1);
            return `<div class="leader-row ${index === 0 ? "top" : ""}">
              <span class="leader-rank">${String(index + 1).padStart(2, "0")}</span>
              ${avatar(barber, "avatar--sm")}
              <div class="leader-copy"><b>${esc(barber.name)}</b><div class="progress"><span style="--value:${(points / max) * 100}%"></span></div></div>
              <span class="leader-points">${num(points)}<small> pts</small></span>
            </div>`;
          }).join("") || emptyState("Sin puntos", "Cuando haya movimientos aparecen acá.", "zap")}
        </div></div>
      </article>
    </section>`;
  }

  /* ---------------- ficha de barbero ---------------- */

  function renderBarberProfilePage(id, self = false) {
    const user = S.userById(id);
    if (!user) return `<section class="page">${pageHead({ kicker: "Ficha", title: "No encontramos a esa persona" })}${emptyState("Ficha inexistente", "Volvé al listado de barberos.", "user")}</section>`;
    if (S.isBarber() && user.id !== S.currentUserId()) {
      return `<section class="page">${emptyState("Ficha privada", "Solo podés ver tu propia ficha.", "lock")}</section>`;
    }

    const stats = S.barberStats(user.id);
    const content = stats.content;
    const training = stats.training;
    const strikes = S.getState().strikes.filter((strike) => strike.userId === user.id);
    const active = strikes.filter((strike) => S.strikeState(strike) === "activo");
    const reports = S.getState().reports.filter((report) => report.userId === user.id).sort((a, b) => b.date.localeCompare(a.date));
    const points = S.getState().points.filter((entry) => entry.userId === user.id).sort((a, b) => b.date.localeCompare(a.date));
    const tasks = S.tasksFor(user.id);
    const canManage = S.isOwner() || S.can("points.manage");

    const events = [
      ...points.map((entry) => ({ date: entry.date, type: "point", title: `+${entry.points} puntos · ${categoryLabel(entry.category)}`, detail: entry.reason, tone: "" })),
      ...strikes.map((strike) => ({ date: strike.date, type: "strike", title: `Strike · ${strike.reason}`, detail: S.strikeState(strike) === "activo" ? "Activo" : "Vencido o archivado", tone: "is-red" })),
      ...S.getState().trainingRecords.filter((record) => record.userId === user.id).map((record) => ({ date: record.date, type: "training", title: `${S.trainingById(record.trainingId)?.title || "Capacitación"} · ${record.status}`, detail: `${record.score}% de score`, tone: "is-violet" })),
      ...S.getState().contentPieces.filter((piece) => piece.userId === user.id && piece.publishedAt).map((piece) => ({ date: piece.publishedAt, type: "content", title: `Publicó ${piece.title}`, detail: `${piece.type} · ${stageLabel(piece.stage)}`, tone: "" })),
      ...reports.map((report) => ({ date: report.date, type: "report", title: `Reporte ${report.type}`, detail: report.summary, tone: "" })),
      ...tasks.filter((task) => task.status === "hecha").map((task) => ({ date: (task.completedAt || task.due || "").slice(0, 10), type: "task", title: "Completó una tarea", detail: task.title, tone: "" }))
    ].filter((event) => event.date).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 16);

    return `<section class="page">
      <div class="profile-hero ${active.length >= 2 ? "is-risk" : ""}" data-reveal>
        <div class="profile-id">
          ${avatar(user, "avatar--xl")}
          <div>
            <span class="kicker"><i></i>${self ? "Mi ficha" : "Ficha del barbero"} · desde ${dateFull(user.startedAt)}</span>
            <h1>${esc(user.name)}</h1>
            <p>${esc(S.roleLabel(user.role))} · ${esc(user.email || "sin email")} · ${esc(user.phone || "sin teléfono")}</p>
            <div class="profile-badges">
              ${status(user.active ? "Activo" : "Inactivo", user.active ? "ok" : "muted")}
              ${tag(`${user.commission}% comisión`)}
              ${active.length ? status(`${active.length} strike${active.length > 1 ? "s" : ""} activo${active.length > 1 ? "s" : ""}`, "danger") : status("Sin strikes activos", "ok")}
              ${tag(`${points.length} movimientos de puntos`)}
            </div>
          </div>
        </div>
        <div class="profile-metrics">
          <div class="profile-metric"><span>Puntos</span><b class="text-cyan">${num(stats.points)}</b></div>
          <div class="profile-metric"><span>Contenido</span><b class="${content.compliance >= 100 ? "text-green" : ""}">${content.compliance}%</b></div>
          <div class="profile-metric"><span>Capacitación</span><b>${training.approved}/${training.total}</b></div>
          <div class="profile-metric"><span>Strikes</span><b class="${active.length ? "text-red" : ""}">${active.length}/${strikeLimit()}</b></div>
        </div>
      </div>

      ${active.length ? `<div class="risk-banner"><svg><use href="#i-alert"/></svg><div style="flex:1"><b>${active.length >= 2 ? "Plan de acompañamiento activo" : "Seguimiento abierto"}</b><p>${active.length} de ${strikeLimit()} strikes activos. Al llegar al límite la marca puede discontinuar la relación. ${self ? "Podés dejar tu descargo en cada strike." : "Revisá el detalle y el descargo del barbero."}</p></div>${canManage ? `<div style="display:flex;gap:5px;flex-wrap:wrap">${btn("Sumar strike", { action: "new-strike", id: user.id, icon: "shield", variant: "danger", size: "sm" })}</div>` : ""}</div>` : ""}

      ${canManage ? `<div class="row" style="justify-content:flex-end">
        ${btn("Sumar puntos", { action: "new-points", id: user.id, icon: "zap", variant: "soft", size: "sm" })}
        ${btn("Registrar strike", { action: "new-strike", id: user.id, icon: "shield", size: "sm" })}
        ${btn("Reporte", { action: "new-report", id: user.id, icon: "file", size: "sm" })}
      </div>` : ""}

      <div class="profile-layout">
        <div class="profile-section">
          <article class="panel" data-reveal>
            <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Historial completo</h2><p class="panel-sub">Puntos, strikes, contenido, capacitaciones y tareas</p></div><span class="status status--muted">${events.length} eventos</span></div>
            <div class="panel-body"><div class="timeline">
              ${events.length ? events.map((event) => `<div class="timeline-item ${event.tone}">
                <span class="timeline-dot"></span>
                <div class="timeline-copy"><div class="timeline-head"><b>${esc(event.title)}</b><time>${date(event.date)}</time></div><p>${esc(event.detail)}</p></div>
              </div>`).join("") : emptyState("Sin historial todavía", "Los movimientos van a aparecer acá.", "clock")}
            </div></div>
          </article>

          <article class="panel" data-reveal>
            <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Contenido</h2><p class="panel-sub">Semana actual · ${content.published}/${content.goal} publicadas</p></div><a class="link-btn" href="#/contenido">Tablero <svg><use href="#i-arrow"/></svg></a></div>
            <div class="panel-body" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
              ${C.ring(content.compliance, { size: 94, thickness: 7, color: content.compliance >= 100 ? "#34d399" : "#a78bfa", label: "cumplido" })}
              <div style="flex:1;min-width:180px"><div class="pipeline" style="margin-bottom:8px"><span class="pipeline-step ${content.recorded ? "done" : ""}"><b>${content.recorded}</b> grabado</span><span class="pipeline-step ${content.inDrive ? "done" : ""}"><b>${content.inDrive}</b> Drive</span><span class="pipeline-step ${content.published ? "done" : ""}"><b>${content.published}</b> publicadas</span></div>
                ${content.pieces.length ? `<div class="piece-list">${content.pieces.map((piece) => `<div class="piece"><span class="piece-copy"><b>${esc(piece.title)}</b><small>${esc(piece.type)} · ${stageLabel(piece.stage)}</small></span>${stageChip(piece.stage)}</div>`).join("")}</div>` : `<div class="content-empty">Sin piezas esta semana.</div>`}
              </div>
            </div>
          </article>

          <article class="panel" data-reveal>
            <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Reportes de trabajo</h2><p class="panel-sub">${reports.length} registros</p></div>${canManage || self ? btn("Nuevo reporte", { action: "new-report", id: user.id, icon: "plus", size: "sm", variant: "soft" }) : ""}</div>
            <div class="panel-body" style="display:flex;flex-direction:column;gap:8px">
              ${reports.length ? reports.slice(0, 6).map((report) => `<div class="report-card"><div class="report-card-head"><b style="font-size:12.5px">${esc(report.type)}</b><span class="status status--muted">${date(report.date)}</span></div><p>${esc(report.summary)}</p><div class="report-metrics"><span><b>${report.metrics.cortes}</b> cortes</span><span><b>${report.metrics.ventas}</b> ventas</span><span><b>${report.metrics.resenas}</b> reseñas</span></div></div>`).join("") : emptyState("Sin reportes", "Todavía no cargó ninguno.", "file")}
            </div>
          </article>
        </div>

        <div class="stack">
          <article class="panel" data-reveal>
            <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Strikes</h2><p class="panel-sub">${active.length} activos de ${strikeLimit()}</p></div><div class="strike-count">${Array.from({ length: strikeLimit() }, (_, index) => `<span class="${index < active.length ? "on" : ""}">${index < active.length ? "!" : "·"}</span>`).join("")}</div></div>
            <div class="panel-body" style="display:flex;flex-direction:column;gap:7px">
              ${strikes.length ? strikes.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((strike) => `<div class="strike-mini"><div class="strike-mini-head"><b>${esc(strike.reason)}</b>${status(S.strikeState(strike) === "activo" ? "Activo" : S.strikeState(strike) === "archivado" ? "Archivado" : "Vencido", S.strikeState(strike) === "activo" ? "danger" : "muted")}</div><p>${esc(strike.detail)}</p><p style="margin-top:4px;color:var(--muted-2);font-size:12px">Vence ${dateFull(strike.expiresAt)} · ${esc(S.userById(strike.createdBy)?.name || "Sistema")}</p>${strike.response ? `<div class="response"><b>Descargo:</b> ${esc(strike.response)}</div>` : ""}</div>`).join("") : emptyState("Sin strikes", "Historial limpio.", "shield")}
            </div>
          </article>

          <article class="panel" data-reveal>
            <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Capacitaciones</h2><p class="panel-sub">${training.approved} aprobadas · ${training.failed} desaprobadas · ${training.pending} pendientes</p></div></div>
            <div class="panel-body" style="display:flex;flex-direction:column;gap:6px">
              ${S.getState().trainings.map((item) => {
                const record = training.records.filter((entry) => entry.trainingId === item.id).sort((a, b) => b.date.localeCompare(a.date))[0];
                return `<div class="piece"><span class="piece-copy"><b>${esc(item.title)}</b><small>${esc(LEVEL_LABEL[item.level] || item.level)} · ${item.minutes} min</small></span>${record ? status(record.status === "aprobado" ? `${record.score}%` : `${record.score}%`, record.status === "aprobado" ? "ok" : "danger") : status("Pendiente", "muted")}</div>`;
              }).join("")}
            </div>
          </article>

          <article class="panel" data-reveal>
            <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Tareas</h2><p class="panel-sub">${S.openTasks(user.id).length} abiertas · ${tasks.length} totales</p></div><button class="link-btn" type="button" data-action="task-filter-user" data-id="${esc(user.id)}">Ver tablero <svg><use href="#i-arrow"/></svg></button></div>
            <div class="panel-body" style="display:flex;flex-direction:column;gap:5px">
              ${S.openTasks(user.id).slice(0, 5).map((task) => `<div class="piece"><span class="piece-copy"><b>${esc(task.title)}</b><small>Vence ${date(task.due)}</small></span>${status(TASK_STATUS[task.status]?.label || task.status, TASK_STATUS[task.status]?.tone || "muted")}</div>`).join("") || `<div class="content-empty">Sin tareas abiertas.</div>`}
            </div>
          </article>
        </div>
      </div>
    </section>`;
  }

  /* ---------------- operación ---------------- */

  function renderOps() {
    const state = S.getState();
    const today = D.iso(new Date());
    let tasks = state.tasks.slice();
    if (ui.taskFilter === "mias") tasks = tasks.filter((task) => task.assigneeId === S.currentUserId());
    if (ui.taskFilter === "vencidas") tasks = tasks.filter((task) => task.status !== "hecha" && task.due < today);
    tasks.sort((a, b) => {
      if (a.status === "hecha" && b.status !== "hecha") return 1;
      if (b.status === "hecha" && a.status !== "hecha") return -1;
      return (a.due || "").localeCompare(b.due || "");
    });
    const columns = [
      { key: "pendiente", label: "Pendiente", color: "#fbbf24" },
      { key: "en-curso", label: "En curso", color: "#a78bfa" },
      { key: "hecha", label: "Hecha", color: "#34d399" }
    ];
    const checklists = state.checklists;
    const meetings = state.meetings.slice().sort((a, b) => b.date.localeCompare(a.date));

    return `<section class="page">
      ${pageHead({
        kicker: "Operación · el día a día",
        title: "Operación",
        desc: "Tareas con responsable y fecha, checklists que se repiten y las actas de MeetBarber. Nada queda en el aire.",
        actions: `${btn("Nueva tarea", { action: "task", icon: "plus", variant: "primary" })}${btn("Nueva reunión", { action: "meeting", icon: "message" })}`,
        meta: `<span><svg><use href="#i-check-square"/></svg>${S.openTasks().length} tareas abiertas</span><span><svg><use href="#i-alert"/></svg>${S.overdueTasks().length} vencidas</span>`,
        hero: true
      })}

      ${tabs([
        { key: "tareas", label: "Tareas", route: "operacion/tareas", badge: S.openTasks().length },
        { key: "checklists", label: "Checklists", route: "operacion/checklists" },
        { key: "reuniones", label: "Reuniones", route: "operacion/reuniones", badge: meetings.length }
      ], ui.opsTab)}

      ${ui.opsTab === "tareas" ? renderTaskBoard(tasks, columns, today) : ""}
      ${ui.opsTab === "checklists" ? renderChecklists(checklists) : ""}
      ${ui.opsTab === "reuniones" ? renderMeetings(meetings) : ""}
    </section>`;
  }

  function renderTaskBoard(tasks, columns, today) {
    const counts = columns.reduce((acc, column) => {
      acc[column.key] = tasks.filter((task) => task.status === column.key).length;
      return acc;
    }, {});
    return `<div class="row row--between">
      <div class="filters">
        ${[["todas", "Todas"], ["mias", "Mías"], ["vencidas", "Vencidas"]].map(([key, label]) => `<button class="chip chip--button ${ui.taskFilter === key ? "active" : ""}" type="button" data-action="task-filter" data-id="${key}">${label}</button>`).join("")}
      </div>
      <span class="section-sub">${tasks.length} tareas visibles · ${counts.hecha || 0} cerradas</span>
    </div>
    <div class="kanban">
      ${columns.map((column) => {
        const list = tasks.filter((task) => task.status === column.key);
        return `<div class="kanban-col" style="--col-color:${column.color}">
          <div class="kanban-head"><b>${column.label}</b><span>${list.length}</span></div>
          <div class="kanban-list">
            ${list.length ? list.map((task) => {
              const assignee = S.userById(task.assigneeId);
              const late = task.status !== "hecha" && task.due < today;
              const next = task.status === "pendiente" ? "en-curso" : task.status === "en-curso" ? "hecha" : null;
              return `<article class="task-card ${late ? "is-overdue" : ""}">
                <div class="task-top"><span class="task-title">${esc(task.title)}</span><span class="priority ${esc(task.priority)}">${esc(PRIORITY_LABEL[task.priority] || task.priority)}</span></div>
                <div class="task-meta">
                  <span><svg><use href="#i-user"/></svg>${esc(assignee?.name.split(" ")[0] || "Sin asignar")}</span>
                  <span class="${late ? "late" : ""}"><svg><use href="#i-calendar"/></svg>${date(task.due)}</span>
                  <span><svg><use href="#i-layers"/></svg>${esc(S.unitById(task.unitId)?.name || "")}</span>
                </div>
                ${task.notes ? `<p style="color:var(--muted-2);font-size:12.5px;line-height:1.5">${esc(task.notes)}</p>` : ""}
                <div class="task-card-actions">
                  ${next ? `<button class="btn btn--soft btn--sm" type="button" data-action="advance-task" data-id="${esc(task.id)}" data-status="${next}">${task.status === "pendiente" ? "Arrancar" : "Completar"} <svg><use href="#i-arrow"/></svg></button>` : `<span class="status status--ok">Cerrada</span>`}
                  <div style="display:flex;gap:2px">
                    <button class="row-action" type="button" data-action="edit-task" data-id="${esc(task.id)}" title="Editar"><svg><use href="#i-edit"/></svg></button>
                    <button class="row-action danger" type="button" data-action="confirm-delete" data-kind="task" data-id="${esc(task.id)}" title="Eliminar"><svg><use href="#i-trash"/></svg></button>
                  </div>
                </div>
              </article>`;
            }).join("") : `<div class="empty" style="padding:26px 10px"><svg><use href="#i-check-circle"/></svg><b>Sin tareas</b></div>`}
          </div>
        </div>`;
      }).join("")}
    </div>`;
  }

  function renderChecklists(checklists) {
    const today = D.iso(new Date());
    return `<div class="checklist-grid">
      ${checklists.map((checklist) => {
        const run = S.getState().checklistRuns.find((item) => item.checklistId === checklist.id && item.date === today);
        const completed = run?.completed || [];
        const pctDone = Math.round((completed.length / checklist.items.length) * 100);
        return `<article class="checklist-card" data-reveal>
          <div class="checklist-card-head">
            <div><h2>${esc(checklist.title)}</h2><p>${esc(checklist.area)} · ${esc(checklist.frequency)} · ${esc(checklist.time)}</p></div>
            ${status(completed.length >= checklist.items.length ? "Completo" : completed.length ? "En curso" : "Sin empezar", completed.length >= checklist.items.length ? "ok" : completed.length ? "info" : "muted")}
          </div>
          <div class="checklist-progress"><div class="checklist-progress-head"><span>${completed.length}/${checklist.items.length}</span><b>${pctDone}%</b></div>${progressBar(pctDone, pctDone >= 100 ? "green" : "violet")}</div>
          <div class="checklist-items">
            ${checklist.items.map((item) => {
              const done = completed.includes(item.id);
              return `<button class="checklist-item ${done ? "done" : ""}" type="button" data-action="toggle-checklist-item" data-checklist="${esc(checklist.id)}" data-item="${esc(item.id)}">
                <span class="box"><svg><use href="#i-check"/></svg></span><span>${esc(item.label)}</span>
              </button>`;
            }).join("")}
          </div>
          <div class="panel-foot" style="padding:7px 0 0;border-top:1px solid var(--line)"><span>${run ? `Actualizado por ${esc(S.userById(run.userId)?.name || "—")}` : "Lo puede hacer cualquier encargado"}</span>${run?.completedAt ? `<span class="mono" style="font-size:12px">${relative(run.completedAt)}</span>` : ""}</div>
        </article>`;
      }).join("")}
    </div>`;
  }

  function renderMeetings(meetings) {
    return `<div class="meeting-list">
      ${meetings.length ? meetings.map((meeting) => `<article class="meeting-card" data-reveal>
        <div>
          <span class="kicker"><i></i>MeetBarber · ${dateFull(meeting.date)}</span>
          <h2>${esc(meeting.title)}</h2>
          <p>${esc(meeting.notes)}</p>
          <div class="meeting-attendees">
            ${meeting.attendees.slice(0, 7).map((id) => avatar(S.userById(id), "avatar--sm")).join("")}
            <span>${meeting.attendees.length} personas</span>
          </div>
        </div>
        <div class="meeting-side">
          <h3>Decisiones</h3>
          <ul class="decision-list">${meeting.decisions.length ? meeting.decisions.map((decision) => `<li>${esc(decision)}</li>`).join("") : "<li>Sin decisiones registradas.</li>"}</ul>
          <h3 style="margin-top:4px">Acciones</h3>
          <ul class="action-list">${meeting.actions.length ? meeting.actions.map((action) => `<li>${esc(action.text)} · ${esc(S.userById(action.ownerId)?.name.split(" ")[0] || "")} · ${date(action.due)}</li>`).join("") : "<li>Sin acciones asignadas.</li>"}</ul>
        </div>
      </article>`).join("") : emptyState("Todavía no hay actas", "Registrá la primera reunión de equipo.", "message")}
      <div class="row" style="justify-content:center">${btn("Registrar MeetBarber", { action: "meeting", icon: "plus", variant: "soft" })}</div>
    </div>`;
  }

  /* ---------------- contenido ---------------- */

  function renderContent(self = false) {
    const barbers = self ? [S.currentUser()].filter(Boolean) : S.barbers();
    const week = ui.contentWeek;
    const stats = barbers.map((barber) => ({ barber, stats: S.contentStats(barber.id, week) }));
    const totalGoal = barbers.length * Number(S.getState().settings.contentGoal || 3);
    const totalPublished = stats.reduce((sum, item) => sum + item.stats.published, 0);
    const avg = barbers.length ? Math.round(stats.reduce((sum, item) => sum + item.stats.compliance, 0) / barbers.length) : 0;
    const weekIsCurrent = week === D.weekStart(0);
    const canManage = S.isOwner() || S.can("content.manage");

    return `<section class="page">
      ${pageHead({
        kicker: `Contenido · semana ${D.isoWeek(week)} · ${D.weekLabel(week)}`,
        title: self ? "Tu contenido" : "Contenido",
        desc: self ? "Grabado, subido a Drive y publicado. Cada pieza publicada suma puntos y llena la agenda." : "El pipeline semanal de cada barbero. Meta clara, cumplimiento medible y puntos cuando se publica.",
        actions: `${monthSwitcherFor(D.weekLabel(week), "week-prev", "week-next")}${weekIsCurrent ? "" : btn("Semana actual", { action: "week-now", icon: "refresh", size: "sm" })}${btn("Nueva pieza", { action: "content", icon: "plus", variant: "primary" })}`,
        meta: `<span><svg><use href="#i-image"/></svg>${totalPublished}/${totalGoal} publicadas</span><span><svg><use href="#i-target"/></svg>${avg}% cumplimiento promedio</span>`,
        hero: true
      })}

      <div class="content-hero">
        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">${self ? "Tu semana" : "Ritmo de publicación"}</h2><p class="panel-sub">${D.weekLabel(week)} · meta ${S.getState().settings.contentGoal} piezas por barbero</p></div><span class="status ${avg >= 100 ? "status--ok" : "status--warn"}">${avg >= 100 ? "Meta cumplida" : "En progreso"}</span></div>
          <div class="panel-body" style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">
            ${C.ring(avg, { size: 128, thickness: 9, color: avg >= 100 ? "#34d399" : "#a78bfa", label: "del equipo" })}
            <div style="flex:1;min-width:220px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">
              <div class="profile-metric"><span>Publicadas</span><b>${totalPublished}</b></div>
              <div class="profile-metric"><span>En Drive</span><b>${stats.reduce((sum, item) => sum + item.stats.inDrive, 0)}</b></div>
              <div class="profile-metric"><span>Grabadas</span><b>${stats.reduce((sum, item) => sum + item.stats.recorded, 0)}</b></div>
            </div>
          </div>
        </article>

        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Cómo se mide</h2><p class="panel-sub">Cada etapa vale distinto</p></div></div>
          <div class="panel-body" style="display:flex;flex-direction:column;gap:9px">
            ${[["Grabado", "34%", "warn"], ["En Drive", "67%", "violet"], ["Publicado", "100%", "ok"]].map(([label, value, tone]) => `<div class="row row--between"><span style="font-size:12px">${status(label, tone)}</span><b class="mono" style="font-size:12px">${value}</b></div>`).join("")}
            <p class="form-hint" style="margin-top:2px">El objetivo es publicar. Lo grabado suma, pero no completa la meta.</p>
          </div>
        </article>
      </div>

      <div class="content-grid">
        ${stats.map(({ barber, stats: item }) => {
          const complete = item.compliance >= 100;
          return `<article class="content-card ${complete ? "is-complete" : ""}" data-reveal>
            <div class="content-card-head">
              ${avatar(barber, "")}
              <div class="barber-id"><a class="barber-name" href="#/barbero/${esc(barber.id)}">${esc(barber.name)}</a><span class="barber-role">${item.published}/${item.goal} publicadas</span></div>
              <span class="content-pct ${complete ? "text-green" : ""}">${item.compliance}%</span>
            </div>
            <div class="content-progress"><div class="content-progress-head"><span>Cumplimiento semanal</span><span>${item.pieces.length} piezas cargadas</span></div>${progressBar(item.compliance, complete ? "green" : item.compliance < 50 ? "amber" : "")}</div>
            <div class="pipeline">
              <span class="pipeline-step ${item.recorded ? "done" : ""}"><b>${item.recorded}</b> grabado</span>
              <span class="pipeline-step ${item.inDrive ? "done" : ""}"><b>${item.inDrive}</b> Drive</span>
              <span class="pipeline-step ${item.published ? "done" : ""}"><b>${item.published}</b> publicadas</span>
            </div>
            ${item.pieces.length ? `<div class="piece-list">${item.pieces.map((piece) => `<div class="piece">
              <span class="piece-copy"><b>${esc(piece.title)}</b><small>${esc(piece.type)} · ${date(piece.createdAt)}${piece.link ? " · con link" : ""}</small></span>
              ${stageChip(piece.stage)}
              <span class="piece-actions">
                ${piece.stage !== "publicado" && (canManage || self || piece.userId === S.currentUserId()) ? `<button class="row-action" type="button" data-action="advance-content" data-id="${esc(piece.id)}" title="Avanzar etapa"><svg><use href="#i-arrow"/></svg></button>` : ""}
                ${piece.link ? `<a class="row-action" href="${esc(piece.link)}" target="_blank" rel="noopener" title="Abrir link"><svg><use href="#i-link"/></svg></a>` : ""}
                ${canManage || self || piece.userId === S.currentUserId() ? `<button class="row-action danger" type="button" data-action="confirm-delete" data-kind="content" data-id="${esc(piece.id)}" title="Eliminar"><svg><use href="#i-trash"/></svg></button>` : ""}
              </span>
            </div>`).join("")}</div>` : `<div class="content-empty">Sin piezas esta semana. ${self || canManage ? "Cargá la primera y arrancá el pipeline." : ""}</div>`}
            ${canManage || self ? `<button class="btn btn--ghost btn--sm btn--block" type="button" data-action="content" data-id="${esc(barber.id)}"><svg><use href="#i-plus"/></svg>Sumar pieza</button>` : ""}
          </article>`;
        }).join("") || emptyState("Sin barberos activos", "Sumá al equipo para trackear contenido.", "image")}
      </div>
    </section>`;
  }

  /* ---------------- capacitaciones ---------------- */

  function renderTraining(self = false) {
    const barbers = self ? [S.currentUser()].filter(Boolean) : S.barbers();
    const trainings = S.getState().trainings;
    const records = S.getState().trainingRecords;
    const canManage = S.isOwner() || S.can("training.manage");
    const myStats = self ? S.trainingStats(S.currentUserId()) : null;

    return `<section class="page">
      ${pageHead({
        kicker: self ? "Mi espacio · capacitaciones" : "Operación · formación",
        title: self ? "Tus capacitaciones" : "Capacitaciones",
        desc: self ? "Cada capacitación tiene un mini quiz. Si aprobás, sumás puntos y queda en tu ficha." : "Contenido corto, quiz y registro por persona. Se ve quién aprobó, quién quedó debajo y qué falta.",
        actions: canManage ? btn("Nueva capacitación", { action: "new-training", icon: "plus", variant: "primary" }) : "",
        meta: `<span><svg><use href="#i-graduation"/></svg>${trainings.length} módulos</span><span><svg><use href="#i-users"/></svg>${barbers.length} ${barbers.length === 1 ? "persona" : "personas"}</span>${myStats ? `<span><svg><use href="#i-check-circle"/></svg>${myStats.approved}/${myStats.total} aprobadas</span>` : ""}`,
        hero: true
      })}

      ${myStats ? `<div class="metric-grid metric-grid--4">
        ${metricCard({ label: "Aprobadas", counterValue: myStats.approved, format: "number", icon: "check-circle", tone: "green", foot: `de ${myStats.total} módulos` })}
        ${metricCard({ label: "Pendientes", counterValue: myStats.pending, format: "number", icon: "clock", tone: myStats.pending ? "amber" : "green", foot: "para rendir" })}
        ${metricCard({ label: "Desaprobadas", counterValue: myStats.failed, format: "number", icon: "alert", tone: myStats.failed ? "red" : "green", foot: "se pueden recuperar" })}
        ${metricCard({ label: "Avance", counterValue: myStats.pct, format: "number", suffix: "%", icon: "trending", tone: "violet", foot: "del plan completo" })}
      </div>` : ""}

      <div class="training-grid">
        ${trainings.map((training) => {
          const trainingRecords = records.filter((record) => record.trainingId === training.id);
          const approved = trainingRecords.filter((record) => record.status === "aprobado").length;
          const myRecord = self ? trainingRecords.find((record) => record.userId === S.currentUserId()) : null;
          const completion = barbers.length ? Math.round((approved / barbers.length) * 100) : 0;
          return `<article class="training-card" data-reveal>
            <div class="training-top">
              <span class="training-icon"><svg><use href="#i-graduation"/></svg></span>
              ${self ? (myRecord ? status(myRecord.status === "aprobado" ? `Aprobada · ${myRecord.score}%` : `Desaprobada · ${myRecord.score}%`, myRecord.status === "aprobado" ? "ok" : "danger") : status("Pendiente", "warn")) : status(`${completion}% del equipo`, completion >= 100 ? "ok" : completion > 0 ? "info" : "muted")}
            </div>
            <h2>${esc(training.title)}</h2>
            <p class="training-desc">${esc(training.description)}</p>
            <div class="training-meta"><span><svg><use href="#i-target"/></svg>${esc(LEVEL_LABEL[training.level] || training.level)}</span><span><svg><use href="#i-clock"/></svg>${training.minutes} min</span><span><svg><use href="#i-check-circle"/></svg>${training.passScore}% para aprobar</span><span><svg><use href="#i-list"/></svg>${training.questions.length} preguntas</span></div>
            <div class="training-completion"><div class="training-progress" style="margin-bottom:4px">${progressBar(self ? (myRecord?.status === "aprobado" ? 100 : 0) : completion, completion >= 100 ? "green" : "violet")}</div><small>${self ? (myRecord ? `Último intento ${date(myRecord.date)}` : "Todavía no la rendiste") : `${approved}/${barbers.length} aprobadas`}</small></div>
            <div class="training-foot">
              ${self ? `<button class="btn btn--primary btn--sm" type="button" data-action="take-training" data-id="${esc(training.id)}" ${training.questions.length ? "" : "disabled"}>${myRecord ? "Volver a rendir" : "Rendir"} <svg><use href="#i-arrow"/></svg></button>` : `<span class="section-sub">${trainingRecords.length} intentos registrados</span>`}
              ${canManage ? `<button class="row-action" type="button" data-action="training-record" data-training="${esc(training.id)}" title="Cargar resultado"><svg><use href="#i-edit"/></svg></button>` : ""}
            </div>
          </article>`;
        }).join("") || emptyState("Sin capacitaciones", "Creá el primer módulo.", "graduation")}
      </div>

      ${!self ? `<article class="panel" data-reveal>
        <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Matriz de avance</h2><p class="panel-sub">Quién aprobó qué · click en una celda para cargar o corregir</p></div><div class="chart-legend"><span class="legend-item"><i class="legend-dot" style="--color:#34d399"></i>Aprobado</span><span class="legend-item"><i class="legend-dot" style="--color:#fb7185"></i>Desaprobado</span><span class="legend-item"><i class="legend-dot" style="--color:#7b7196"></i>Pendiente</span></div></div>
        <div class="panel-body panel-body--flush"><div class="matrix-wrap"><table class="matrix">
          <thead><tr><th>Persona</th>${trainings.map((training) => `<th title="${esc(training.title)}">${esc(training.title.length > 18 ? `${training.title.slice(0, 17)}…` : training.title)}</th>`).join("")}</tr></thead>
          <tbody>${barbers.map((barber) => `<tr>
            <td><div class="matrix-person">${avatar(barber, "avatar--sm")}<div><b>${esc(barber.name)}</b></div></div></td>
            ${trainings.map((training) => {
              const record = records.filter((entry) => entry.trainingId === training.id && entry.userId === barber.id).sort((a, b) => b.date.localeCompare(a.date))[0];
              const state = record ? record.status : "pendiente";
              return `<td><button class="matrix-cell ${state === "aprobado" ? "ok" : state === "desaprobado" ? "fail" : "pending"}" type="button" data-action="training-record" data-training="${esc(training.id)}" data-user="${esc(barber.id)}" title="${esc(training.title)} · ${esc(barber.name)}">${record ? `${record.score}%` : "—"}</button></td>`;
            }).join("")}
          </tr>`).join("")}</tbody>
        </table></div></div>
      </article>` : ""}
    </section>`;
  }

  /* ---------------- puntos y strikes ---------------- */

  function pointsTabs() {
    return `<nav class="page-tabs">
      <button class="tab ${ui.pointsTab === "puntos" ? "active" : ""}" type="button" data-action="points-tab" data-id="puntos">Puntos</button>
      <button class="tab ${ui.pointsTab === "strikes" ? "active" : ""}" type="button" data-action="points-tab" data-id="strikes">Strikes ${S.isBarber() ? "" : `<span class="tab-badge">${S.barbers().reduce((sum, barber) => sum + S.activeStrikes(barber.id).length, 0)}</span>`}</button>
    </nav>`;
  }

  function renderPoints(self = false) {
    const barbers = self ? [S.currentUser()].filter(Boolean) : S.barbers();
    const canManage = S.isOwner() || S.can("points.manage");
    const points = S.getState().points
      .filter((entry) => !self || entry.userId === S.currentUserId())
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
    const allStrikes = S.getState().strikes
      .filter((strike) => !self || strike.userId === S.currentUserId())
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
    const strikes = allStrikes.filter((strike) => {
      const state = S.strikeState(strike);
      if (ui.strikeFilter === "todos") return true;
      if (ui.strikeFilter === "activos") return state === "activo";
      if (ui.strikeFilter === "vencidos") return state === "vencido";
      if (ui.strikeFilter === "archivados") return state === "archivado";
      return true;
    });
    const totalPoints = barbers.reduce((sum, barber) => sum + S.userPoints(barber.id), 0);
    const activeCount = barbers.reduce((sum, barber) => sum + S.activeStrikes(barber.id).length, 0);

    return `<section class="page">
      ${pageHead({
        kicker: self ? "Mi espacio · puntos y strikes" : "Operación · reconocimiento y conducta",
        title: self ? "Tus puntos" : "Puntos y strikes",
        desc: self ? "Los puntos se ganan con contenido, ventas y capacitaciones. Los strikes son sanciones con motivo, evidencia y descargo." : "Dos sistemas separados: puntos para premiar lo objetivo, strikes para cuidar la conducta. Tres strikes activos pueden discontinuar la relación.",
        actions: canManage ? `${btn("Sumar puntos", { action: "new-points", icon: "zap", variant: "soft" })}${btn("Registrar strike", { action: "new-strike", icon: "shield", variant: "danger" })}` : "",
        meta: `<span><svg><use href="#i-zap"/></svg>${num(totalPoints)} puntos</span><span><svg><use href="#i-shield"/></svg>${plural(activeCount, "strike activo", "strikes activos")}</span><span><svg><use href="#i-scale"/></svg>límite ${strikeLimit()}</span>`,
        hero: true
      })}

      ${pointsTabs()}

      ${ui.pointsTab === "puntos" ? `
        <div class="metric-grid metric-grid--4">
          ${metricCard({ label: "Puntos acumulados", counterValue: totalPoints, format: "number", icon: "zap", foot: self ? "en tu historial" : "en todo el equipo" })}
          ${metricCard({ label: "Movimientos", counterValue: points.length, format: "number", icon: "list", foot: "registros de puntos" })}
          ${metricCard({ label: "Promedio por barbero", counterValue: barbers.length ? Math.round(totalPoints / barbers.length) : 0, format: "number", icon: "users", foot: "puntos por persona" })}
          ${metricCard({ label: "Capacitaciones aprobadas", counterValue: S.getState().trainingRecords.filter((record) => record.status === "aprobado").length, format: "number", icon: "graduation", tone: "violet", foot: "suman puntos automáticos" })}
        </div>

        <div class="grid grid--1-2">
          <article class="panel" data-reveal>
            <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">${self ? "Tu ranking" : "Ranking del equipo"}</h2><p class="panel-sub">Puntos objetivos · contenido, ventas y formación</p></div></div>
            <div class="panel-body"><div class="leaderboard">
              ${barbers.slice().sort((a, b) => S.userPoints(b.id) - S.userPoints(a.id)).map((barber, index) => {
                const value = S.userPoints(barber.id);
                const max = Math.max(...barbers.map((item) => S.userPoints(item.id)), 1);
                return `<div class="leader-row ${index === 0 ? "top" : ""}">
                  <span class="leader-rank">${String(index + 1).padStart(2, "0")}</span>
                  ${avatar(barber, "avatar--sm")}
                  <div class="leader-copy"><b>${esc(barber.name)}</b><div class="progress"><span style="--value:${(value / max) * 100}%"></span></div></div>
                  <span class="leader-points">${num(value)}<small> pts</small></span>
                </div>`;
              }).join("")}
            </div></div>
          </article>

          <article class="panel" data-reveal>
            <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Historial de puntos</h2><p class="panel-sub">${points.length} movimientos</p></div></div>
            <div class="table-wrap"><table class="data-table">
              <thead><tr>${self ? "" : "<th>Persona</th>"}<th>Motivo</th><th>Categoría</th><th>Puntos</th><th>Fecha</th></tr></thead>
              <tbody>${points.length ? points.map((entry) => `<tr>
                ${self ? "" : `<td>${userInline(S.userById(entry.userId))}</td>`}
                <td><b style="font-size:12px">${esc(entry.reason)}</b><small style="display:block;color:var(--muted-2);font-size:12.5px">${esc(S.userById(entry.createdBy)?.name || "Sistema")}</small></td>
                <td><span class="category-pill ${esc(entry.category)}">${esc(categoryLabel(entry.category))}</span></td>
                <td><span class="cell-amount text-cyan">+${entry.points}</span></td>
                <td><span class="mono" style="font-size:12.5px">${date(entry.date)}</span></td>
              </tr>`).join("") : `<tr><td colspan="${self ? 4 : 5}">${emptyState("Sin puntos", "Todavía no hay movimientos.", "zap")}</td></tr>`}</tbody>
            </table></div>
          </article>
        </div>
      ` : ""}

      ${ui.pointsTab === "strikes" ? `
        <div class="policy-banner" data-reveal>
          <div><span class="kicker"><i></i>Política de convivencia</span><h2>A los ${strikeLimit()} strikes activos se evalúa la continuidad</h2><p>Cada strike tiene motivo, fecha, quién lo emite, evidencia y derecho a descargo. Vence a los ${S.getState().settings.strikeExpiryDays} días.</p></div>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            ${strikeBadge(activeCount)}
            <div style="text-align:right"><b style="display:block;font-family:var(--font-display);font-size:30px;line-height:1">${activeCount}</b><span class="section-sub">activos en ${self ? "tu ficha" : "el equipo"}</span></div>
          </div>
        </div>

        ${canManage ? `<div class="row row--between"><div class="filters">${[["activos", "Activos"], ["vencidos", "Vencidos"], ["archivados", "Archivados"], ["todos", "Todos"]].map(([key, label]) => `<button class="chip chip--button ${ui.strikeFilter === key ? "active" : ""}" type="button" data-action="strike-filter" data-id="${key}">${label}</button>`).join("")}</div><span class="section-sub">${strikes.length} resultados</span></div>` : ""}

        <div class="strike-grid">
          ${strikes.length ? strikes.map((strike) => {
            const barber = S.userById(strike.userId);
            const state = S.strikeState(strike);
            return `<article class="strike-card ${state !== "activo" ? `is-${state === "archivado" ? "archived" : "expired"}` : ""}" data-reveal>
              <div class="strike-head">
                <div><b>${esc(strike.reason)}</b><small>${esc(barber?.name || "—")} · ${date(strike.date)}</small></div>
                ${status(state === "activo" ? "Activo" : state === "archivado" ? "Archivado" : "Vencido", state === "activo" ? "danger" : "muted")}
              </div>
              <div class="strike-meta">
                <span><svg><use href="#i-user"/></svg>Emite ${esc(S.userById(strike.createdBy)?.name || "Sistema")}</span>
                <span><svg><use href="#i-calendar"/></svg>Vence ${date(strike.expiresAt)}</span>
                ${strike.responseDate ? `<span><svg><use href="#i-message"/></svg>Respondió ${date(strike.responseDate)}</span>` : ""}
              </div>
              <p class="strike-body">${esc(strike.detail)}</p>
              ${strike.evidence ? `<a class="strike-evidence" href="${esc(strike.evidence)}" target="_blank" rel="noopener"><svg><use href="#i-link"/></svg>Ver evidencia</a>` : ""}
              ${strike.response ? `<div class="strike-response"><span>Descargo</span><p>${esc(strike.response)}</p></div>` : ""}
              ${strike.archiveNote ? `<p class="form-hint">Archivado: ${esc(strike.archiveNote)}</p>` : ""}
              <div class="strike-actions">
                ${(self || strike.userId === S.currentUserId()) && state === "activo" ? `<button class="btn btn--ghost btn--sm" type="button" data-action="respond-strike" data-id="${esc(strike.id)}">${strike.response ? "Editar descargo" : "Dejar descargo"} <svg><use href="#i-message"/></svg></button>` : ""}
                ${canManage && state === "activo" ? `<button class="btn btn--danger btn--sm" type="button" data-action="archive-strike" data-id="${esc(strike.id)}">Archivar <svg><use href="#i-check"/></svg></button>` : ""}
                ${canManage ? `<button class="row-action" type="button" data-action="new-strike" data-id="${esc(strike.userId)}" title="Nuevo strike para ${esc(barber?.name || "")}"><svg><use href="#i-plus"/></svg></button>` : ""}
              </div>
            </article>`;
          }).join("") : emptyState("Sin strikes en este filtro", "No hay registros para mostrar.", "shield")}
        </div>
      ` : ""}
    </section>`;
  }

  /* ---------------- academia ---------------- */

  function academyTabs() {
    const canPay = S.can("academia.pagos");
    const canMetrics = S.can("academia.metricas");
    const items = [
      { key: "resumen", label: "Resumen", route: "academia/resumen" },
      { key: "embudo", label: "Embudo", route: "academia/embudo", badge: S.weeklyLeads().length },
      { key: "alumnos", label: "Alumnos", route: "academia/alumnos", badge: S.activeStudents().length },
      ...(canPay ? [{ key: "pagos", label: "Pagos", route: "academia/pagos", badge: S.overduePayments().length }] : []),
      { key: "stock", label: "Stock", route: "academia/stock", badge: S.lowStock().length },
      ...(canMetrics ? [{ key: "metricas", label: "Métricas", route: "academia/metricas" }] : [])
    ];
    return `<nav class="page-tabs">${items.map((item) => `<button class="tab ${item.key === ui.academyTab ? "active" : ""}" type="button" data-action="go" data-route="${esc(item.route)}">${esc(item.label)}${item.badge ? `<span class="tab-badge">${item.badge}</span>` : ""}</button>`).join("")}</nav>`;
  }

  function renderAcademy() {
    const allowed = ["resumen", "embudo", "alumnos", "stock"]
      .concat(S.can("academia.pagos") ? ["pagos"] : [])
      .concat(S.can("academia.metricas") ? ["metricas"] : []);
    if (!allowed.includes(ui.academyTab)) ui.academyTab = "resumen";
    const metrics = S.academyMetrics(ui.month);
    const showMoney = S.can("academia.pagos") || S.can("academia.metricas");

    return `<section class="page">
      ${pageHead({
        kicker: `Academia · ${D.monthLabel(ui.month)}`,
        title: "Academia",
        desc: "Embudo, alumnas y alumnos, cobranzas, asistencia y stock de herramientas. Todo el recorrido de la academia.",
        actions: `${monthSwitcher()}${btn("Nuevo lead", { action: "lead", icon: "target", variant: "primary" })}`,
        meta: `<span><svg><use href="#i-target"/></svg>${metrics.leadsTotal} leads totales</span><span><svg><use href="#i-graduation"/></svg>${metrics.activeStudents} alumnos activos</span><span><svg><use href="#i-calendar"/></svg>${metrics.attendance}% asistencia</span>`,
        hero: true
      })}

      ${academyTabs()}

      ${ui.academyTab === "resumen" ? renderAcademyOverview(metrics, showMoney) : ""}
      ${ui.academyTab === "embudo" ? renderAcademyFunnel() : ""}
      ${ui.academyTab === "alumnos" ? renderAcademyStudents() : ""}
      ${ui.academyTab === "pagos" ? renderAcademyPayments() : ""}
      ${ui.academyTab === "stock" ? renderAcademyStock() : ""}
      ${ui.academyTab === "metricas" ? renderAcademyMetrics(metrics) : ""}
    </section>`;
  }

  function renderAcademyOverview(metrics, owner) {
    const cohorts = S.getState().academy.cohorts.map((cohort) => S.cohortSummary(cohort));
    const maxFunnel = Math.max(...metrics.funnel.map((stage) => stage.count), 1);
    const recent = S.getState().academy.leads.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

    return `<div class="metric-grid">
      ${metricCard({ label: "Leads del mes", counterValue: metrics.leads, format: "number", icon: "target", foot: `${metrics.leadsTotal} en total`, spark: C.spark([3, 5, 4, 7, 6, Math.max(metrics.leads, 1)], { color: "#fbbf24" }) })}
      ${metricCard({ label: "Conversión a inscripto", counterValue: metrics.conversion, format: "number", suffix: "%", icon: "trending", tone: "green", foot: `${metrics.enrolledLeads} inscriptos` })}
      ${metricCard({ label: "Alumnos activos", counterValue: metrics.activeStudents, format: "number", icon: "graduation", tone: "violet", foot: `${metrics.newStudents} nuevos este mes` })}
      ${metricCard({ label: "Ocupación", counterValue: metrics.occupancy, format: "number", suffix: "%", icon: "grid", foot: `${metrics.activeStudents}/${metrics.capacity} lugares` })}
      ${metricCard({ label: "Deserción", counterValue: metrics.desertion, format: "number", suffix: "%", icon: "alert", tone: metrics.desertion > 10 ? "red" : "green", foot: `${metrics.deserters} casos` })}
      ${metricCard({ label: "Asistencia", counterValue: metrics.attendance, format: "number", suffix: "%", icon: "calendar", tone: metrics.attendance >= 80 ? "green" : "amber", foot: "promedio general" })}
    </div>

    ${owner ? `<div class="totals-strip" data-reveal>
      <div class="total-item"><span>Cobrado del mes</span><b class="text-green">${counter(metrics.collected, "compact")}</b><small>cuotas e inscripciones</small></div>
      <div class="total-item"><span>Pendiente</span><b class="text-amber">${counter(metrics.pending, "compact")}</b><small>${S.overduePayments().length} vencidos</small></div>
      <div class="total-item"><span>Costo por alumno</span><b>${counter(metrics.cac, "compact")}</b><small>marketing ${moneyC(metrics.marketing)}</small></div>
      <div class="total-item"><span>Facturación academia</span><b>${counter(S.unitSummary("academia", ui.month).income, "compact")}</b><small>incluye cobranzas</small></div>
    </div>` : ""}

    <div class="grid grid--2-1">
      <article class="panel" data-reveal>
        <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Embudo de captación</h2><p class="panel-sub">Consultas, entrevistas, inscriptos y perdidos</p></div><a class="link-btn" href="#/academia/embudo">Abrir tablero <svg><use href="#i-arrow"/></svg></a></div>
        <div class="panel-body"><div class="academy-funnel">
          ${metrics.funnel.map((stage) => {
            const meta = LEAD_STAGE[stage.stage];
            return `<div class="funnel-stage" style="--funnel-color:${meta.color}"><span>${meta.label}</span><div class="funnel-bar"><span style="--value:${(stage.count / maxFunnel) * 100}%"></span></div><b>${stage.count} <small>leads</small></b></div>`;
          }).join("")}
        </div></div>
      </article>

      <article class="panel" data-reveal>
        <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Origen de leads</h2><p class="panel-sub">De dónde vienen</p></div></div>
        <div class="panel-body"><div class="source-list">
          ${metrics.sources.map((source) => {
            const max = Math.max(...metrics.sources.map((item) => item.leads), 1);
            return `<div class="source-row"><span>${esc(source.source)}</span><div class="source-bar"><span style="--value:${(source.leads / max) * 100}%"></span></div><span class="source-numbers">${source.leads} · <b>${source.enrolled}</b></span></div>`;
          }).join("") || `<div class="content-empty">Sin datos todavía.</div>`}
        </div></div>
      </article>
    </div>

    <div class="grid grid--2-1">
      <article class="panel" data-reveal>
        <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Cohortes</h2><p class="panel-sub">Ocupación y fechas</p></div><a class="link-btn" href="#/academia/alumnos">Ver alumnos <svg><use href="#i-arrow"/></svg></a></div>
        <div class="panel-body"><div class="cohort-grid">
          ${cohorts.map((cohort) => `<div class="cohort-card">
            <div class="cohort-head"><div><b class="cohort-name">${esc(cohort.name)}</b><span class="cohort-meta">${dateFull(cohort.startDate)} → ${dateFull(cohort.endDate)}</span></div>${status(LEVEL_LABEL[cohort.level] || cohort.level, "violet")}</div>
            <div class="cohort-stats"><div><span>Alumnos</span><b>${cohort.count}</b></div><div><span>Capacidad</span><b>${cohort.capacity}</b></div><div><span>Ocupación</span><b>${cohort.occupancy}%</b></div></div>
            ${progressBar(cohort.occupancy, cohort.occupancy >= 80 ? "green" : "violet")}
            <div class="row row--between"><small style="font-size:12px;color:var(--muted-2)">${esc(cohort.schedule)}</small><button class="link-btn" type="button" data-action="attendance" data-id="${esc(cohort.id)}">Asistencia <svg><use href="#i-arrow"/></svg></button></div>
          </div>`).join("")}
        </div></div>
      </article>

      <article class="panel" data-reveal>
        <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Vendedores</h2><p class="panel-sub">Leads e inscriptos por persona</p></div></div>
        <div class="panel-body"><div class="seller-list">
          ${metrics.sellers.map((seller) => `<div class="seller-row">${avatar(seller.user, "avatar--sm")}<div class="seller-copy"><b>${esc(seller.user.name)}</b><small>${seller.leads} leads · ${seller.enrolled} inscriptos</small></div><span class="seller-score">${seller.conversion}%</span></div>`).join("") || emptyState("Sin vendedores", "Asigná leads al equipo.", "users")}
        </div></div>
      </article>
    </div>

    <article class="panel" data-reveal>
      <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Últimos leads</h2><p class="panel-sub">Lo que entró esta semana</p></div><a class="link-btn" href="#/academia/embudo">Ver embudo <svg><use href="#i-arrow"/></svg></a></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Nombre</th><th>Origen</th><th>Nivel</th><th>Etapa</th><th>Vendedor</th><th>Entró</th></tr></thead><tbody>
        ${recent.map((lead) => `<tr><td><b style="font-size:12px">${esc(lead.name)}</b><small style="display:block;color:var(--muted-2);font-size:12.5px">${esc(lead.phone)}</small></td><td>${esc(lead.source)}</td><td>${tag(LEVEL_LABEL[lead.level] || lead.level, "violet")}</td><td><span class="status status--${LEAD_STAGE[lead.stage]?.tone || "muted"}">${esc(LEAD_STAGE[lead.stage]?.label || lead.stage)}</span></td><td>${esc(S.userById(lead.sellerId)?.name || "—")}</td><td><span class="mono" style="font-size:12.5px">${ageLabel(lead.createdAt)}</span></td></tr>`).join("") || `<tr><td colspan="6">${emptyState("Sin leads", "Cargá el primero.", "target")}</td></tr>`}
      </tbody></table></div>
    </article>`;
  }

  function renderAcademyFunnel() {
    const leads = S.getState().academy.leads.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const stages = ["consulta", "entrevista", "inscripto", "perdido"];
    return `<div class="row row--between">
      <div class="filters"><button class="chip chip--button" type="button" data-action="lead">+ Nuevo lead</button><span class="section-sub">${leads.length} leads · ${S.weeklyLeads().length} esta semana</span></div>
      <span class="section-sub">Mové la etapa o inscribí directo a una cohorte.</span>
    </div>
    <div class="lead-board">
      ${stages.map((stage) => {
        const meta = LEAD_STAGE[stage];
        const list = leads.filter((lead) => lead.stage === stage);
        return `<div class="lead-col" style="--stage-color:${meta.color}">
          <div class="lead-col-head"><b>${meta.label}</b><span>${list.length}</span></div>
          <div class="lead-list">
            ${list.map((lead) => {
              const next = stage === "consulta" ? "entrevista" : stage === "entrevista" ? "inscripto" : null;
              return `<article class="lead-card">
                <div class="lead-top"><span class="lead-name">${esc(lead.name)}</span><small>${ageLabel(lead.createdAt)}</small></div>
                <div class="lead-meta"><span class="tag">${esc(lead.source)}</span><span class="tag tag--violet">${esc(LEVEL_LABEL[lead.level] || lead.level)}</span><span class="tag">${esc(S.userById(lead.sellerId)?.name.split(" ")[0] || "—")}</span></div>
                ${lead.notes ? `<p style="color:var(--muted-2);font-size:12.5px;line-height:1.5">${esc(lead.notes)}</p>` : ""}
                <div class="lead-actions">
                  ${next && stage !== "perdido" ? `<button class="btn btn--soft btn--sm" type="button" data-action="${next === "inscripto" ? "enroll-lead" : "move-lead"}" data-id="${esc(lead.id)}" ${next === "inscripto" ? "" : `data-stage="${next}"`}>${next === "entrevista" ? "Entrevista" : "Inscribir"} <svg><use href="#i-arrow"/></svg></button>` : ""}
                  ${stage !== "inscripto" ? `<button class="btn btn--ghost btn--sm" type="button" data-action="enroll-lead" data-id="${esc(lead.id)}">A cohorte</button>` : ""}
                  <button class="row-action" type="button" data-action="edit-lead" data-id="${esc(lead.id)}" title="Editar"><svg><use href="#i-edit"/></svg></button>
                  ${lead.phone ? `<a class="row-action" href="https://wa.me/${esc(String(lead.phone).replace(/[^0-9]/g, ""))}" target="_blank" rel="noopener" title="WhatsApp"><svg><use href="#i-message"/></svg></a>` : ""}
                </div>
              </article>`;
            }).join("") || `<div class="content-empty">Sin leads en esta etapa.</div>`}
          </div>
        </div>`;
      }).join("")}
    </div>`;
  }

  function renderAcademyStudents() {
    const cohorts = S.getState().academy.cohorts;
    const cohortMap = Object.fromEntries(cohorts.map((cohort) => [cohort.id, cohort]));
    const students = S.getState().academy.students
      .filter((student) => {
        if (ui.studentsLevel && student.level !== ui.studentsLevel) return false;
        if (ui.studentsStatus && student.status !== ui.studentsStatus) return false;
        if (ui.studentsQuery) {
          const query = ui.studentsQuery.toLowerCase();
          return `${student.name} ${student.email} ${student.phone}`.toLowerCase().includes(query);
        }
        return true;
      })
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));

    return `<div class="row row--between">
      <div class="filters">
        <div class="search-input"><svg><use href="#i-search"/></svg><input class="input input--sm" type="search" placeholder="Buscar alumno…" value="${esc(ui.studentsQuery)}" data-filter="students-query"></div>
        <select class="select select--sm" data-filter="students-level" aria-label="Filtrar por nivel"><option value="">Todos los niveles</option>${Object.entries(LEVEL_LABEL).map(([key, label]) => `<option value="${key}" ${ui.studentsLevel === key ? "selected" : ""}>${label}</option>`).join("")}</select>
        <select class="select select--sm" data-filter="students-status" aria-label="Filtrar por estado"><option value="">Todos los estados</option><option value="cursando" ${ui.studentsStatus === "cursando" ? "selected" : ""}>Cursando</option><option value="desertor" ${ui.studentsStatus === "desertor" ? "selected" : ""}>Desertor</option><option value="egresado" ${ui.studentsStatus === "egresado" ? "selected" : ""}>Egresado</option></select>
      </div>
      <div class="row">${btn("Nueva cohorte", { action: "cohort", icon: "calendar", size: "sm" })}${btn("Nuevo alumno", { action: "student", icon: "plus", variant: "primary", size: "sm" })}</div>
    </div>

    <article class="panel" data-reveal>
      <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Alumnos</h2><p class="panel-sub">${students.length} resultados · ${S.activeStudents().length} cursando</p></div></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Alumno</th><th>Nivel</th><th>Cohorte</th><th>Estado</th><th>Asistencia</th><th>Cuotas</th><th><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody>${students.length ? students.map((student) => {
          const attendance = S.studentAttendance(student.id);
          const payments = S.getState().academy.payments.filter((payment) => payment.studentId === student.id);
          const pending = payments.filter((payment) => S.paymentState(payment) !== "pagado").length;
          const cohort = cohortMap[student.cohortId];
          return `<tr>
            <td>${userInline({ name: student.name, initials: initials(student.name), tone: "violet" }, student.email)}</td>
            <td>${tag(LEVEL_LABEL[student.level] || student.level, "violet")}</td>
            <td><b style="font-size:12px">${esc(cohort?.name || "—")}</b><small style="display:block;color:var(--muted-2);font-size:12px">${esc(cohort?.schedule || "")}</small></td>
            <td>${status(student.status === "cursando" ? "Cursando" : student.status === "desertor" ? "Desertor" : "Egresado", student.status === "cursando" ? "ok" : student.status === "desertor" ? "danger" : "info")}</td>
            <td><span class="cell-amount">${attendance.pct}%</span><small style="display:block;color:var(--muted-2);font-size:12px">${attendance.present}/${attendance.total} clases</small></td>
            <td>${pending ? status(`${pending} pendientes`, "warn") : status("Al día", "ok")}</td>
            <td><div class="cell-actions">
              <button class="row-action" type="button" data-action="payment" data-id="${esc(student.id)}" title="Cargar pago"><svg><use href="#i-coins"/></svg></button>
              <button class="row-action" type="button" data-action="attendance" data-id="${esc(student.cohortId)}" title="Tomar asistencia"><svg><use href="#i-calendar"/></svg></button>
            </div></td>
          </tr>`;
        }).join("") : `<tr><td colspan="7">${emptyState("Sin alumnos", "Probá con otro filtro o inscribí el primero.", "graduation")}</td></tr>`}</tbody>
      </table></div>
    </article>`;
  }

  function renderAcademyPayments() {
    const payments = S.paymentsForMonth(ui.month).slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const collected = S.paymentsCollected(ui.month);
    const pending = S.paymentsPending(ui.month);
    const overdue = S.overduePayments();
    const total = collected + pending;

    return `<div class="metric-grid metric-grid--4">
      ${metricCard({ label: "Cobrado del mes", counterValue: collected, format: "compact", icon: "coins", tone: "green", foot: "acreditado en academia" })}
      ${metricCard({ label: "Pendiente", counterValue: pending, format: "compact", icon: "clock", tone: pending ? "amber" : "green", foot: `${payments.filter((payment) => S.paymentState(payment) !== "pagado").length} cuotas` })}
      ${metricCard({ label: "Vencidos", counterValue: overdue.length, format: "number", icon: "alert", tone: overdue.length ? "red" : "green", foot: "para reclamar" })}
      ${metricCard({ label: "Total del mes", counterValue: total, format: "compact", icon: "wallet", foot: "cobrado + pendiente" })}
    </div>

    <article class="panel" data-reveal>
      <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Cobranzas · ${esc(D.monthLabel(ui.month))}</h2><p class="panel-sub">${payments.length} movimientos · al cobrar se crea el ingreso en academia</p></div>${btn("Cargar pago", { action: "payment", icon: "plus", variant: "primary", size: "sm" })}</div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Alumno</th><th>Concepto</th><th>Vence</th><th>Estado</th><th>Monto</th><th>Método</th><th><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody>${payments.length ? payments.map((payment) => {
          const student = S.studentById(payment.studentId);
          const state = S.paymentState(payment);
          return `<tr>
            <td>${userInline({ name: student?.name || "Alumno", initials: initials(student?.name || "A"), tone: "violet" }, student?.phone || "")}</td>
            <td><b style="font-size:12px">${esc(payment.concept)}</b><small style="display:block;color:var(--muted-2);font-size:12px">${esc(S.cohortById(payment.cohortId)?.name || "")}</small></td>
            <td><span class="mono" style="font-size:12.5px">${date(payment.dueDate)}</span></td>
            <td>${status(state === "pagado" ? "Pagado" : state === "vencido" ? "Vencido" : "Pendiente", state === "pagado" ? "ok" : state === "vencido" ? "danger" : "warn")}</td>
            <td><span class="cell-amount">${money(payment.amount)}</span></td>
            <td><span style="font-size:11.5px;color:var(--muted-2)">${esc(payment.method || "—")}</span></td>
            <td><div class="cell-actions">
              ${state === "pagado" ? `<button class="row-action danger" type="button" data-action="mark-pending" data-id="${esc(payment.id)}" title="Volver a pendiente"><svg><use href="#i-refresh"/></svg></button>` : `<button class="row-action" type="button" data-action="mark-paid" data-id="${esc(payment.id)}" title="Marcar pagado"><svg><use href="#i-check"/></svg></button>`}
            </div></td>
          </tr>`;
        }).join("") : `<tr><td colspan="7">${emptyState("Sin cobranzas este mes", "Cargá una cuota o cambiá de mes.", "coins")}</td></tr>`}</tbody>
      </table></div>
    </article>`;
  }

  function renderAcademyStock() {
    const products = S.getState().academy.products;
    const low = S.lowStock();
    const moves = S.getState().academy.stockMoves.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
    const owner = S.can("academia.metricas");
    const saleValue = products.reduce((sum, product) => sum + product.stock * product.price, 0);

    return `${low.length ? `<div class="risk-banner"><svg><use href="#i-alert"/></svg><div style="flex:1"><b>${low.length} producto${low.length === 1 ? "" : "s"} con stock bajo</b><p>${low.map((product) => `${product.name} (${product.stock})`).join(" · ")}</p></div><a class="btn btn--danger btn--sm" href="#/academia/stock">Reponer</a></div>` : ""}

    <div class="metric-grid metric-grid--4">
      ${metricCard({ label: "Productos", counterValue: products.length, format: "number", icon: "package", foot: "en catálogo" })}
      ${metricCard({ label: "Unidades en stock", counterValue: products.reduce((sum, product) => sum + product.stock, 0), format: "number", icon: "grid", foot: "todas las categorías" })}
      ${metricCard({ label: "Stock bajo", counterValue: low.length, format: "number", icon: "alert", tone: low.length ? "red" : "green", foot: "en o bajo el mínimo" })}
      ${metricCard({ label: owner ? "Valor de venta" : "Ventas potenciales", counterValue: saleValue, format: "compact", icon: "coins", tone: "green", foot: owner ? `costo ${moneyC(S.stockValue())}` : "a precio de lista" })}
    </div>

    <article class="panel" data-reveal>
      <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Herramientas e insumos</h2><p class="panel-sub">Stock propio de academia y productos</p></div><div class="row">${btn("Nuevo producto", { action: "product", icon: "plus", size: "sm" })}</div></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Producto</th><th>SKU</th><th>Categoría</th><th>Stock</th>${owner ? "<th>Costo</th>" : ""}<th>Precio</th><th><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody>${products.map((product) => `<tr>
          <td><b style="font-size:12px">${esc(product.name)}</b><small style="display:block;color:var(--muted-2);font-size:12px">mínimo ${product.min}</small></td>
          <td><span class="mono" style="font-size:12.5px">${esc(product.sku)}</span></td>
          <td><span class="tag">${esc(product.category)}</span></td>
          <td>${product.stock <= product.min ? status(`${product.stock} · bajo`, "danger") : status(String(product.stock), "ok")}</td>
          ${owner ? `<td><span class="cell-amount">${money(product.cost)}</span></td>` : ""}
          <td><span class="cell-amount">${money(product.price)}</span></td>
          <td><div class="cell-actions">
            <button class="row-action" type="button" data-action="stock-move" data-id="${esc(product.id)}" title="Mover stock"><svg><use href="#i-refresh"/></svg></button>
            <button class="row-action" type="button" data-action="edit-product" data-id="${esc(product.id)}" title="Editar"><svg><use href="#i-edit"/></svg></button>
          </div></td>
        </tr>`).join("")}</tbody>
      </table></div>
    </article>

    <article class="panel" data-reveal>
      <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Últimos movimientos</h2><p class="panel-sub">Entradas, salidas, ajustes y ventas</p></div></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Nota</th><th>Responsable</th></tr></thead><tbody>
        ${moves.length ? moves.map((move) => {
          const product = S.productById(move.productId);
          return `<tr><td><span class="mono" style="font-size:12.5px">${date(move.date)}</span></td><td><b style="font-size:12px">${esc(product?.name || "—")}</b></td><td>${status(move.type === "venta" ? "Venta" : move.type === "entrada" ? "Entrada" : move.type === "salida" ? "Salida" : "Ajuste", move.type === "venta" ? "ok" : move.type === "entrada" ? "info" : move.type === "salida" ? "warn" : "muted")}</td><td><span class="cell-amount">${move.type === "salida" || move.type === "venta" ? "−" : "+"}${move.qty}</span></td><td><span style="font-size:12.5px;color:var(--muted-2)">${esc(move.note)}</span></td><td><span style="font-size:12.5px">${esc(S.userById(move.userId)?.name || "—")}</span></td></tr>`;
        }).join("") : `<tr><td colspan="6">${emptyState("Sin movimientos", "Todavía no se movió stock.", "package")}</td></tr>`}
      </tbody></table></div>
    </article>`;
  }

  function renderAcademyMetrics(metrics) {
    const cohorts = S.getState().academy.cohorts.map((cohort) => S.cohortSummary(cohort));
    const sources = metrics.sources.map((source) => ({
      label: source.source,
      value: source.leads,
      color: "#e879f9",
      display: `${source.leads} → ${source.enrolled}`
    }));

    return `<div class="metric-grid metric-grid--4">
      ${metricCard({ label: "Conversión", counterValue: metrics.conversion, format: "number", suffix: "%", icon: "trending", tone: "green", foot: "lead → inscripto" })}
      ${metricCard({ label: "Costo por alumno", counterValue: metrics.cac, format: "compact", icon: "coins", foot: `marketing ${moneyC(metrics.marketing)}` })}
      ${metricCard({ label: "Deserción", counterValue: metrics.desertion, format: "number", suffix: "%", icon: "alert", tone: metrics.desertion > 10 ? "red" : "green", foot: `${metrics.deserters} de ${metrics.totalStudents}` })}
      ${metricCard({ label: "Ocupación", counterValue: metrics.occupancy, format: "number", suffix: "%", icon: "grid", foot: `${metrics.activeStudents}/${metrics.capacity} lugares` })}
    </div>

    <div class="grid grid--2">
      <article class="panel" data-reveal>
        <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Leads por origen</h2><p class="panel-sub">Volumen y conversión</p></div></div>
        <div class="panel-body chart-holder">${C.barChart(sources, { height: 250, label: "Leads por origen" })}</div>
      </article>
      <article class="panel" data-reveal>
        <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Ocupación por cohorte</h2><p class="panel-sub">Lugares vendidos sobre capacidad</p></div></div>
        <div class="panel-body"><div class="source-list">
          ${cohorts.map((cohort) => `<div class="source-row"><span>${esc(cohort.name)}</span><div class="source-bar"><span style="--value:${cohort.occupancy}%"></span></div><span class="source-numbers">${cohort.count}/${cohort.capacity} · <b>${cohort.occupancy}%</b></span></div>`).join("")}
        </div></div>
      </article>
    </div>

    <div class="grid grid--2">
      <article class="panel" data-reveal>
        <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Conversión por vendedor</h2><p class="panel-sub">Quién cierra mejor</p></div></div>
        <div class="panel-body"><div class="leaderboard">
          ${metrics.sellers.slice().sort((a, b) => b.conversion - a.conversion).map((seller, index) => `<div class="leader-row ${index === 0 && seller.conversion ? "top" : ""}"><span class="leader-rank">${String(index + 1).padStart(2, "0")}</span>${avatar(seller.user, "avatar--sm")}<div class="leader-copy"><b>${esc(seller.user.name)}</b><div class="progress"><span style="--value:${seller.conversion}%"></span></div></div><span class="leader-points">${seller.conversion}<small>%</small></span></div>`).join("")}
        </div></div>
      </article>
      <article class="panel" data-reveal>
        <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Salud académica</h2><p class="panel-sub">Los números que importan</p></div></div>
        <div class="panel-body" style="display:flex;flex-direction:column;gap:11px">
          ${[["Asistencia general", metrics.attendance, "%"], ["Conversión del embudo", metrics.conversion, "%"], ["Ocupación de aulas", metrics.occupancy, "%"], ["Deserción acumulada", metrics.desertion, "%"]].map(([label, value, suffix]) => `<div><div class="row row--between" style="margin-bottom:4px"><span style="font-size:11.5px">${label}</span><b class="mono" style="font-size:11.5px">${value}${suffix}</b></div>${progressBar(value, value >= 75 ? "green" : value >= 50 ? "amber" : "red")}</div>`).join("")}
        </div>
      </article>
    </div>`;
  }

  /* ---------------- auditoría ---------------- */

  function renderAudit() {
    const state = S.getState();
    const entities = [...new Set(state.audit.map((entry) => entry.entity))].sort();
    const audit = state.audit.filter((entry) => {
      if (ui.auditEntity && entry.entity !== ui.auditEntity) return false;
      if (ui.auditUser && entry.userId !== ui.auditUser) return false;
      if (ui.auditQuery) {
        const query = ui.auditQuery.toLowerCase();
        const user = S.userById(entry.userId);
        return `${entry.action} ${entry.entity} ${entry.detail} ${user?.name || ""}`.toLowerCase().includes(query);
      }
      return true;
    });

    return `<section class="page">
      ${pageHead({
        kicker: "Sistema · trazabilidad",
        title: "Auditoría",
        desc: "Cada creación, edición y cobro queda registrado. Sirve para ordenar el equipo y para resolver dudas con datos.",
        actions: btn("Exportar datos", { action: "export", icon: "download" }),
        meta: `<span><svg><use href="#i-shield"/></svg>${state.audit.length} eventos</span><span><svg><use href="#i-clock"/></svg>últimos 500</span>`,
        hero: true
      })}

      <article class="panel" data-reveal>
        <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Registro de actividad</h2><p class="panel-sub">${audit.length} resultados</p></div></div>
        <div class="toolbar">
          <div class="filters">
            <div class="search-input"><svg><use href="#i-search"/></svg><input class="input input--sm" type="search" placeholder="Buscar acción o detalle…" value="${esc(ui.auditQuery)}" data-filter="audit-query"></div>
            <select class="select select--sm" data-filter="audit-entity" aria-label="Filtrar por entidad"><option value="">Toda entidad</option>${entities.map((entity) => `<option value="${esc(entity)}" ${ui.auditEntity === entity ? "selected" : ""}>${esc(entity)}</option>`).join("")}</select>
            <select class="select select--sm" data-filter="audit-user" aria-label="Filtrar por persona"><option value="">Todo el equipo</option>${userOptions(ui.auditUser)}</select>
          </div>
          <button class="chip chip--button ${!ui.auditQuery && !ui.auditEntity && !ui.auditUser ? "active" : ""}" type="button" data-action="audit-reset">Limpiar filtros</button>
        </div>
        <div class="audit-list">
          ${audit.length ? audit.map((entry) => {
            const user = S.userById(entry.userId);
            return `<div class="audit-item">
              <span class="audit-icon"><svg><use href="#i-${auditIcon(entry.entity)}"/></svg></span>
              <div class="audit-copy"><p><b>${esc(user?.name || "Sistema")}</b> ${esc(entry.action)} ${esc(entry.entity.toLowerCase())}${entry.detail ? ` · ${esc(entry.detail)}` : ""}</p><small>${esc(entry.entity)}${entry.entityId ? ` #${esc(entry.entityId)}` : ""}</small></div>
              <span class="audit-time">${dateTime(entry.at)}</span>
            </div>`;
          }).join("") : emptyState("Sin eventos", "Probá con otros filtros.", "shield")}
        </div>
      </article>
    </section>`;
  }

  /* ---------------- configuración ---------------- */

  function renderSettings() {
    const state = S.getState();
    const info = S.storageInfo();
    const bytes = Math.max(info.bytes, 1);
    const used = Math.min(100, Math.round((bytes / (5 * 1024 * 1024)) * 100));
    const roles = S.roles();
    const modules = S.modules();
    const groups = [...new Set(modules.map((module) => module.group))];
    const canUsers = S.can("config.users");
    const canPermissions = S.can("config.permissions");
    const users = state.users.slice().sort((a, b) => {
      const order = { owner: 0, manager: 1, academy: 2, barber: 3 };
      return (order[a.role] ?? 4) - (order[b.role] ?? 4) || a.name.localeCompare(b.name);
    });

    return `<section class="page">
      ${pageHead({
        kicker: "Sistema · configuración",
        title: "Configuración",
        desc: "Metas, puntos, límites de strikes, usuarios y permisos por módulo. Todo lo que define cómo funciona el panel.",
        actions: btn("Exportar backup", { action: "export", icon: "download", variant: "primary" }),
        meta: `<span><svg><use href="#i-database"/></svg>${Math.round(info.bytes / 1024)} KB locales</span><span><svg><use href="#i-refresh"/></svg>${relative(state.updatedAt)}</span>`,
        hero: true
      })}

      <div class="settings-grid">
        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Parámetros generales</h2><p class="panel-sub">Metas y economía de puntos</p></div></div>
          <div class="panel-body">
            <form data-inline="settings" class="form-grid">
              ${textInput("businessName", "Nombre del negocio", state.settings.businessName, { full: true })}
              ${textInput("monthlyGoal", "Meta mensual global (ARS)", state.settings.monthlyGoal, { type: "number", min: 0 })}
              ${textInput("contentGoal", "Piezas de contenido por semana", state.settings.contentGoal, { type: "number", min: 1 })}
              ${textInput("pointsContent", "Puntos por contenido publicado", state.settings.pointsContent, { type: "number", min: 0 })}
              ${textInput("pointsTraining", "Puntos por capacitación aprobada", state.settings.pointsTraining, { type: "number", min: 0 })}
              ${textInput("pointsSale", "Puntos por venta de producto", state.settings.pointsSale, { type: "number", min: 0 })}
              ${textInput("strikeLimit", "Strikes para discontinuar", state.settings.strikeLimit, { type: "number", min: 1 })}
              ${textInput("strikeExpiryDays", "Vencimiento de strikes (días)", state.settings.strikeExpiryDays, { type: "number", min: 1 })}
              <div class="form-actions field--full"><button class="btn btn--primary btn--sm" type="submit"><svg><use href="#i-check"/></svg>Guardar configuración</button></div>
            </form>
          </div>
        </article>

        <div class="stack">
          <article class="panel" data-reveal>
            <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Datos y respaldo</h2><p class="panel-sub">Todo se guarda en este dispositivo</p></div></div>
            <div class="panel-body" style="display:flex;flex-direction:column;gap:11px">
              <div class="storage-meter"><div class="row row--between"><b>${Math.round(info.bytes / 1024)} KB usados</b><small>de ~5 MB disponibles</small></div>${progressBar(used, used > 80 ? "red" : used > 50 ? "amber" : "green")}<small>Última actualización: ${dateTime(info.updatedAt)}</small></div>
              <p class="form-hint">El panel funciona sin servidor: los cambios viven en <span class="mono">localStorage</span>. Exportá un backup antes de limpiar el navegador o cambiar de dispositivo.</p>
              <div class="data-actions">
                ${btn("Exportar JSON", { action: "export", icon: "download", size: "sm", variant: "soft" })}
                ${btn("Importar JSON", { action: "import", icon: "upload", size: "sm" })}
                <input type="file" id="import-file" accept="application/json,.json" hidden>
              </div>
            </div>
          </article>

          <article class="panel panel--violet" data-reveal>
            <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Cómo funciona el acceso</h2><p class="panel-sub">Login simple y permisos por módulo</p></div></div>
            <div class="panel-body" style="display:flex;flex-direction:column;gap:7px">
              ${[["Usuario y contraseña", "Cada persona entra con su usuario. Las claves se cambian desde esta pantalla."], ["Encargado academia", "Ve y maneja toda la academia: alumnos, cobranzas, métricas y stock."], ["Permisos por módulo", "El dueño decide qué sectores ve cada jerarquía."], ["Sin backend", "Las cuentas viven en este dispositivo. Para producción hace falta API + base de datos."]].map(([title, detail]) => `<div class="row" style="align-items:flex-start;gap:8px"><span class="pulse-dot" style="margin-top:5px"></span><div><b style="font-size:12px">${title}</b><small style="display:block;color:var(--muted-2);font-size:12.5px;line-height:1.5">${detail}</small></div></div>`).join("")}
            </div>
          </article>

          <article class="panel danger-zone" data-reveal>
            <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Zona de riesgo</h2><p class="panel-sub">Volver todo al estado inicial</p></div></div>
            <div class="panel-body">
              <p class="form-hint" style="margin-bottom:10px">Se borran los cambios locales y se restauran los datos de demostración. Exportá antes si querés conservar algo.</p>
              ${btn("Restaurar demo", { action: "reset", icon: "refresh", variant: "danger", size: "sm" })}
            </div>
          </article>
        </div>
      </div>

      ${canUsers ? `<article class="panel" data-reveal>
        <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Usuarios y contraseñas</h2><p class="panel-sub">${users.filter((user) => user.active).length} cuentas activas · editá usuario, clave, rol y estado</p></div>${btn("Nueva persona", { action: "new-user", icon: "plus", size: "sm", variant: "soft" })}</div>
        <div class="table-wrap"><table class="data-table user-table">
          <thead><tr><th>Persona</th><th>Usuario</th><th>Rol</th><th>Clave</th><th>Estado</th><th><span class="sr-only">Acciones</span></th></tr></thead>
          <tbody>${users.map((user) => `<tr>
            <td><div class="user-cell">${avatar(user, "avatar--sm")}<div><b>${esc(user.name)}</b><small>${esc(user.email || "sin email")}</small></div></div></td>
            <td><span class="mono" style="font-size:12.5px">@${esc(user.username || "—")}</span></td>
            <td>${tag(S.roleLabel(user.role), user.role === "owner" ? "violet" : user.role === "academy" ? "amber" : user.role === "manager" ? "info" : "muted")}</td>
            <td><span class="status status--muted" title="Se cambia con el botón editar">••••••</span></td>
            <td>${status(user.active ? "Activa" : "Inactiva", user.active ? "ok" : "muted")}</td>
            <td><div class="cell-actions">
              <button class="row-action" type="button" data-action="edit-user" data-id="${esc(user.id)}" title="Editar usuario y clave"><svg><use href="#i-edit"/></svg></button>
              ${user.id === S.currentUserId() ? "" : `<button class="row-action ${user.active ? "danger" : ""}" type="button" data-action="toggle-user" data-id="${esc(user.id)}" title="${user.active ? "Desactivar" : "Activar"}"><svg><use href="#i-${user.active ? "x" : "check"}"/></svg></button>`}
            </div></td>
          </tr>`).join("")}</tbody>
        </table></div>
        <div class="panel-body" style="padding-top:12px"><p class="form-hint">Las contraseñas se guardan en texto plano dentro de este navegador. Es un acceso básico para separar roles, no una bóveda de seguridad.</p></div>
      </article>` : ""}

      ${canPermissions ? `<article class="panel" data-reveal>
        <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Permisos por módulo</h2><p class="panel-sub">Tildá qué sectores puede abrir cada jerarquía. El dueño siempre ve todo.</p></div>${btn("Restaurar permisos", { action: "reset-permissions", icon: "refresh", size: "sm" })}</div>
        <form data-inline="permissions">
          <div class="table-wrap"><table class="data-table permission-matrix">
            <thead><tr><th>Módulo</th>${roles.map((role) => `<th>${esc(state.roles[role]?.label || role)}</th>`).join("")}</tr></thead>
            <tbody>
              ${groups.map((group) => `<tr class="perm-group-row"><td colspan="${roles.length + 1}">${esc(group)}</td></tr>${modules.filter((module) => module.group === group).map((module) => `<tr>
                <td><b style="font-size:12px">${esc(module.label)}</b><small class="perm-hint">${esc(module.hint)}</small></td>
                ${roles.map((role) => {
                  const checked = role === "owner" || S.permissionsFor(role).includes(module.key);
                  return `<td><label class="perm-check ${role === "owner" ? "is-locked" : ""}" title="${esc(module.label)} · ${esc(state.roles[role]?.label || role)}"><input type="checkbox" name="perm-${role}" value="${esc(module.key)}" data-multi="true" ${checked ? "checked" : ""} ${role === "owner" ? "disabled" : ""}><span><svg><use href="#i-check"/></svg></span></label></td>`;
                }).join("")}
              </tr>`).join("")}`).join("")}
            </tbody>
          </table></div>
          <div class="panel-body form-actions" style="justify-content:flex-end"><button class="btn btn--primary btn--sm" type="submit"><svg><use href="#i-check"/></svg>Guardar permisos</button></div>
        </form>
      </article>` : ""}

      <article class="panel" data-reveal>
        <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Jerarquías</h2><p class="panel-sub">Editá los nombres desde Equipo</p></div><a class="link-btn" href="#/equipo">Abrir equipo <svg><use href="#i-arrow"/></svg></a></div>
        <div class="panel-body"><div class="role-cards">
          ${roles.map((role) => `<div class="role-card"><span>${esc(role)}</span><h3>${esc(state.roles[role]?.label || role)}</h3><p>${esc(state.roles[role]?.description || "")}</p><div style="margin-top:8px">${status(`${state.users.filter((user) => user.role === role && user.active).length} activos`, "muted")}</div></div>`).join("")}
        </div></div>
      </article>
    </section>`;
  }

  /* ---------------- mis tareas ---------------- */

  function renderMyTasks() {
    const user = S.currentUser();
    const open = S.openTasks(user.id).slice().sort((a, b) => a.due.localeCompare(b.due));
    const done = S.tasksFor(user.id).filter((task) => task.status === "hecha").slice().sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));
    const reports = S.getState().reports.filter((report) => report.userId === user.id).sort((a, b) => b.date.localeCompare(a.date));
    const today = D.iso(new Date());

    return `<section class="page">
      ${pageHead({
        kicker: `Mi espacio · ${D.weekLabel(D.weekStart(0))}`,
        title: "Lo que tenés pendiente",
        desc: "Tus tareas, tus reportes y lo que viene. Marcá lo que ya está y dejá registro de la semana.",
        actions: `${btn("Nuevo reporte", { action: "new-report", icon: "plus", variant: "primary" })}${btn("Mi contenido", { action: "go", route: "mi-contenido", icon: "image" })}`,
        meta: `<span><svg><use href="#i-check-square"/></svg>${open.length} abiertas</span><span><svg><use href="#i-clock"/></svg>${open.filter((task) => task.due < today).length} vencidas</span>`,
        hero: true
      })}

      <div class="metric-grid metric-grid--4">
        ${metricCard({ label: "Tareas abiertas", counterValue: open.length, format: "number", icon: "check-square", foot: "para esta semana" })}
        ${metricCard({ label: "Tareas hechas", counterValue: done.length, format: "number", icon: "check-circle", tone: "green", foot: "historial" })}
        ${metricCard({ label: "Reportes", counterValue: reports.length, format: "number", icon: "file", tone: "violet", foot: "semanal, cierre o incidente" })}
        ${metricCard({ label: "Puntos", counterValue: S.userPoints(user.id), format: "number", icon: "zap", foot: "acumulados" })}
      </div>

      <div class="grid grid--2-1">
        <article class="panel" data-reveal>
          <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Tareas abiertas</h2><p class="panel-sub">Ordenadas por vencimiento</p></div></div>
          <div class="table-wrap"><table class="data-table"><thead><tr><th>Tarea</th><th>Unidad</th><th>Vence</th><th>Estado</th><th><span class="sr-only">Acciones</span></th></tr></thead><tbody>
            ${open.length ? open.map((task) => `<tr>
              <td><b style="font-size:12px">${esc(task.title)}</b>${task.notes ? `<small style="display:block;color:var(--muted-2);font-size:12.5px">${esc(task.notes)}</small>` : ""}</td>
              <td>${unitTag(S.unitById(task.unitId))}</td>
              <td><span class="mono ${task.due < today ? "text-red" : ""}" style="font-size:12.5px">${date(task.due)}</span></td>
              <td>${status(TASK_STATUS[task.status]?.label || task.status, TASK_STATUS[task.status]?.tone || "muted")}</td>
              <td><div class="cell-actions">${task.status === "pendiente" ? `<button class="row-action" type="button" data-action="advance-task" data-id="${esc(task.id)}" data-status="en-curso" title="Arrancar"><svg><use href="#i-play"/></svg></button>` : ""}<button class="row-action" type="button" data-action="complete-task" data-id="${esc(task.id)}" title="Marcar hecha"><svg><use href="#i-check"/></svg></button></div></td>
            </tr>`).join("") : `<tr><td colspan="5">${emptyState("Sin tareas pendientes", "Buenísimo. Aprovechá para adelantar contenido.", "check-circle")}</td></tr>`}
          </tbody></table></div>
        </article>

        <div class="stack">
          <article class="panel panel--accent" data-reveal>
            <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Cerrar la semana</h2><p class="panel-sub">Dejá tu reporte</p></div></div>
            <div class="panel-body"><p style="color:var(--muted);font-size:12px;line-height:1.6">Contá cuántos cortes hiciste, si vendiste productos y cómo te fue con los clientes. Sirve para la reunión y para tu ficha.</p><button class="btn btn--primary btn--sm" type="button" data-action="new-report" style="margin-top:11px"><svg><use href="#i-plus"/></svg>Registrar reporte</button></div>
          </article>

          <article class="panel" data-reveal>
            <div class="panel-head panel-head--bordered"><div><h2 class="panel-title">Historial</h2><p class="panel-sub">${reports.length} reportes</p></div></div>
            <div class="panel-body" style="display:flex;flex-direction:column;gap:7px">
              ${reports.length ? reports.slice(0, 5).map((report) => `<div class="report-card"><div class="report-card-head"><b style="font-size:12px">${esc(report.type)}</b><span class="status status--muted">${date(report.date)}</span></div><p>${esc(report.summary)}</p><div class="report-metrics"><span><b>${report.metrics.cortes}</b> cortes</span><span><b>${report.metrics.ventas}</b> ventas</span><span><b>${report.metrics.resenas}</b> reseñas</span></div></div>`).join("") : emptyState("Sin reportes", "El primero se carga en un minuto.", "file")}
            </div>
          </article>
        </div>
      </div>
    </section>`;
  }

  /* ---------------- feedback ---------------- */

  let toastTimer = null;

  function toast(message, tone = "ok") {
    const element = $("#toast");
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("is-error", tone === "error");
    element.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("show"), 3200);
  }

  /* ---------------- modales ---------------- */

  function openModal(options) {
    const {
      kicker = "",
      title = "",
      sub = "",
      body = "",
      submitLabel = "Guardar",
      cancelLabel = "Cancelar",
      onSubmit = null,
      size = "",
      hideSubmit = false
    } = options;
    const root = $("#modal-root");
    if (!root) return null;
    root.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal"></div>
      <form class="modal ${size === "lg" ? "modal--lg" : size === "sm" ? "modal--sm" : ""}" id="modal-form" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <header class="modal-head">
          <div>
            ${kicker ? `<span class="modal-kicker">${esc(kicker)}</span>` : ""}
            <h2 class="modal-title">${title}</h2>
            ${sub ? `<p class="modal-sub">${sub}</p>` : ""}
          </div>
          <button class="modal-close" type="button" data-action="close-modal" aria-label="Cerrar"><svg><use href="#i-x"/></svg></button>
        </header>
        <div class="modal-body">${body}</div>
        <footer class="modal-foot">
          <button class="btn btn--ghost btn--sm" type="button" data-action="close-modal">${esc(cancelLabel)}</button>
          ${hideSubmit ? "" : `<button class="btn btn--primary btn--sm" type="submit"><svg><use href="#i-check"/></svg>${esc(submitLabel)}</button>`}
        </footer>
      </form>`;
    root.classList.add("open");
    document.body.classList.add("no-scroll");
    const form = $("#modal-form", root);
    if (onSubmit) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        try {
          onSubmit(formValues(form), form);
        } catch (error) {
          toast(error?.message || "No se pudo guardar.", "error");
        }
      });
    }
    const first = $("input:not([type=hidden]):not([type=checkbox]), select, textarea", form);
    if (first) setTimeout(() => first.focus(), 80);
    return form;
  }

  function closeModal() {
    const root = $("#modal-root");
    if (!root) return;
    root.classList.remove("open");
    root.innerHTML = "";
    document.body.classList.remove("no-scroll");
  }

  function formValues(form) {
    const data = {};
    $$("input, select, textarea", form).forEach((field) => {
      if (!field.name) return;
      if (field.type === "checkbox") {
        if (field.dataset.multi === "true") {
          if (!Array.isArray(data[field.name])) data[field.name] = [];
          if (field.checked) data[field.name].push(field.value);
          return;
        }
        data[field.name] = field.checked;
        return;
      }
      if (field.type === "radio") {
        if (field.checked) data[field.name] = field.value;
        return;
      }
      data[field.name] = field.value;
    });
    return data;
  }

  function optionsFrom(pairs, selected) {
    return pairs
      .map(([value, label]) => `<option value="${esc(value)}" ${String(value) === String(selected) ? "selected" : ""}>${esc(label)}</option>`)
      .join("");
  }

  function afterChange(message = "Guardado.") {
    closeModal();
    renderView();
    toast(message);
  }

  function confirmDialog({ title, text, label = "Eliminar", onConfirm }) {
    openModal({
      kicker: "Confirmar",
      title,
      size: "sm",
      body: `<p style="color:var(--muted);font-size:12.5px;line-height:1.65">${esc(text)}</p>`,
      submitLabel: label,
      onSubmit: () => {
        try {
          onConfirm();
        } catch (error) {
          toast(error?.message || "No se pudo completar.", "error");
        }
      }
    });
    const submit = $('#modal-form button[type="submit"]');
    if (submit) {
      submit.classList.remove("btn--primary");
      submit.classList.add("btn--danger");
    }
  }

  /* ---------------- modales: negocio ---------------- */

  function openTransaction(id = "") {
    if (!S.isOwner()) return toast("Solo el dueño puede tocar las finanzas.", "error");
    const state = S.getState();
    const tx = id ? state.transactions.find((item) => item.id === id) : null;
    if (tx && tx.category === "Facturación mensual") return openBilling(id);
    if (!tx && !state.units.some((unit) => unit.active)) return toast("Primero creá una unidad de negocio.", "error");
    const body = `<div class="form-grid">
      ${textInput("date", "Fecha", tx?.date || D.iso(new Date()), { type: "date", required: true })}
      ${textInput("amount", "Monto (ARS)", tx?.amount ?? "", { type: "number", min: 0, required: true })}
      ${selectField("unitId", "Unidad de negocio", unitOptions(tx?.unitId, true), tx?.unitId || "barberia")}
      ${selectField("type", "Tipo", optionsFrom([["income", "Ingreso"], ["cost", "Costo"]], tx?.type || "income"), tx?.type || "income")}
      ${textInput("category", "Categoría", tx?.category || "Ingresos", { full: true, placeholder: "Cortes, Cuotas, Marketing…" })}
      ${textArea("description", "Detalle", tx?.description || "", { rows: 2, placeholder: "¿De qué se trata?" })}
    </div>`;
    openModal({
      kicker: "Finanzas",
      title: tx ? "EDITAR MOVIMIENTO" : "NUEVO MOVIMIENTO",
      sub: "Todo ingreso y todo costo pertenece a una unidad.",
      body,
      submitLabel: tx ? "Guardar cambios" : "Cargar movimiento",
      onSubmit: (data) => {
        const payload = {
          date: data.date,
          amount: Number(data.amount),
          unitId: data.unitId,
          type: data.type,
          category: data.category || (data.type === "cost" ? "Gasto" : "Ingreso"),
          description: data.description,
          source: "manual"
        };
        if (!payload.amount) throw new Error("El monto tiene que ser mayor a cero.");
        if (tx) S.updateTransaction(tx.id, payload);
        else S.addTransaction(payload);
        afterChange(tx ? "Movimiento actualizado." : "Movimiento cargado.");
      }
    });
  }

  function openBilling(id = "") {
    if (!S.isOwner()) return toast("Solo el dueño puede cargar la facturación.", "error");
    const tx = id ? S.getState().transactions.find((item) => item.id === id) : null;
    const body = `<div class="form-grid">
      <input type="hidden" name="unitId" value="barberia">
      <input type="hidden" name="type" value="income">
      <input type="hidden" name="category" value="Facturación mensual">
      ${textInput("date", "Fecha del cierre", tx?.date || D.iso(new Date()), { type: "date", required: true })}
      ${textInput("amount", "Facturación total (ARS)", tx?.amount ?? "", { type: "number", min: 0, required: true })}
      ${textArea("description", "Detalle", tx?.description || `Facturación barbería · ${D.monthLabel(ui.month)}`, { rows: 2, full: true })}
    </div>
    <p class="form-hint" style="margin-top:10px">Se carga como ingreso de Barbería con categoría <span class="mono">Facturación mensual</span> y se suma al resto de las unidades.</p>`;
    openModal({
      kicker: "Barbería · cierre manual",
      title: tx ? "EDITAR FACTURACIÓN" : "CARGAR FACTURACIÓN",
      sub: `${D.monthLabel(ui.month)} · el número que trae el dueño`,
      body,
      submitLabel: tx ? "Guardar cambios" : "Cargar facturación",
      onSubmit: (data) => {
        const payload = {
          date: data.date,
          amount: Number(data.amount),
          unitId: "barberia",
          type: "income",
          category: "Facturación mensual",
          description: data.description || `Facturación barbería · ${D.monthLabel(ui.month)}`,
          source: "manual"
        };
        if (!payload.amount) throw new Error("La facturación tiene que ser mayor a cero.");
        if (tx) S.updateTransaction(tx.id, payload);
        else S.addTransaction(payload);
        afterChange(tx ? "Facturación actualizada." : "Facturación de barbería cargada.");
      }
    });
  }

  function openUnit(id = "") {
    if (!S.isOwner()) return toast("Solo el dueño puede editar las unidades.", "error");
    const unit = id ? S.unitById(id) : null;
    const body = `<div class="form-grid">
      ${textInput("name", "Nombre", unit?.name || "", { required: true, placeholder: "Ecommerce, Servicios…" })}
      ${textInput("kind", "Tipo interno", unit?.kind || "custom", { placeholder: "barberia, academia, ecommerce…" })}
      ${textArea("description", "Descripción", unit?.description || "", { rows: 2 })}
      ${textInput("goal", "Meta mensual (ARS)", unit?.goal ?? "", { type: "number", min: 0 })}
      <div class="field">
        <label for="f-color">Color</label>
        <input class="input" id="f-color" name="color" type="color" value="${esc(unit?.color || "#a78bfa")}" style="height:38px;padding:4px">
      </div>
      ${selectField("icon", "Ícono", optionsFrom([["layers", "Capas"], ["scissors", "Tijeras"], ["graduation", "Academia"], ["package", "Productos"], ["globe", "Ecommerce"], ["wallet", "Servicios"], ["zap", "Energía"], ["target", "Objetivos"]], unit?.icon || "layers"), unit?.icon || "layers")}
    </div>`;
    openModal({
      kicker: "Unidades de negocio",
      title: unit ? "EDITAR UNIDAD" : "SUMAR UNIDAD",
      sub: "Cada unidad tiene su meta, su color y sus movimientos.",
      body,
      submitLabel: unit ? "Guardar cambios" : "Crear unidad",
      onSubmit: (data) => {
        if (!data.name.trim()) throw new Error("Poné un nombre para la unidad.");
        S.upsertUnit({
          id: unit?.id,
          name: data.name.trim(),
          kind: data.kind || "custom",
          description: data.description,
          color: data.color || "#a78bfa",
          icon: data.icon || "layers",
          goal: Number(data.goal || 0),
          active: true
        });
        afterChange(unit ? "Unidad actualizada." : "Unidad creada.");
      }
    });
  }

  /* ---------------- modales: equipo ---------------- */

  function openUser(id = "", presetRole = "barber") {
    if (!S.can("config.users")) return toast("No tenés permiso para editar usuarios.", "error");
    const state = S.getState();
    const user = id ? S.userById(id) : null;
    const role = user?.role || presetRole;
    const roleOptions = ["barber", "academy", "manager", "owner"].map((key) => [key, state.roles[key]?.label || key]);
    const body = `<div class="form-grid">
      ${textInput("name", "Nombre y apellido", user?.name || "", { required: true, full: true })}
      ${textInput("username", "Usuario", user?.username || "", { required: true, placeholder: "sin espacios, ej. tomi" })}
      ${textInput("password", user ? "Nueva contraseña" : "Contraseña", "", { type: "password", required: !user, placeholder: user ? "Dejar en blanco para mantener" : "mínimo simple" })}
      ${selectField("role", "Rol", optionsFrom(roleOptions, role), role)}
      ${textInput("commission", "Comisión (%)", user?.commission ?? (role === "barber" ? 40 : 0), { type: "number", min: 0, max: 100 })}
      ${textInput("email", "Email", user?.email || "", { type: "email" })}
      ${textInput("phone", "Teléfono", user?.phone || "", { type: "tel" })}
      ${user ? "" : textInput("startedAt", "Fecha de ingreso", D.iso(new Date()), { type: "date", full: true })}
      ${user ? checkField("active", "Cuenta activa", user.active !== false, "Puede iniciar sesión con su usuario y contraseña.") : ""}
    </div>
    <p class="form-hint" style="margin-top:10px">El usuario se guarda en minúsculas y sin espacios. Las contraseñas son básicas: sirven para separar accesos, no para seguridad bancaria.</p>`;
    openModal({
      kicker: "Equipo y roles",
      title: user ? "EDITAR PERSONA" : presetRole === "barber" ? "NUEVO BARBERO" : "NUEVA PERSONA",
      sub: user ? `${S.roleLabel(user.role)} · ${user.active ? "activo" : "inactivo"}` : "Se crea activo y puede entrar con el usuario y la clave que definas.",
      body,
      submitLabel: user ? "Guardar cambios" : "Crear persona",
      onSubmit: (data) => {
        if (!data.name.trim()) throw new Error("Falta el nombre.");
        if (!String(data.username || "").trim()) throw new Error("Falta el usuario de acceso.");
        if (!user && !String(data.password || "").trim()) throw new Error("Definí una contraseña inicial.");
        if (user?.id === S.currentUserId() && data.active === false) throw new Error("No podés desactivar tu propia cuenta.");
        if (S.usernameTaken(data.username, user?.id)) throw new Error(`El usuario “${data.username}” ya está en uso.`);
        S.upsertUser({
          id: user?.id,
          name: data.name.trim(),
          username: data.username,
          password: data.password,
          role: data.role,
          email: data.email,
          phone: data.phone,
          commission: Number(data.commission || 0),
          active: data.active,
          startedAt: data.startedAt
        });
        renderShell();
        afterChange(user ? "Persona actualizada." : "Persona creada.");
      }
    });
  }

  /* ---------------- modales: operación ---------------- */

  function openTask(id = "") {
    const task = id ? S.getState().tasks.find((item) => item.id === id) : null;
    const state = S.getState();
    const today = D.iso(new Date());
    const body = `<div class="form-grid">
      ${textInput("title", "Tarea", task?.title || "", { required: true, full: true, placeholder: "Qué hay que hacer" })}
      ${selectField("assigneeId", "Responsable", userOptions(task?.assigneeId || S.currentUserId()), task?.assigneeId || S.currentUserId())}
      ${textInput("due", "Fecha límite", task?.due || D.daysAhead(2), { type: "date", required: true })}
      ${selectField("priority", "Prioridad", optionsFrom([["alta", "Alta"], ["media", "Media"], ["baja", "Baja"]], task?.priority || "media"), task?.priority || "media")}
      ${selectField("unitId", "Unidad", unitOptions(task?.unitId || "barberia", true), task?.unitId || "barberia")}
      ${selectField("status", "Estado", optionsFrom([["pendiente", "Pendiente"], ["en-curso", "En curso"], ["hecha", "Hecha"]], task?.status || "pendiente"), task?.status || "pendiente")}
      ${textArea("notes", "Notas", task?.notes || "", { rows: 2, placeholder: "Contexto, links o criterio de cierre" })}
    </div>`;
    openModal({
      kicker: "Operación",
      title: task ? "EDITAR TAREA" : "NUEVA TAREA",
      sub: "Con responsable y fecha. Nada queda en el aire.",
      body,
      submitLabel: task ? "Guardar cambios" : "Crear tarea",
      onSubmit: (data) => {
        if (!data.title.trim()) throw new Error("La tarea necesita un título.");
        if (task) S.updateTask(task.id, data);
        else S.addTask(data);
        afterChange(task ? "Tarea actualizada." : "Tarea creada.");
      }
    });
  }

  function openMeeting() {
    const state = S.getState();
    const active = state.users.filter((user) => user.active);
    const body = `<div class="form-grid">
      ${textInput("title", "Título del acta", `MeetBarber · ${D.weekLabel(D.weekStart(0))}`, { full: true })}
      ${textInput("date", "Fecha", D.iso(new Date()), { type: "date" })}
      ${textArea("notes", "Resumen de la reunión", "", { rows: 3, placeholder: "Qué se habló, cómo viene la semana…" })}
      ${textArea("decisions", "Decisiones", "", { rows: 3, placeholder: "Una decisión por línea" })}
      ${textInput("actionText", "Acción principal", "", { full: true, placeholder: "Qué se hace y quién lo hace" })}
      ${selectField("actionOwner", "Responsable de la acción", userOptions("", "all"), "")}
      ${textInput("actionDue", "Vence", D.daysAhead(7), { type: "date" })}
    </div>
    <div class="modal-section" style="margin-top:14px">
      <h3>Asistentes</h3>
      <div style="display:flex;flex-wrap:wrap;gap:6px 14px">
        ${active.map((user) => checkField(`attendee-${user.id}`, user.name, true)).join("")}
      </div>
    </div>`;
    openModal({
      kicker: "MeetBarber",
      title: "REGISTRAR REUNIÓN",
      sub: "Decisiones y acciones quedan en el acta del equipo.",
      body,
      submitLabel: "Guardar acta",
      size: "lg",
      onSubmit: (data) => {
        const attendees = active
          .filter((user) => data[`attendee-${user.id}`])
          .map((user) => user.id);
        const decisions = String(data.decisions || "").split("\n").map((line) => line.trim()).filter(Boolean);
        const actions = data.actionText.trim()
          ? [{ text: data.actionText.trim(), ownerId: data.actionOwner, due: data.actionDue, status: "pendiente" }]
          : [];
        S.addMeeting({ title: data.title, date: data.date, notes: data.notes, attendees, decisions, actions });
        afterChange("Acta de MeetBarber guardada.");
      }
    });
  }

  /* ---------------- modales: contenido ---------------- */

  function openContent(presetUserId = "") {
    const barbers = S.barbers();
    if (!barbers.length) return toast("Primero sumá un barbero al equipo.", "error");
    const locked = S.isBarber();
    const userId = locked ? S.currentUserId() : presetUserId || barbers[0].id;
    const body = `<div class="form-grid">
      ${locked
        ? `<input type="hidden" name="userId" value="${esc(userId)}"><div class="field field--full"><label>Barbero</label><div class="tag">${esc(S.userById(userId)?.name || "")}</div></div>`
        : selectField("userId", "Barbero", barberOptions(userId), userId)}
      ${textInput("title", "Título de la pieza", "", { required: true, full: true, placeholder: "Idea o descripción corta" })}
      ${selectField("type", "Formato", optionsFrom([["Reel", "Reel"], ["Foto", "Foto"], ["Video", "Video"], ["Story", "Story"]], "Reel"), "Reel")}
      ${selectField("stage", "Etapa", optionsFrom([["grabado", "Grabado"], ["drive", "Subido a Drive"], ["publicado", "Publicado"]], "grabado"), "grabado")}
      ${textInput("link", "Link (Drive o publicación)", "", { type: "url", full: true, placeholder: "https://…" })}
    </div>
    <p class="form-hint" style="margin-top:10px">Semana ${D.weekLabel(ui.contentWeek)}. Si ya está publicada, suma ${S.getState().settings.pointsContent} puntos automáticamente.</p>`;
    openModal({
      kicker: "Contenido semanal",
      title: "NUEVA PIEZA",
      sub: "Grabado → Drive → publicado.",
      body,
      submitLabel: "Cargar pieza",
      onSubmit: (data) => {
        if (!data.title.trim()) throw new Error("Poné un título a la pieza.");
        if (data.stage === "publicado" && !data.link) throw new Error("Si ya está publicada, agregá el link.");
        S.addContentPiece({
          userId: data.userId,
          weekStart: ui.contentWeek,
          title: data.title.trim(),
          type: data.type,
          stage: data.stage,
          link: data.link
        });
        afterChange(data.stage === "publicado" ? "Pieza cargada y puntos acreditados." : "Pieza cargada en el pipeline.");
      }
    });
  }

  /* ---------------- modales: capacitaciones ---------------- */

  function openTraining() {
    if (!(S.isOwner() || S.can("training.manage"))) return toast("No tenés permiso para crear capacitaciones.", "error");
    const body = `<div class="form-grid">
      ${textInput("title", "Título", "", { required: true, full: true })}
      ${textArea("description", "Descripción", "", { rows: 2, placeholder: "Qué aprende y para qué sirve" })}
      ${selectField("level", "Nivel", optionsFrom([["inicial", "Inicial"], ["intermedio", "Intermedio"], ["avanzado", "Avanzado"], ["dueno", "Dueño"]], "inicial"), "inicial")}
      ${textInput("minutes", "Duración (min)", 30, { type: "number", min: 1 })}
      ${textInput("passScore", "Score mínimo para aprobar", 70, { type: "number", min: 1, max: 100 })}
    </div>
    ${[1, 2, 3].map((index) => `<div class="modal-section" style="margin-top:14px">
      <h3>Pregunta ${index} ${index === 1 ? "" : "(opcional)"}</h3>
      <div class="form-grid">
        ${textInput(`q${index}`, "Pregunta", "", { full: true })}
        ${textInput(`o${index}`, "Opciones separadas con |", "", { full: true, placeholder: "Opción A | Opción B | Opción C" })}
        ${textInput(`a${index}`, "Respuesta correcta (1, 2 o 3)", 1, { type: "number", min: 1, max: 3 })}
      </div>
    </div>`).join("")}`;
    openModal({
      kicker: "Capacitaciones",
      title: "NUEVO MÓDULO",
      sub: "Contenido corto + mini quiz. Aprobar suma puntos.",
      body,
      submitLabel: "Crear módulo",
      size: "lg",
      onSubmit: (data) => {
        if (!data.title.trim()) throw new Error("El módulo necesita un título.");
        const questions = [1, 2, 3]
          .map((index) => {
            const question = String(data[`q${index}`] || "").trim();
            const options = String(data[`o${index}`] || "").split("|").map((option) => option.trim()).filter(Boolean);
            if (!question || options.length < 2) return null;
            const answer = Math.min(Math.max(Number(data[`a${index}`] || 1) - 1, 0), options.length - 1);
            return { q: question, options, answer };
          })
          .filter(Boolean);
        S.addTraining({
          title: data.title.trim(),
          description: data.description,
          level: data.level,
          minutes: Number(data.minutes || 30),
          passScore: Number(data.passScore || 70),
          questions
        });
        afterChange("Módulo creado con su mini quiz.");
      }
    });
  }

  function openTrainingRecord(trainingId = "", userId = "") {
    if (!(S.isOwner() || S.can("training.manage"))) return toast("No tenés permiso para cargar resultados.", "error");
    const state = S.getState();
    if (!state.trainings.length) return toast("Todavía no hay capacitaciones.", "error");
    const training = S.trainingById(trainingId) || state.trainings[0];
    const selectedUser = userId || S.barbers()[0]?.id || S.currentUserId();
    const body = `<div class="form-grid">
      ${selectField("trainingId", "Capacitación", state.trainings.map((item) => [item.id, item.title]).map((pair) => `<option value="${esc(pair[0])}" ${pair[0] === training.id ? "selected" : ""}>${esc(pair[1])}</option>`).join(""), training.id)}
      ${selectField("userId", "Persona", barberOptions(selectedUser), selectedUser)}
      ${textInput("score", "Score (%)", 70, { type: "number", min: 0, max: 100, required: true })}
      ${textInput("date", "Fecha", D.iso(new Date()), { type: "date" })}
    </div>`;
    openModal({
      kicker: "Capacitaciones",
      title: "CARGAR RESULTADO",
      sub: `${training.title} · mínimo ${training.passScore}%`,
      body,
      submitLabel: "Guardar resultado",
      onSubmit: (data) => {
        const score = Number(data.score || 0);
        const target = S.trainingById(data.trainingId);
        const record = S.saveTrainingRecord({ trainingId: data.trainingId, userId: data.userId, score, date: data.date });
        const approved = record?.status === "aprobado";
        afterChange(approved ? `Aprobó con ${score}%. Se acreditaron ${S.getState().settings.pointsTraining} puntos.` : `Quedó en ${score}%. Puede volver a rendir.`);
      }
    });
  }

  function openQuiz(trainingId) {
    const training = S.trainingById(trainingId);
    if (!training) return;
    if (!training.questions?.length) return toast("Este módulo todavía no tiene preguntas.", "error");
    const body = `<div class="quiz">
      ${training.questions.map((question, index) => `<div class="quiz-question">
        <b><span>${String(index + 1).padStart(2, "0")}</span>${esc(question.q)}</b>
        <div class="quiz-options">${question.options.map((option, optionIndex) => `<label class="quiz-option"><input type="radio" name="q${index}" value="${optionIndex}" ${optionIndex === 0 ? "" : ""}><span>${esc(option)}</span></label>`).join("")}</div>
      </div>`).join("")}
    </div>`;
    openModal({
      kicker: "Mini quiz",
      title: training.title,
      sub: `${training.questions.length} preguntas · ${training.passScore}% para aprobar · ${training.minutes} min`,
      body,
      submitLabel: "Entregar",
      size: "lg",
      onSubmit: (data) => {
        const answers = training.questions.map((_, index) => Number(data[`q${index}`]));
        if (answers.some((answer) => Number.isNaN(answer))) throw new Error("Contestá todas las preguntas antes de entregar.");
        const correct = training.questions.reduce((sum, question, index) => sum + (answers[index] === question.answer ? 1 : 0), 0);
        const score = Math.round((correct / training.questions.length) * 100);
        const passed = score >= Number(training.passScore || 70);
        const record = S.saveTrainingRecord({ trainingId: training.id, userId: S.currentUserId(), score });
        renderView();
        const labels = ["MUY BIEN.", "APROBADO.", "A FONDO.", "CASI."];
        openModal({
          kicker: `Resultado · ${training.title}`,
          title: passed ? labels[0] : labels[2],
          size: "sm",
          hideSubmit: true,
          cancelLabel: "Cerrar",
          body: `<div class="quiz-result ${passed ? "pass" : "fail"}">
            <strong>${score}%</strong>
            <h3>${passed ? "Capacitación aprobada" : "Todavía no"}</h3>
            <p>${passed ? `Acertaste ${correct} de ${training.questions.length}. Sumaste ${S.getState().settings.pointsTraining} puntos y quedó registrado en tu ficha.` : `Acertaste ${correct} de ${training.questions.length}. Necesitás ${training.passScore}% para aprobar. Podés volver a rendir cuando quieras.`}</p>
            ${record ? `<span class="status status--${passed ? "ok" : "danger"}">${record.status}</span>` : ""}
          </div>`
        });
      }
    });
  }

  /* ---------------- modales: puntos y strikes ---------------- */

  function openPoints(userId = "") {
    if (!(S.isOwner() || S.can("points.manage"))) return toast("No tenés permiso para otorgar puntos.", "error");
    const barbers = S.barbers();
    if (!barbers.length) return toast("Primero sumá un barbero.", "error");
    const body = `<div class="form-grid">
      ${selectField("userId", "Persona", barberOptions(userId || barbers[0].id), userId || barbers[0].id)}
      ${textInput("points", "Puntos", 20, { type: "number", min: 1, required: true })}
      ${selectField("category", "Categoría", optionsFrom([["contenido", "Contenido"], ["capacitacion", "Capacitación"], ["ventas", "Ventas"], ["equipo", "Equipo"], ["manual", "Manual"]], "equipo"), "equipo")}
      ${textInput("date", "Fecha", D.iso(new Date()), { type: "date" })}
      ${textInput("reason", "Motivo", "", { full: true, required: true, placeholder: "Qué hizo para ganarlos" })}
    </div>`;
    openModal({
      kicker: "Puntos · reconocimiento",
      title: "SUMAR PUNTOS",
      sub: "Los puntos premian lo objetivo. No son sanción.",
      body,
      submitLabel: "Otorgar puntos",
      onSubmit: (data) => {
        if (!data.reason.trim()) throw new Error("Contá el motivo de los puntos.");
        S.awardPoints({ userId: data.userId, points: Number(data.points), category: data.category, reason: data.reason.trim(), date: data.date });
        afterChange(`+${Number(data.points)} puntos otorgados.`);
      }
    });
  }

  function openStrike(userId = "") {
    if (!(S.isOwner() || S.can("strikes.manage"))) return toast("No tenés permiso para registrar strikes.", "error");
    const barbers = S.barbers();
    if (!barbers.length) return toast("Primero sumá un barbero.", "error");
    const body = `<div class="form-grid">
      ${selectField("userId", "Persona", barberOptions(userId || barbers[0].id), userId || barbers[0].id)}
      ${textInput("date", "Fecha", D.iso(new Date()), { type: "date" })}
      ${textInput("reason", "Motivo", "", { full: true, required: true, placeholder: "Título corto del strike" })}
      ${textArea("detail", "Detalle", "", { rows: 3, placeholder: "Qué pasó, cuándo y con quién" })}
      ${textInput("evidence", "Evidencia (link)", "", { type: "url", full: true, placeholder: "https://…" })}
      ${textInput("expiryDays", "Vence en (días)", S.getState().settings.strikeExpiryDays, { type: "number", min: 1 })}
    </div>
    <p class="form-hint" style="margin-top:10px">El barbero puede dejar su descargo. A los ${S.getState().settings.strikeLimit} strikes activos se evalúa la continuidad.</p>`;
    openModal({
      kicker: "Strikes · conducta",
      title: "REGISTRAR STRIKE",
      sub: "Motivo, fecha, evidencia y derecho a descargo.",
      body,
      submitLabel: "Registrar strike",
      size: "lg",
      onSubmit: (data) => {
        if (!data.reason.trim()) throw new Error("El strike necesita un motivo.");
        S.addStrike({
          userId: data.userId,
          date: data.date,
          reason: data.reason.trim(),
          detail: data.detail,
          evidence: data.evidence,
          expiryDays: Number(data.expiryDays || 90)
        });
        afterChange("Strike registrado. La persona puede responder.");
      }
    });
  }

  function openStrikeResponse(id) {
    const strike = S.getState().strikes.find((item) => item.id === id);
    if (!strike) return;
    if (strike.userId !== S.currentUserId() && !S.isOwner()) return toast("Solo la persona involucrada puede responder.", "error");
    const body = `<div class="modal-section">
      <h3>${esc(strike.reason)}</h3>
      <p style="color:var(--muted);font-size:12px;line-height:1.6">${esc(strike.detail || "")}</p>
    </div>
    ${textArea("response", "Tu descargo", strike.response || "", { rows: 4, placeholder: "Contá tu versión de los hechos" })}`;
    openModal({
      kicker: "Derecho a descargo",
      title: "RESPONDER STRIKE",
      sub: `Registrado el ${dateFull(strike.date)} · vence ${dateFull(strike.expiresAt)}`,
      body,
      submitLabel: "Guardar descargo",
      onSubmit: (data) => {
        if (!data.response.trim()) throw new Error("Escribí tu descargo.");
        S.respondStrike(strike.id, data.response.trim());
        afterChange("Descargo guardado en tu ficha.");
      }
    });
  }

  function openArchiveStrike(id) {
    const strike = S.getState().strikes.find((item) => item.id === id);
    if (!strike) return;
    openModal({
      kicker: "Strikes",
      title: "ARCHIVAR STRIKE",
      sub: `${S.userById(strike.userId)?.name || ""} · ${strike.reason}`,
      size: "sm",
      body: `${textArea("note", "Nota de archivo (opcional)", "", { rows: 3, placeholder: "Por qué se archiva" })}`,
      submitLabel: "Archivar",
      onSubmit: (data) => {
        S.archiveStrike(strike.id, data.note.trim());
        afterChange("Strike archivado.");
      }
    });
  }

  function openReport(presetUserId = "") {
    const locked = S.isBarber();
    const userId = locked ? S.currentUserId() : presetUserId || S.barbers()[0]?.id || S.currentUserId();
    const body = `<div class="form-grid">
      ${locked
        ? `<input type="hidden" name="userId" value="${esc(userId)}">`
        : selectField("userId", "Persona", userOptions(userId), userId)}
      ${selectField("type", "Tipo de reporte", optionsFrom([["semanal", "Cierre semanal"], ["cierre", "Cierre de caja"], ["incidente", "Incidente"], ["meetbarber", "MeetBarber"]], "semanal"), "semanal")}
      ${textInput("date", "Fecha", D.iso(new Date()), { type: "date" })}
      ${textArea("summary", "Resumen", "", { rows: 3, required: true, placeholder: "Qué pasó, cómo salió la semana…" })}
      ${textInput("cortes", "Cortes", 0, { type: "number", min: 0 })}
      ${textInput("ventas", "Ventas de producto", 0, { type: "number", min: 0 })}
      ${textInput("resenas", "Reseñas", 0, { type: "number", min: 0 })}
    </div>`;
    openModal({
      kicker: "Reportes de trabajo",
      title: "NUEVO REPORTE",
      sub: "Cierre, incidente o reunión. Queda en la ficha.",
      body,
      submitLabel: "Guardar reporte",
      onSubmit: (data) => {
        if (!data.summary.trim()) throw new Error("Escribí un resumen del reporte.");
        S.addReport({
          userId: data.userId,
          type: data.type,
          date: data.date,
          summary: data.summary.trim(),
          cortes: Number(data.cortes || 0),
          ventas: Number(data.ventas || 0),
          resenas: Number(data.resenas || 0)
        });
        afterChange("Reporte guardado.");
      }
    });
  }

  /* ---------------- modales: academia ---------------- */

  function sellerOptions(selected) {
    const state = S.getState();
    const sellers = S.managers().length ? S.managers() : state.users.filter((user) => user.active && user.role !== "barber");
    return sellers.map((user) => `<option value="${esc(user.id)}" ${user.id === selected ? "selected" : ""}>${esc(user.name)}</option>`).join("");
  }

  function openLead(id = "") {
    if (!S.can("academy.leads")) return toast("No tenés permiso para manejar leads.", "error");
    const lead = id ? S.leadById(id) : null;
    const sellers = S.managers().length ? S.managers() : S.getState().users.filter((user) => user.role === "owner");
    const sellerId = lead?.sellerId || sellers[0]?.id || S.currentUserId();
    const body = `<div class="form-grid">
      ${textInput("name", "Nombre", lead?.name || "", { required: true, full: true })}
      ${textInput("phone", "WhatsApp", lead?.phone || "", { type: "tel", placeholder: "+54 11 …" })}
      ${textInput("source", "Origen", lead?.source || "Instagram", { placeholder: "Instagram, Google, recomendación…" })}
      ${selectField("level", "Nivel de interés", optionsFrom([["inicial", "Inicial"], ["intermedio", "Intermedio"], ["avanzado", "Avanzado"], ["dueno", "Dueño"]], lead?.level || "inicial"), lead?.level || "inicial")}
      ${selectField("sellerId", "Vendedor", sellerOptions(sellerId), sellerId)}
      ${selectField("stage", "Etapa", optionsFrom([["consulta", "Consulta"], ["entrevista", "Entrevista"], ["inscripto", "Inscripto"], ["perdido", "Perdido"]], lead?.stage || "consulta"), lead?.stage || "consulta")}
      ${textInput("createdAt", "Fecha de entrada", lead?.createdAt || D.iso(new Date()), { type: "date" })}
      ${textArea("notes", "Notas", lead?.notes || "", { rows: 2, placeholder: "Horarios, dudas, quién lo contactó…" })}
    </div>`;
    openModal({
      kicker: "Academia · embudo",
      title: lead ? "EDITAR LEAD" : "NUEVO LEAD",
      sub: "Consulta → entrevista → inscripto. Todo con origen y vendedor.",
      body,
      submitLabel: lead ? "Guardar cambios" : "Cargar lead",
      onSubmit: (data) => {
        if (!data.name.trim()) throw new Error("El lead necesita un nombre.");
        if (lead) S.updateLead(lead.id, data);
        else S.addLead(data);
        afterChange(lead ? "Lead actualizado." : "Lead cargado en el embudo.");
      }
    });
  }

  function openCohort() {
    if (!S.can("academy.students")) return toast("No tenés permiso para crear cohortes.", "error");
    const state = S.getState();
    const teachers = state.users.filter((user) => user.active && user.role !== "barber");
    const teacherId = teachers[0]?.id || S.currentUserId();
    const body = `<div class="form-grid">
      ${textInput("name", "Nombre de la cohorte", "", { required: true, full: true, placeholder: "Inicial N1 · Enero" })}
      ${selectField("level", "Nivel", optionsFrom([["inicial", "Inicial"], ["intermedio", "Intermedio"], ["avanzado", "Avanzado"], ["dueno", "Dueño"]], "inicial"), "inicial")}
      ${selectField("teacherId", "Docente", optionsFrom(teachers.map((user) => [user.id, user.name]), teacherId), teacherId)}
      ${textInput("startDate", "Inicio", D.iso(new Date()), { type: "date" })}
      ${textInput("endDate", "Fin", D.daysAhead(60), { type: "date" })}
      ${textInput("capacity", "Capacidad", 8, { type: "number", min: 1 })}
      ${textInput("price", "Valor de la cuota (ARS)", 120000, { type: "number", min: 0 })}
      ${textInput("inscription", "Inscripción (ARS)", 60000, { type: "number", min: 0 })}
      ${textInput("schedule", "Días y horario", "", { full: true, placeholder: "Lun y Mar · 14 a 16" })}
    </div>`;
    openModal({
      kicker: "Academia · cohortes",
      title: "NUEVA COHORTE",
      sub: "Nivel, fechas, capacidad y valores.",
      body,
      submitLabel: "Crear cohorte",
      onSubmit: (data) => {
        if (!data.name.trim()) throw new Error("Poné un nombre a la cohorte.");
        S.addCohort({ ...data, capacity: Number(data.capacity), price: Number(data.price), inscription: Number(data.inscription) });
        afterChange("Cohorte creada.");
      }
    });
  }

  function openStudent() {
    if (!S.can("academy.students")) return toast("No tenés permiso para cargar alumnos.", "error");
    const cohorts = S.getState().academy.cohorts;
    if (!cohorts.length) return toast("Primero creá una cohorte.", "error");
    const cohort = cohorts[0];
    const body = `<div class="form-grid">
      ${textInput("name", "Nombre y apellido", "", { required: true, full: true })}
      ${textInput("phone", "WhatsApp", "", { type: "tel" })}
      ${textInput("email", "Email", "", { type: "email" })}
      ${selectField("cohortId", "Cohorte", cohortOptions(cohort.id), cohort.id)}
      ${selectField("status", "Estado", optionsFrom([["cursando", "Cursando"], ["egresado", "Egresado"], ["desertor", "Desertor"]], "cursando"), "cursando")}
      ${textInput("enrolledAt", "Fecha de alta", D.iso(new Date()), { type: "date" })}
      ${textInput("inscription", "Inscripción (ARS)", cohort.inscription, { type: "number", min: 0 })}
      ${selectField("method", "Medio de pago", optionsFrom([["Transferencia", "Transferencia"], ["Efectivo", "Efectivo"], ["Mercado Pago", "Mercado Pago"], ["Tarjeta", "Tarjeta"]], "Transferencia"), "Transferencia")}
      ${checkField("paid", "Inscripción paga", true, "Si está paga, genera el ingreso en Academia.")}
    </div>`;
    openModal({
      kicker: "Academia · alumnos",
      title: "NUEVO ALUMNO",
      sub: "Alta en cohorte + inscripción.",
      body,
      submitLabel: "Cargar alumno",
      onSubmit: (data) => {
        if (!data.name.trim()) throw new Error("El alumno necesita un nombre.");
        const student = S.addStudent({
          name: data.name.trim(),
          phone: data.phone,
          email: data.email,
          cohortId: data.cohortId,
          status: data.status,
          enrolledAt: data.enrolledAt,
          inscription: Number(data.inscription || 0),
          paid: data.paid,
          method: data.method,
          createPayment: true
        });
        if (!student) throw new Error("No se pudo crear el alumno.");
        afterChange("Alumno inscripto en la cohorte.");
      }
    });
  }

  function openEnrollLead(leadId) {
    if (!S.can("academy.leads")) return toast("No tenés permiso para inscribir leads.", "error");
    const lead = S.leadById(leadId);
    const cohorts = S.getState().academy.cohorts.slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
    if (!lead) return;
    if (!cohorts.length) return toast("Primero creá una cohorte.", "error");
    const cohort = cohorts[0];
    const body = `<div class="form-grid">
      <input type="hidden" name="leadId" value="${esc(lead.id)}">
      <div class="field field--full"><label>Lead</label><div class="tag">${esc(lead.name)} · ${esc(lead.phone || "sin teléfono")}</div></div>
      ${selectField("cohortId", "Cohorte", cohortOptions(cohort.id), cohort.id)}
      ${textInput("amount", "Inscripción (ARS)", cohort.inscription, { type: "number", min: 0 })}
      ${selectField("method", "Medio de pago", optionsFrom([["Transferencia", "Transferencia"], ["Efectivo", "Efectivo"], ["Mercado Pago", "Mercado Pago"], ["Tarjeta", "Tarjeta"]], "Transferencia"), "Transferencia")}
      ${checkField("paid", "Inscripción paga", true, "Si está paga, genera el ingreso en Academia.")}
    </div>`;
    openModal({
      kicker: "Academia · inscripción",
      title: "INSCRIBIR LEAD",
      sub: `${lead.name} pasa a alumno de la cohorte.`,
      body,
      submitLabel: "Inscribir",
      onSubmit: (data) => {
        const result = S.enrollLead(lead.id, data.cohortId, { amount: Number(data.amount || 0), paid: data.paid, method: data.method });
        if (!result) throw new Error("No se pudo inscribir el lead.");
        afterChange(`${result.student.name} quedó inscripto en ${result.cohort.name}.`);
      }
    });
  }

  function openPayment(studentId = "") {
    if (!S.can("academia.pagos")) return toast("No tenés permiso para cargar pagos.", "error");
    const students = S.getState().academy.students;
    if (!students.length) return toast("Primero cargá un alumno.", "error");
    const student = S.studentById(studentId) || students[0];
    const cohort = S.cohortById(student.cohortId);
    const body = `<div class="form-grid">
      ${selectField("studentId", "Alumno", studentOptions(student.id), student.id)}
      ${selectField("concept", "Concepto", optionsFrom([["Cuota", "Cuota"], ["Inscripción", "Inscripción"], ["Material", "Material"], ["Otro", "Otro"]], "Cuota"), "Cuota")}
      ${textInput("amount", "Monto (ARS)", cohort?.price || 0, { type: "number", min: 0, required: true })}
      ${textInput("dueDate", "Vencimiento", D.iso(new Date()), { type: "date" })}
      ${selectField("method", "Medio de pago", optionsFrom([["Transferencia", "Transferencia"], ["Efectivo", "Efectivo"], ["Mercado Pago", "Mercado Pago"], ["Tarjeta", "Tarjeta"]], "Transferencia"), "Transferencia")}
      ${checkField("paid", "Cobrado hoy", false, "Al cobrar se crea el ingreso en la unidad Academia.")}
    </div>`;
    openModal({
      kicker: "Academia · cobranzas",
      title: "CARGAR PAGO",
      sub: "La cuota queda vinculada al alumno y a su cohorte.",
      body,
      submitLabel: "Cargar pago",
      onSubmit: (data) => {
        const amount = Number(data.amount || 0);
        if (!amount) throw new Error("El monto tiene que ser mayor a cero.");
        S.addPayment({
          studentId: data.studentId,
          concept: data.concept,
          amount,
          dueDate: data.dueDate,
          paid: data.paid,
          paidDate: D.iso(new Date()),
          method: data.method
        });
        afterChange(data.paid ? "Pago cargado y acreditado en Academia." : "Cuota cargada como pendiente.");
      }
    });
  }

  function openMarkPaid(id) {
    if (!S.can("academia.pagos")) return toast("No tenés permiso para acreditar pagos.", "error");
    const payment = S.getState().academy.payments.find((item) => item.id === id);
    if (!payment) return;
    const student = S.studentById(payment.studentId);
    const body = `<div class="form-grid">
      ${selectField("method", "Medio de pago", optionsFrom([["Transferencia", "Transferencia"], ["Efectivo", "Efectivo"], ["Mercado Pago", "Mercado Pago"], ["Tarjeta", "Tarjeta"], ["Débito", "Débito"]], payment.method || "Transferencia"), payment.method || "Transferencia")}
      ${textInput("paidDate", "Fecha de cobro", D.iso(new Date()), { type: "date" })}
    </div>
    <p class="form-hint" style="margin-top:10px">Al acreditar se genera un ingreso de ${money(payment.amount)} en Academia, sin duplicar cobranzas.</p>`;
    openModal({
      kicker: "Academia · cobranza",
      title: "ACREDITAR PAGO",
      sub: `${student?.name || "Alumno"} · ${payment.concept}`,
      body,
      submitLabel: "Acreditar pago",
      onSubmit: (data) => {
        S.markPaymentPaid(payment.id, data.method, data.paidDate);
        afterChange("Pago acreditado. Ingreso sumado a Academia.");
      }
    });
  }

  function attendanceMarkup(cohort, dateValue) {
    const students = S.cohortStudents(cohort.id);
    const entry = S.getState().academy.attendance.find((item) => item.cohortId === cohort.id && item.date === dateValue);
    if (!students.length) return `<div class="content-empty">No hay alumnos activos en esta cohorte.</div>`;
    return students
      .map((student) => {
        const checked = entry ? Boolean(entry.records?.[student.id]) : true;
        return `<label class="checkbox" style="padding:8px 10px;border:1px solid var(--line);background:rgba(255,255,255,.015)">
          <input type="checkbox" name="present" data-multi="true" value="${esc(student.id)}" ${checked ? "checked" : ""}>
          <span class="box"><svg><use href="#i-check"/></svg></span>
          <span>${esc(student.name)}<small class="form-hint" style="margin-left:6px">${esc(student.status)}</small></span>
        </label>`;
      })
      .join("");
  }

  function openAttendance(cohortId) {
    if (!S.can("academy.students")) return toast("No tenés permiso para tomar asistencia.", "error");
    const cohort = S.cohortById(cohortId);
    if (!cohort) return;
    const today = D.iso(new Date());
    const body = `<div class="form-grid">
      ${textInput("attDate", "Fecha de clase", today, { type: "date", required: true })}
      <div class="field field--full"><label>Presentes</label><div id="att-list" class="attendance-list">${attendanceMarkup(cohort, today)}</div></div>
    </div>
    <p class="form-hint" style="margin-top:10px">${esc(cohort.name)} · ${esc(cohort.schedule)} · los que no marques quedan ausentes.</p>`;
    const form = openModal({
      kicker: "Academia · asistencia",
      title: "TOMAR ASISTENCIA",
      sub: `${cohort.name} · ${S.cohortStudents(cohort.id).length} alumnos`,
      body,
      submitLabel: "Guardar asistencia",
      onSubmit: (data) => {
        const present = Array.isArray(data.present) ? data.present : [];
        const records = {};
        S.cohortStudents(cohort.id).forEach((student) => {
          records[student.id] = present.includes(student.id);
        });
        S.saveAttendance(cohort.id, data.attDate, records);
        afterChange(`Asistencia guardada: ${present.length} de ${Object.keys(records).length} presentes.`);
      }
    });
    const dateField = $("#f-attDate", form);
    const list = $("#att-list", form);
    if (dateField && list) {
      dateField.addEventListener("change", () => {
        list.innerHTML = attendanceMarkup(cohort, dateField.value);
      });
    }
  }

  function openProduct(id = "") {
    if (!S.can("academy.stock")) return toast("No tenés permiso para editar stock.", "error");
    const product = id ? S.productById(id) : null;
    const body = `<div class="form-grid">
      ${textInput("name", "Producto", product?.name || "", { required: true, full: true })}
      ${textInput("sku", "SKU", product?.sku || "", { placeholder: "POM-MAT" })}
      ${textInput("category", "Categoría", product?.category || "Producto", { placeholder: "Producto, Herramienta, Insumo" })}
      ${textInput("cost", "Costo (ARS)", product?.cost ?? 0, { type: "number", min: 0 })}
      ${textInput("price", "Precio de venta (ARS)", product?.price ?? 0, { type: "number", min: 0 })}
      ${product ? "" : textInput("stock", "Stock inicial", 0, { type: "number", min: 0 })}
      ${textInput("min", "Stock mínimo", product?.min ?? 0, { type: "number", min: 0 })}
      ${selectField("unitId", "Unidad", unitOptions(product?.unitId || "productos", true), product?.unitId || "productos")}
    </div>
    ${product ? `<p class="form-hint" style="margin-top:10px">Stock actual: <b>${product.stock}</b>. Para modificarlo usá <b>Mover stock</b> y queda el movimiento registrado.</p>` : ""}`;
    openModal({
      kicker: "Academia · stock",
      title: product ? "EDITAR PRODUCTO" : "NUEVO PRODUCTO",
      sub: "Herramientas e insumos con stock propio.",
      body,
      submitLabel: product ? "Guardar cambios" : "Crear producto",
      onSubmit: (data) => {
        if (!data.name.trim()) throw new Error("El producto necesita un nombre.");
        if (product) {
          S.updateProduct(product.id, data);
        } else {
          S.addProduct({
            ...data,
            cost: Number(data.cost || 0),
            price: Number(data.price || 0),
            stock: Number(data.stock || 0),
            min: Number(data.min || 0)
          });
        }
        afterChange(product ? "Producto actualizado." : "Producto creado.");
      }
    });
  }

  function openStockMove(productId) {
    if (!S.can("academy.stock")) return toast("No tenés permiso para mover stock.", "error");
    const product = S.productById(productId);
    if (!product) return;
    const body = `<div class="form-grid">
      ${selectField("type", "Movimiento", optionsFrom([["entrada", "Entrada"], ["salida", "Salida"], ["venta", "Venta"], ["ajuste", "Ajuste de inventario"]], "entrada"), "entrada")}
      ${textInput("qty", "Cantidad", 1, { type: "number", min: 1, required: true })}
      ${textInput("date", "Fecha", D.iso(new Date()), { type: "date" })}
      ${textInput("price", "Precio unitario si es venta", product.price, { type: "number", min: 0 })}
      ${textArea("note", "Nota", "", { rows: 2, placeholder: "Por qué se mueve" })}
    </div>
    <p class="form-hint" style="margin-top:10px">Stock actual de ${esc(product.name)}: <b>${product.stock}</b>. Las ventas generan ingreso en Productos.</p>`;
    openModal({
      kicker: "Academia · stock",
      title: "MOVER STOCK",
      sub: `${product.name} · ${product.sku}`,
      body,
      submitLabel: "Registrar movimiento",
      onSubmit: (data) => {
        S.stockMove({
          productId: product.id,
          type: data.type,
          qty: Number(data.qty || 0),
          date: data.date,
          note: data.note,
          price: Number(data.price || product.price)
        });
        const labels = { entrada: "Entrada registrada.", salida: "Salida registrada.", venta: "Venta registrada e ingreso cargado.", ajuste: "Inventario ajustado." };
        afterChange(labels[data.type] || "Stock actualizado.");
      }
    });
  }

  /* ---------------- búsqueda global ---------------- */

  const normText = (value) =>
    String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  function paletteItems() {
    const user = S.currentUser();
    if (!user) return [];
    const items = [];
    NAV.forEach((group) => {
      group.items
        .filter((item) => item.roles.includes(user.role))
        .forEach((item) => items.push({ label: item.label, sub: group.title, route: item.route, icon: item.icon }));
    });
    if (S.isBarber()) {
      items.push({ label: user.name, sub: "Mi ficha", route: "mi-ficha", icon: "user" });
      return items;
    }
    S.barbers().forEach((barber) => items.push({ label: barber.name, sub: `Barbero · ${barber.commission}% comisión`, route: `barbero/${barber.id}`, icon: "scissors" }));
    S.getState().academy.students.forEach((student) => {
      const cohort = S.cohortById(student.cohortId);
      items.push({ label: student.name, sub: `Alumno · ${cohort?.name || "sin cohorte"}`, route: "academia/alumnos", icon: "graduation" });
    });
    S.getState().academy.leads.forEach((lead) => items.push({ label: lead.name, sub: `Lead · ${LEAD_STAGE[lead.stage]?.label || lead.stage}`, route: "academia/embudo", icon: "target" }));
    S.getState().trainings.forEach((training) => items.push({ label: training.title, sub: "Capacitación", route: "capacitaciones", icon: "graduation" }));
    if (S.isOwner()) {
      S.getState().units.filter((unit) => unit.active).forEach((unit) => items.push({ label: unit.name, sub: "Unidad de negocio", route: "unidades", icon: unit.icon }));
    }
    return items;
  }

  function renderPalette(items, query) {
    const search = normText(query).trim();
    const list = (search ? items.filter((item) => normText(`${item.label} ${item.sub}`).includes(search)) : items).slice(0, 14);
    if (!list.length) return `<p class="form-hint" style="padding:14px 4px">Sin resultados para “${esc(query)}”.</p>`;
    return list
      .map((item) => `<button class="palette-item" type="button" data-action="go" data-route="${esc(item.route)}">
        <span class="palette-icon"><svg><use href="#i-${item.icon}"/></svg></span>
        <span class="palette-copy"><b>${esc(item.label)}</b><small>${esc(item.sub)}</small></span>
        <svg class="palette-arrow"><use href="#i-arrow"/></svg>
      </button>`)
      .join("");
  }

  function openSearch() {
    if (!S.currentUser()) return;
    closePopovers();
    const items = paletteItems();
    const form = openModal({
      kicker: "Búsqueda global",
      title: "¿A DÓNDE VAMOS?",
      sub: "Personas, alumnos, capacitaciones y secciones.",
      hideSubmit: true,
      cancelLabel: "Cerrar",
      body: `<div class="search-input" style="margin-bottom:12px"><svg><use href="#i-search"/></svg><input class="input" id="palette-input" type="search" placeholder="Buscar o saltar a…" autocomplete="off"></div><div id="palette-results" class="palette-results">${renderPalette(items, "")}</div>`
    });
    const input = $("#palette-input", form);
    const results = $("#palette-results", form);
    if (input && results) {
      input.focus();
      input.addEventListener("input", () => {
        results.innerHTML = renderPalette(items, input.value);
      });
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const first = $(".palette-item", form);
      if (first) first.click();
    });
  }

  /* ---------------- acciones ---------------- */

  function handleAction(action, target) {
    const id = target.dataset.id || "";
    const route = target.dataset.route || "";
    const state = S.getState();
    switch (action) {
      case "toggle-password": {
        const input = $("#login-password");
        const icon = $("use", target);
        if (!input) return;
        const visible = input.type === "text";
        input.type = visible ? "password" : "text";
        if (icon) icon.setAttribute("href", visible ? "#i-eye" : "#i-eye-off");
        target.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
        input.focus();
        return;
      }
      case "logout":
        S.clearSession();
        closeModal();
        closePopovers();
        showLogin();
        toast("Sesión cerrada.");
        return;
      case "toggle-notifications": {
        const panel = $("#notif-panel");
        const open = panel.hidden;
        closePopovers("notif-panel");
        if (open) {
          renderNotifications();
          panel.hidden = false;
        } else panel.hidden = true;
        return;
      }
      case "toggle-user-menu": {
        const panel = $("#user-menu");
        const open = panel.hidden;
        closePopovers("user-menu");
        if (open) {
          renderUserMenu();
          panel.hidden = false;
        } else panel.hidden = true;
        return;
      }
      case "toggle-quick": {
        const panel = $("#quick-menu");
        const open = panel.hidden;
        closePopovers("quick-menu");
        if (open) {
          renderQuickMenu();
          panel.hidden = false;
        } else panel.hidden = true;
        return;
      }
      case "open-sidebar":
        document.body.classList.add("sidebar-open");
        {
          const backdrop = $(".sidebar-backdrop");
          if (backdrop) backdrop.hidden = false;
        }
        return;
      case "close-sidebar":
        document.body.classList.remove("sidebar-open");
        {
          const backdrop = $(".sidebar-backdrop");
          if (backdrop) backdrop.hidden = true;
        }
        return;
      case "close-modal":
        closeModal();
        return;
      case "open-search":
        openSearch();
        return;
      case "go":
        closeModal();
        closePopovers();
        navigate(route);
        return;
      case "quick": {
        closePopovers();
        const quick = target.dataset.quick;
        if (quick === "billing") openBilling();
        else if (quick === "task") openTask();
        else if (quick === "lead") openLead();
        else if (quick === "points") S.isBarber() ? navigate("mis-puntos") : openPoints();
        else if (quick === "content") openContent();
        else if (quick === "strike") openStrike();
        else if (quick === "report") openReport(S.currentUserId());
        return;
      }
      case "month-prev":
        ui.month = shiftMonth(ui.month, -1);
        renderView();
        return;
      case "month-next":
        ui.month = shiftMonth(ui.month, 1);
        renderView();
        return;
      case "week-prev":
        ui.contentWeek = D.iso(D.addDays(D.parseISO(ui.contentWeek), -7));
        renderView();
        return;
      case "week-next":
        ui.contentWeek = D.iso(D.addDays(D.parseISO(ui.contentWeek), 7));
        renderView();
        return;
      case "week-now":
        ui.contentWeek = D.weekStart(0);
        renderView();
        return;
      case "transaction":
        openTransaction();
        return;
      case "billing":
        openBilling();
        return;
      case "edit-transaction":
        openTransaction(id);
        return;
      case "filter-unit":
        ui.unitFilter = id;
        ui.txType = "";
        renderView();
        setTimeout(() => {
          const panels = $$(".panel", $("#view"));
          panels[panels.length - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 90);
        return;
      case "new-unit":
        openUnit();
        return;
      case "edit-unit":
        openUnit(id);
        return;
      case "new-user":
        openUser("", "barber");
        return;
      case "new-barber":
        openUser("", "barber");
        return;
      case "edit-user":
        openUser(id);
        return;
      case "toggle-user": {
        if (!S.can("config.users")) return toast("No tenés permiso para editar usuarios.", "error");
        const user = S.userById(id);
        if (!user) return;
        const wasActive = user.active;
        S.toggleUser(id);
        renderView();
        toast(wasActive ? `${user.name} desactivado.` : `${user.name} activado.`);
        return;
      }
      case "confirm-delete": {
        const kind = target.dataset.kind;
        confirmDelete(kind, id);
        return;
      }
      case "task":
        openTask();
        return;
      case "edit-task":
        openTask(id);
        return;
      case "advance-task":
      case "complete-task": {
        const status = action === "complete-task" ? "hecha" : target.dataset.status;
        S.setTaskStatus(id, status);
        renderView();
        toast(status === "hecha" ? "Tarea completada." : status === "en-curso" ? "Tarea en curso." : "Tarea actualizada.");
        return;
      }
      case "task-filter":
        ui.taskFilter = id;
        renderView();
        return;
      case "task-filter-user":
        navigate("operacion/tareas");
        return;
      case "run-checklist":
        navigate("operacion/checklists");
        return;
      case "toggle-checklist-item": {
        const checklistId = target.dataset.checklist;
        const itemId = target.dataset.item;
        const checklist = S.checklistById(checklistId);
        if (!checklist) return;
        const today = D.iso(new Date());
        const run = state.checklistRuns.find((item) => item.checklistId === checklistId && item.date === today);
        const completed = new Set(run?.completed || []);
        if (completed.has(itemId)) completed.delete(itemId);
        else completed.add(itemId);
        S.saveChecklistRun(checklistId, [...completed], S.currentUserId());
        renderView();
        if (completed.size === checklist.items.length) toast(`Checklist completo: ${checklist.title}.`);
        return;
      }
      case "meeting":
        openMeeting();
        return;
      case "content":
        openContent(id);
        return;
      case "advance-content": {
        const piece = S.advanceContent(id);
        renderView();
        if (piece) toast(`${piece.title} → ${stageLabel(piece.stage)}${piece.stage === "publicado" ? " · puntos acreditados" : ""}.`);
        return;
      }
      case "new-training":
        openTraining();
        return;
      case "training-record":
        openTrainingRecord(target.dataset.training || "", target.dataset.user || "");
        return;
      case "take-training":
        openQuiz(id);
        return;
      case "points-tab":
        ui.pointsTab = id;
        renderView();
        return;
      case "strike-filter":
        ui.strikeFilter = id;
        renderView();
        return;
      case "new-points":
        openPoints(id);
        return;
      case "new-strike":
        openStrike(id);
        return;
      case "respond-strike":
        openStrikeResponse(id);
        return;
      case "archive-strike":
        openArchiveStrike(id);
        return;
      case "new-report":
        openReport(id);
        return;
      case "lead":
        openLead();
        return;
      case "edit-lead":
        openLead(id);
        return;
      case "move-lead": {
        const stage = target.dataset.stage;
        const lead = S.moveLead(id, stage);
        renderView();
        if (lead) toast(`${lead.name} → ${LEAD_STAGE[stage]?.label || stage}.`);
        return;
      }
      case "enroll-lead":
        openEnrollLead(id);
        return;
      case "cohort":
        openCohort();
        return;
      case "student":
        openStudent();
        return;
      case "attendance":
        openAttendance(id);
        return;
      case "payment":
        openPayment(id);
        return;
      case "mark-paid":
        openMarkPaid(id);
        return;
      case "mark-pending": {
        const payment = state.academy.payments.find((item) => item.id === id);
        if (!payment) return;
        confirmDialog({
          title: "VOLVER A PENDIENTE",
          text: "Se quita el ingreso vinculado de la unidad Academia y la cuota vuelve a pendiente. ¿Seguir?",
          label: "Marcar pendiente",
          onConfirm: () => {
            S.markPaymentPending(id);
            afterChange("Cuota marcada como pendiente.");
          }
        });
        return;
      }
      case "product":
        openProduct();
        return;
      case "edit-product":
        openProduct(id);
        return;
      case "stock-move":
        openStockMove(id);
        return;
      case "audit-reset":
        ui.auditQuery = "";
        ui.auditEntity = "";
        ui.auditUser = "";
        renderView();
        return;
      case "export":
        exportBackup();
        return;
      case "import":
        importBackup();
        return;
      case "reset-permissions": {
        confirmDialog({
          title: "RESTAURAR PERMISOS",
          text: "Se vuelven los accesos por defecto: el encargado recupera operación y academia sin pagos; el encargado de academia recupera toda la academia.",
          label: "Restaurar permisos",
          onConfirm: () => {
            S.resetPermissions();
            closeModal();
            renderShell();
            renderView();
            toast("Permisos restaurados.");
          }
        });
        return;
      }
      case "reset": {
        confirmDialog({
          title: "RESTAURAR DEMO",
          text: "Se borran los cambios guardados en este navegador y vuelven los datos de demostración. Exportá un backup antes si querés conservar algo.",
          label: "Restaurar demo",
          onConfirm: () => {
            S.resetData();
            closeModal();
            ui.month = D.monthKey(0);
            ui.contentWeek = D.weekStart(0);
            enterApp();
            toast("Datos de demostración restaurados.");
          }
        });
        return;
      }
      default:
        return;
    }
  }

  function confirmDelete(kind, id) {
    const state = S.getState();
    if (kind === "transaction") {
      const tx = state.transactions.find((item) => item.id === id);
      if (!tx) return;
      if (tx.linkedType) return toast("Este movimiento está vinculado a un cobro o venta.", "error");
      confirmDialog({
        title: "ELIMINAR MOVIMIENTO",
        text: `${tx.description || tx.category} · ${money(tx.amount)}. Esta acción queda registrada en auditoría.`,
        onConfirm: () => {
          S.deleteTransaction(id);
          afterChange("Movimiento eliminado.");
        }
      });
      return;
    }
    if (kind === "task") {
      const task = state.tasks.find((item) => item.id === id);
      if (!task) return;
      confirmDialog({
        title: "ELIMINAR TAREA",
        text: `“${task.title}” se borra del tablero y del historial de la persona.`,
        onConfirm: () => {
          S.deleteTask(id);
          afterChange("Tarea eliminada.");
        }
      });
      return;
    }
    if (kind === "content") {
      const piece = state.contentPieces.find((item) => item.id === id);
      if (!piece) return;
      confirmDialog({
        title: "ELIMINAR PIEZA",
        text: `“${piece.title}” sale del pipeline. Los puntos ya otorgados no se descuentan.`,
        onConfirm: () => {
          S.deleteContentPiece(id);
          afterChange("Pieza eliminada.");
        }
      });
    }
  }

  function exportBackup() {
    const blob = new Blob([S.exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `masivo-control-${D.iso(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Backup exportado.");
  }

  function importBackup() {
    let input = $("#import-file");
    if (!input) {
      input = document.createElement("input");
      input.type = "file";
      input.id = "import-file";
      input.accept = "application/json,.json";
      input.hidden = true;
      document.body.appendChild(input);
    }
    input.value = "";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const raw = await file.text();
        S.importData(raw);
        closeModal();
        enterApp();
        toast("Backup importado correctamente.");
      } catch (error) {
        toast(error?.message || "No se pudo importar el archivo.", "error");
      }
    };
    input.click();
  }

  /* ---------------- eventos globales ---------------- */

  let filterTimer = null;

  function applyFilter(field, refocus = false) {
    const key = field.dataset.filter;
    const value = field.value;
    if (key === "tx-query") ui.txQuery = value;
    if (key === "tx-type") ui.txType = value;
    if (key === "tx-unit") ui.unitFilter = value;
    if (key === "audit-query") ui.auditQuery = value;
    if (key === "audit-entity") ui.auditEntity = value;
    if (key === "audit-user") ui.auditUser = value;
    if (key === "students-query") ui.studentsQuery = value;
    if (key === "students-level") ui.studentsLevel = value;
    if (key === "students-status") ui.studentsStatus = value;
    renderView();
    if (refocus) {
      const again = $(`[data-filter="${key}"]`);
      if (again && typeof again.focus === "function") {
        again.focus();
        if (typeof again.setSelectionRange === "function") {
          const length = again.value.length;
          again.setSelectionRange(length, length);
        }
      }
    }
  }

  function sparkAt(x, y) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const spark = $("#click-spark");
    if (!spark) return;
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    spark.style.animation = "none";
    void spark.offsetWidth;
    spark.style.animation = "";
  }

  function bindGlobal() {
    document.addEventListener("click", (event) => {
      const control = event.target.closest("[data-action]");
      const action = control?.dataset.action || "";
      if (!action.startsWith("toggle-")) closePopovers();
      if (control) handleAction(action, control);
      sparkAt(event.clientX, event.clientY);
    });

    document.addEventListener("submit", (event) => {
      const form = event.target;
      const inline = form.dataset.inline;
      if (!inline) return;
      event.preventDefault();
      if (inline === "login") {
        const data = formValues(form);
        const username = String(data.username || "").trim();
        const password = String(data.password || "");
        if (!username || !password) {
          showLoginError("Completá usuario y contraseña.");
          return;
        }
        const result = S.login(username, password);
        if (!result) {
          showLoginError("Usuario o contraseña incorrectos.");
          toast("Usuario o contraseña incorrectos.", "error");
          const pass = $("#login-password");
          if (pass) {
            pass.value = "";
            pass.focus();
          }
          return;
        }
        form.reset();
        form.dataset.touched = "";
        afterLogin();
        return;
      }
      if (inline === "permissions") {
        if (!S.can("config.permissions")) return toast("No tenés permiso para editar los accesos.", "error");
        const data = formValues(form);
        const map = {};
        ["manager", "academy", "barber"].forEach((role) => {
          map[role] = Array.isArray(data[`perm-${role}`]) ? data[`perm-${role}`] : [];
        });
        map.owner = ["*"];
        S.savePermissions(map);
        renderShell();
        renderView();
        toast("Permisos actualizados.");
        return;
      }
      if (inline === "roles") {
        S.updateRoles(formValues(form));
        renderView();
        toast("Nombres de roles actualizados.");
        return;
      }
      if (inline === "settings") {
        const data = formValues(form);
        S.saveSettings({
          businessName: data.businessName,
          monthlyGoal: Number(data.monthlyGoal || 0),
          contentGoal: Number(data.contentGoal || 1),
          pointsContent: Number(data.pointsContent || 0),
          pointsTraining: Number(data.pointsTraining || 0),
          pointsSale: Number(data.pointsSale || 0),
          strikeLimit: Number(data.strikeLimit || 3),
          strikeExpiryDays: Number(data.strikeExpiryDays || 90)
        });
        renderView();
        toast("Configuración guardada.");
      }
    });

    document.addEventListener("change", (event) => {
      const field = event.target.closest("[data-filter]");
      if (!field) return;
      if (field.matches('input[type="search"], input[type="text"]')) return;
      applyFilter(field);
    });

    document.addEventListener("input", (event) => {
      const field = event.target.closest("[data-filter]");
      if (!field) return;
      if (!field.matches('input[type="search"], input[type="text"]')) return;
      clearTimeout(filterTimer);
      filterTimer = setTimeout(() => applyFilter(field, true), 230);
    });

    document.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
        return;
      }
      if (event.key === "Escape") {
        if ($("#modal-root")?.classList.contains("open")) {
          closeModal();
          return;
        }
        if (["notif-panel", "user-menu", "quick-menu"].some((id) => $("#" + id)?.hidden === false)) {
          closePopovers();
          return;
        }
        if (document.body.classList.contains("sidebar-open")) {
          document.body.classList.remove("sidebar-open");
          const backdrop = $(".sidebar-backdrop");
          if (backdrop) backdrop.hidden = true;
        }
        return;
      }
      const active = document.activeElement;
      const typing = active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        openSearch();
      }
    });

    window.addEventListener("hashchange", () => {
      if (!S.currentUser()) return;
      renderView();
    });
  }

  init();
})();
