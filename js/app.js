/* ============================================================
   MASIVO BARBER — PROTOCOLO NEON
   Interacciones sin dependencias
   ============================================================ */

(() => {
  "use strict";

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const pad = (value) => String(value).padStart(2, "0");

  const store = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* almacenamiento no disponible */
      }
    },
  };

  /* ---------- toast ---------- */

  const toast = $("#toast");
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2800);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const helper = document.createElement("textarea");
        helper.value = text;
        helper.setAttribute("readonly", "");
        helper.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
        document.body.appendChild(helper);
        helper.select();
        const copied = document.execCommand("copy");
        helper.remove();
        return copied;
      } catch {
        return false;
      }
    }
  }

  /* ---------- year ---------- */

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- header, progress, nav ---------- */

  const header = $("#site-header");
  const progress = $("#scroll-progress");
  const navLinks = $$(".nav-link");
  const navSections = ["guia", "estilos", "errores", "volver", "regalo", "academia"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  let scrollTicking = false;

  function onScroll() {
    const top = window.scrollY;
    if (header) header.classList.toggle("scrolled", top > 24);

    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(top / max, 1) : 0;
      progress.style.transform = `scaleX(${ratio})`;
    }

    if (document.body.classList.contains("page-guide")) {
      const marker = top + 150;
      let currentId = "";
      navSections.forEach((section) => {
        if (section.offsetTop <= marker) currentId = section.id;
      });

      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${currentId}`);
      });
    }

    scrollTicking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollTicking) {
        scrollTicking = true;
        window.requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  onScroll();

  /* ---------- mobile menu ---------- */

  const menuToggle = $(".menu-toggle");
  const mobileMenu = $("#mobile-menu");

  function closeMenu() {
    document.body.classList.remove("menu-open");
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir menú");
    }
    if (mobileMenu) mobileMenu.setAttribute("aria-hidden", "true");
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("menu-open");
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      mobileMenu.setAttribute("aria-hidden", String(!open));
    });

    $$("a", mobileMenu).forEach((link) => link.addEventListener("click", closeMenu));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  /* ---------- reveal on scroll ---------- */

  $$("[data-reveal-group]").forEach((group) => {
    $$("[data-reveal]", group).forEach((element, index) => {
      element.style.setProperty("--reveal-delay", `${Math.min(index * 65, 390)}ms`);
    });
  });

  const revealElements = $$("[data-reveal]");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px" }
    );
    revealElements.forEach((element) => revealObserver.observe(element));
  }

  /* ---------- counters ---------- */

  function animateCounter(element) {
    const target = Number(element.dataset.count);
    if (!Number.isFinite(target)) return;

    const suffix = element.querySelector("small")?.outerHTML || "";
    if (reduceMotion) {
      element.innerHTML = `${target}${suffix}`;
      return;
    }

    const duration = 1400;
    const start = performance.now();

    function tick(now) {
      const progressValue = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progressValue, 3);
      const value = Math.round(target * eased);
      element.innerHTML = `${value}${suffix}`;
      if (progressValue < 1) window.requestAnimationFrame(tick);
    }

    window.requestAnimationFrame(tick);
  }

  const counters = $$("[data-count]");
  if (counters.length) {
    if (!("IntersectionObserver" in window)) {
      counters.forEach(animateCounter);
    } else {
      const counterObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              counterObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      counters.forEach((counter) => counterObserver.observe(counter));
    }
  }

  /* ---------- cursor glow ---------- */

  const glow = $("#cursor-glow");
  if (glow && finePointer && !reduceMotion) {
    document.body.classList.add("has-pointer");
    let glowX = window.innerWidth / 2;
    let glowY = window.innerHeight / 2;
    let glowTicking = false;

    window.addEventListener(
      "pointermove",
      (event) => {
        glowX = event.clientX;
        glowY = event.clientY;
        if (glowTicking) return;
        glowTicking = true;
        window.requestAnimationFrame(() => {
          glow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0)`;
          glowTicking = false;
        });
      },
      { passive: true }
    );
  }

  /* ---------- tilt ---------- */

  if (finePointer && !reduceMotion) {
    $$("[data-tilt]").forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        element.style.transform = `perspective(1100px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
      });

      element.addEventListener("pointerleave", () => {
        element.style.transform = "";
      });
    });
  }

  /* ---------- hero subject parallax ---------- */

  const landingHero = $(".landing-hero");
  const heroSubject = $(".hero-subject");

  if (landingHero && heroSubject && finePointer && !reduceMotion) {
    let subjectFrame = 0;

    landingHero.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType === "touch" || subjectFrame) return;
        subjectFrame = window.requestAnimationFrame(() => {
          const rect = landingHero.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          heroSubject.style.setProperty("--sx", `${(x * 14).toFixed(1)}px`);
          heroSubject.style.setProperty("--sy", `${(y * 10).toFixed(1)}px`);
          subjectFrame = 0;
        });
      },
      { passive: true }
    );

    landingHero.addEventListener("pointerleave", () => {
      heroSubject.style.setProperty("--sx", "0px");
      heroSubject.style.setProperty("--sy", "0px");
    });
  }

  /* ---------- spotlight cards ---------- */

  if (finePointer && !reduceMotion) {
    $$("[data-spotlight]").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        card.style.setProperty("--my", `${event.clientY - rect.top}px`);
      });
    });
  }

  /* ---------- magnetic buttons ---------- */

  if (finePointer && !reduceMotion) {
    $$("[data-magnetic]").forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        element.style.transform = `translate(${(x * 7).toFixed(2)}px, ${(y * 5).toFixed(2)}px)`;
      });

      element.addEventListener("pointerleave", () => {
        element.style.transform = "";
      });
    });
  }

  /* ---------- click sparks ---------- */

  if (!reduceMotion) {
    const sparkTargets = $$("[data-click-spark]");
    if (sparkTargets.length) {
      const sparkLayer = document.createElement("div");
      sparkLayer.className = "spark-layer";
      sparkLayer.setAttribute("aria-hidden", "true");
      document.body.appendChild(sparkLayer);

      sparkTargets.forEach((element) => {
        element.addEventListener("pointerdown", (event) => {
          for (let index = 0; index < 7; index += 1) {
            const angle = (Math.PI * 2 * index) / 7;
            const distance = 18 + Math.random() * 18;
            const spark = document.createElement("span");
            spark.className = "click-spark";
            spark.style.left = `${event.clientX}px`;
            spark.style.top = `${event.clientY}px`;
            spark.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
            spark.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
            sparkLayer.appendChild(spark);
            window.setTimeout(() => spark.remove(), 600);
          }
        });
      });
    }
  }

  /* ---------- hero particles ---------- */

  const canvas = $("#neon-canvas");

  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let particles = [];
    let animationFrame = 0;
    let running = true;
    const mouse = { x: null, y: null };

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(26, Math.min(84, Math.round((width * height) / 19000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        radius: 0.8 + Math.random() * 1.5,
        alpha: 0.18 + Math.random() * 0.5,
      }));
    }

    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -10) particle.x = width + 10;
        if (particle.x > width + 10) particle.x = -10;
        if (particle.y < -10) particle.y = height + 10;
        if (particle.y > height + 10) particle.y = -10;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 229, 255, ${particle.alpha})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j += 1) {
          const other = particles[j];
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 118) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(0, 229, 255, ${(1 - distance / 118) * 0.09})`;
            ctx.lineWidth = 0.65;
            ctx.stroke();
          }
        }

        if (mouse.x !== null) {
          const dx = mouse.x - particle.x;
          const dy = mouse.y - particle.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 170 && distance > 0.1) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(0, 229, 255, ${(1 - distance / 170) * 0.18})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
            particle.vx += (dx / distance) * 0.0015;
            particle.vy += (dy / distance) * 0.0015;
          }
        }

        particle.vx = Math.max(-0.55, Math.min(0.55, particle.vx * 0.999));
        particle.vy = Math.max(-0.55, Math.min(0.55, particle.vy * 0.999));
      }

      animationFrame = window.requestAnimationFrame(draw);
    }

    function start() {
      if (running) return;
      running = true;
      animationFrame = window.requestAnimationFrame(draw);
    }

    function stop() {
      running = false;
      window.cancelAnimationFrame(animationFrame);
    }

    resizeCanvas();
    animationFrame = window.requestAnimationFrame(draw);

    window.addEventListener("resize", resizeCanvas, { passive: true });

    canvas.addEventListener("pointermove", (event) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    });

    canvas.addEventListener("pointerleave", () => {
      mouse.x = null;
      mouse.y = null;
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });
  }

  /* ---------- styles lab ---------- */

  const styles = [
    {
      title: "Flequillo para adelante",
      desc: "Secalo con el flequillo cayendo hacia adelante y el aire desde arriba, así no se te levanta. Una arveja de cera en la punta de los dedos, solo para separar mechones. No lo aplastes.",
      products: ["Cera mate"],
      difficulty: "Fácil",
      time: "2 min",
      hair: "Liso / ondulado",
    },
    {
      title: "Flequillo para el costado",
      desc: "Primero secalo un ratito para el lado contrario: levantás la raíz y le das volumen. Después lo llevás al costado con los dedos o peine. Con la cera justa para que se mueva sin desarmarse.",
      products: ["Cera flex mate"],
      difficulty: "Fácil",
      time: "3 min",
      hair: "Liso / ondulado",
    },
    {
      title: "Todo para atrás",
      desc: "Peinalo hacia atrás mientras lo secás, con peine o con los dedos, para marcarle el camino. Con el pelo al 80%, ponete el producto: arrancá por atrás y terminá adelante, así no se te junta todo en el frente.",
      products: ["Cera fijación extrema"],
      difficulty: "Media",
      time: "3 min",
      hair: "Medio / largo",
    },
    {
      title: "Con texturizado",
      desc: "Con el pelo húmedo, un poco de salt spray a 20 cm y secalo moviéndolo con los dedos. Ya seco, polvo en la raíz y marcá con las manos. Si querés más control, un toque de cera mate arriba.",
      products: ["Salt spray", "Polvo texturizador", "Cera mate"],
      difficulty: "Media",
      time: "4 min",
      hair: "Ondulado / rulos",
    },
    {
      title: "Flequillo levantado",
      desc: "Secalo desde la raíz empujándolo hacia arriba con los dedos, con el aire desde abajo. Cerrá con aire frío para que quede. El polvo en la raíz hace que aguante todo el día.",
      products: ["Polvo texturizador", "Cera fijación extrema"],
      difficulty: "Media",
      time: "4 min",
      hair: "Corto / medio",
    },
    {
      title: "Librito",
      desc: "Pelo húmedo y peine fino. Marcá la raya siguiendo la que te dejó el barbero y secalo peinándolo con calor medio. Natural con flex mate; si tenés que aguantar todo el día, fijación extrema.",
      products: ["Cera flex mate", "Cera fijación extrema"],
      difficulty: "Media",
      time: "4 min",
      hair: "Liso / prolijo",
    },
    {
      title: "No me peino, lo uso despeinado",
      desc: "Despeinado no es dejarlo como te levantaste. Pelo húmedo, salt spray y secalo con las manos moviéndolo para todos lados. Listo, sin peine.",
      products: ["Salt spray"],
      difficulty: "Fácil",
      time: "2 min",
      hair: "Ondulado / rulos",
    },
  ];

  const styleList = $("#style-list");
  const styleStage = $("#style-stage");
  const stageIndex = $("#stage-index");
  const stageTitle = $("#stage-title");
  const stageDesc = $("#stage-desc");
  const stageTags = $("#stage-tags");
  const stageDifficulty = $("#stage-difficulty");
  const stageTime = $("#stage-time");
  const stageHair = $("#stage-hair");
  const copyRoutine = $("#copy-routine");
  let activeStyle = 0;
  let styleTimer = 0;

  function renderStyleTabs() {
    if (!styleList) return;
    styleList.innerHTML = "";
    styles.forEach((style, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "style-tab";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(index === 0));
      button.setAttribute("aria-controls", "style-stage");
      button.innerHTML = `
        <span class="style-idx">${pad(index + 1)}</span>
        <span class="style-name">${style.title}</span>
        <span class="style-arrow" aria-hidden="true"><svg><use href="#i-arrow"/></svg></span>
      `;
      button.addEventListener("click", () => selectStyle(index));
      styleList.appendChild(button);
    });
  }

  function applyStyle(style) {
    if (!style) return;
    if (stageIndex) stageIndex.textContent = pad(activeStyle + 1);
    if (stageTitle) stageTitle.textContent = style.title;
    if (stageDesc) stageDesc.textContent = style.desc;
    if (stageTags) {
      stageTags.innerHTML = style.products.map((product) => `<span class="tag">${product}</span>`).join("");
    }
    if (stageDifficulty) stageDifficulty.textContent = style.difficulty;
    if (stageTime) stageTime.textContent = style.time;
    if (stageHair) stageHair.textContent = style.hair;
    if (styleStage) styleStage.classList.remove("is-switching");
  }

  function selectStyle(index, immediate = false) {
    if (!styles[index] || index === activeStyle) {
      if (index === activeStyle) applyStyle(styles[index]);
      return;
    }
    activeStyle = index;
    $$(".style-tab", styleList).forEach((tab, tabIndex) => {
      const selected = tabIndex === index;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
    });

    if (immediate || reduceMotion) {
      applyStyle(styles[index]);
      return;
    }

    if (styleStage) styleStage.classList.add("is-switching");
    window.clearTimeout(styleTimer);
    styleTimer = window.setTimeout(() => applyStyle(styles[index]), 170);
  }

  if (styleList && styleStage) {
    renderStyleTabs();
    $$(".style-tab", styleList)[0]?.classList.add("active");
    applyStyle(styles[0]);

    if (copyRoutine) {
      copyRoutine.addEventListener("click", async () => {
        const style = styles[activeStyle];
        const text = [
          `${style.title} — Masivo Barber`,
          style.desc,
          `Productos: ${style.products.join(", ")}`,
          `Dificultad: ${style.difficulty} · Tiempo: ${style.time}`,
          "Más en masivobarber.vercel.app",
        ].join("\n");
        const copied = await copyText(text);
        showToast(copied ? "Rutina copiada. Pegala donde la necesites." : "No se pudo copiar. Probá de nuevo.");
      });
    }
  }

  /* ---------- checklist ---------- */

  const checklist = $("#checklist");
  const checklistProgress = $("#checklist-progress");
  const checklistKey = "masivo-checklist-v1";

  if (checklist) {
    const items = $$(".check-item", checklist);
    const saved = store.get(checklistKey, []);
    let completedAll = false;

    function updateChecklistProgress() {
      const done = items.filter((item) => item.classList.contains("done")).length;
      items.forEach((item) => item.setAttribute("aria-pressed", String(item.classList.contains("done"))));
      if (checklistProgress) checklistProgress.textContent = `${done} / ${items.length}`;
      if (done === items.length && !completedAll) {
        completedAll = true;
        showToast("Checklist completo. Salís impecable.");
      }
      if (done < items.length) completedAll = false;
      store.set(
        checklistKey,
        items.filter((item) => item.classList.contains("done")).map((item) => item.dataset.check)
      );
    }

    items.forEach((item) => {
      if (saved.includes(item.dataset.check)) item.classList.add("done");
      item.addEventListener("click", () => {
        item.classList.toggle("done");
        updateChecklistProgress();
      });
    });

    updateChecklistProgress();
  }

  /* ---------- interval / timing ---------- */

  const cuts = [
    { title: "Rapado, buzz o skin fade", min: 10, max: 15 },
    { title: "Fade o degradé con tope corto", min: 15, max: 20 },
    { title: "Medio largo con laterales cortos (pompadour, quiff, crop)", min: 20, max: 25 },
    { title: "Largo, medio largo o rulos", min: 25, max: 30 },
  ];

  const jobs = [
    {
      title: "Atención al público u oficina",
      min: 15,
      max: 20,
      text: "Te ven todo el día. Corto, cada 15 días, y no pases de 3 semanas.",
    },
    {
      title: "Uniforme o reglamento",
      min: 10,
      max: 15,
      text: "Si te piden prolijidad, cada 10 a 15 días.",
    },
    {
      title: "Obra, casco o gorra",
      min: 15,
      max: 20,
      text: "El casco te aplasta y te transpira el pelo. Corto y cada 15 a 20 días.",
    },
    {
      title: "Deporte o gimnasio",
      min: 10,
      max: 15,
      text: "Sudás, lavás más y el degradé se ensucia. Cada 10 a 15 días.",
    },
    {
      title: "Facultad o home office",
      min: 25,
      max: 30,
      text: "Podés estirar hasta los 30. Más no.",
    },
    {
      title: "Si salís en cámara",
      min: 10,
      max: 15,
      text: "Redes o streaming: cada 10 a 15 días.",
    },
  ];

  const intervalList = $("#interval-list");
  const modeCut = $("#mode-cut");
  const modeJob = $("#mode-job");
  const resultDays = $("#result-days");
  const resultDesc = $("#result-desc");
  const resultRing = $("#result-ring");
  const lastCutInput = $("#last-cut");
  const dateOut = $("#date-out");

  let intervalMode = "cut";
  let selectedInterval = 0;

  function activeIntervals() {
    return intervalMode === "cut" ? cuts : jobs;
  }

  function selectedIntervalData() {
    return activeIntervals()[selectedInterval] || activeIntervals()[0];
  }

  function updateRing(item) {
    if (!resultRing) return;
    const circumference = 2 * Math.PI * 80;
    const ratio = Math.min(item.max / 30, 1);
    resultRing.style.strokeDashoffset = String(circumference * (1 - ratio));
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" }).format(date);
  }

  function updateDateCalculation() {
    if (!dateOut) return;
    if (!lastCutInput || !lastCutInput.value) {
      dateOut.textContent = "Elegí una fecha y te calculo cuándo volver.";
      return;
    }

    const base = new Date(`${lastCutInput.value}T12:00:00`);
    if (Number.isNaN(base.getTime())) {
      dateOut.textContent = "Elegí una fecha válida.";
      return;
    }

    const item = selectedIntervalData();
    const minDate = new Date(base);
    const maxDate = new Date(base);
    minDate.setDate(base.getDate() + item.min);
    maxDate.setDate(base.getDate() + item.max);

    dateOut.textContent = `Volvé entre el ${formatDate(minDate)} y el ${formatDate(maxDate)}.`;
  }

  function updateResult() {
    const item = selectedIntervalData();
    const isJob = intervalMode === "job";

    if (resultDays) resultDays.textContent = `${item.min}–${item.max}`;
    if (resultDesc) {
      resultDesc.textContent = isJob ? `${item.title} — ${item.text}` : item.title;
    }
    updateRing(item);
    updateDateCalculation();
  }

  function renderIntervals() {
    if (!intervalList) return;
    const list = activeIntervals();
    intervalList.innerHTML = "";

    list.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "interval-row";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(index === selectedInterval));
      button.classList.toggle("selected", index === selectedInterval);
      const detail = intervalMode === "job" && index === selectedInterval ? `<small>${item.text}</small>` : "";
      button.innerHTML = `
        <span class="interval-info"><span>${item.title}</span>${detail}</span>
        <span class="interval-days">${item.min}–${item.max}</span>
        <span class="interval-arrow" aria-hidden="true"><svg><use href="#i-arrow"/></svg></span>
      `;
      button.addEventListener("click", () => {
        selectedInterval = index;
        renderIntervals();
        updateResult();
      });
      intervalList.appendChild(button);
    });

    updateResult();
  }

  function setIntervalMode(mode) {
    intervalMode = mode;
    selectedInterval = 0;
    const isCut = mode === "cut";
    modeCut?.classList.toggle("active", isCut);
    modeJob?.classList.toggle("active", !isCut);
    modeCut?.setAttribute("aria-selected", String(isCut));
    modeJob?.setAttribute("aria-selected", String(!isCut));
    renderIntervals();
  }

  if (intervalList) {
    renderIntervals();
    modeCut?.addEventListener("click", () => setIntervalMode("cut"));
    modeJob?.addEventListener("click", () => setIntervalMode("job"));

    if (lastCutInput) {
      const today = new Date();
      lastCutInput.max = today.toISOString().slice(0, 10);
      lastCutInput.addEventListener("change", updateDateCalculation);
    }
  }

  /* ---------- late accordion ---------- */

  const lateAccordion = $(".late-accordion");
  if (lateAccordion) {
    const trigger = $(".late-trigger", lateAccordion);
    trigger?.addEventListener("click", () => {
      const open = lateAccordion.classList.toggle("open");
      trigger.setAttribute("aria-expanded", String(open));
    });
  }

  /* ---------- academy tabs ---------- */

  const academyTabs = $$(".academy-tab");
  const academyPanels = $$(".academy-panel");
  const academyTabLinks = $$("[data-academy-tab]");

  function activateAcademyTab(target) {
    const tab = academyTabs.find((item) => item.dataset.tab === target);
    if (!tab) return;

    academyTabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });

    academyPanels.forEach((panel) => {
      const active = panel.id === `panel-${target}`;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });

    academyTabLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.academyTab === target);
    });
  }

  if (academyTabs.length) {
    academyTabs.forEach((tab) => {
      tab.addEventListener("click", () => activateAcademyTab(tab.dataset.tab));
    });

    academyTabLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const target = link.dataset.academyTab;
        activateAcademyTab(target);
        const tabs = $(".academy-tabs");
        if (tabs) {
          const top = tabs.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
        }
        if (history.replaceState) history.replaceState(null, "", `#${target}`);
      });
    });

    const initialTab = window.location.hash.replace("#", "");
    if (["programa", "horarios", "inversion"].includes(initialTab)) {
      activateAcademyTab(initialTab);
    }
  }

  /* ---------- enrollment form ---------- */

  const enrollForm = $("#enroll-form");
  if (enrollForm) {
    enrollForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const nameInput = $("#enroll-name");
      const shiftInput = $("#enroll-shift");
      const name = nameInput?.value.trim() || "";

      if (name.length < 2) {
        nameInput?.focus();
        showToast("Escribí tu nombre para reservar el lugar.");
        return;
      }

      const shift = shiftInput?.value || "Turno a confirmar";
      const message = `Hola! Soy ${name}. Quiero inscribirme al Curso Inicial de Barbería Nivel 1 de Masivo Academy (${shift}). ¿Me pasás disponibilidad, fecha de inicio y formas de pago?`;
      const url = `https://wa.me/541162963590?text=${encodeURIComponent(message)}`;
      showToast("Abriendo WhatsApp para enviar tu consulta.");
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  /* ---------- coupon ---------- */

  const couponKey = "masivo-coupon-v1";
  const claimButton = $("#claim-coupon");
  const couponIdle = $("#coupon-idle");
  const couponClaimed = $("#coupon-claimed");
  const copyCoupon = $("#copy-coupon");
  const confettiRoot = $("#confetti");

  function renderCoupon(claimed) {
    if (couponIdle) couponIdle.hidden = claimed;
    if (couponClaimed) couponClaimed.hidden = !claimed;
  }

  function burstConfetti() {
    if (!confettiRoot || reduceMotion) return;
    const colors = ["#00e5ff", "#f4f9fb", "#8b6cff", "#7ef6ff"];
    for (let index = 0; index < 44; index += 1) {
      const piece = document.createElement("i");
      piece.className = "confetti-piece";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[index % colors.length];
      piece.style.setProperty("--fall-duration", `${1.8 + Math.random() * 1.7}s`);
      piece.style.setProperty("--fall-delay", `${Math.random() * 0.45}s`);
      piece.style.setProperty("--fall-x", `${Math.random() * 240 - 120}px`);
      piece.style.setProperty("--fall-rotate", `${Math.random() * 900 - 450}deg`);
      confettiRoot.appendChild(piece);
      window.setTimeout(() => piece.remove(), 4300);
    }
  }

  if (claimButton && couponIdle && couponClaimed) {
    renderCoupon(store.get(couponKey, false) === true);

    claimButton.addEventListener("click", () => {
      store.set(couponKey, true);
      renderCoupon(true);
      burstConfetti();
      showToast("Cupón activado. Código: MASIVO15.");
    });

    copyCoupon?.addEventListener("click", async () => {
      const copied = await copyText("MASIVO15");
      showToast(copied ? "Código copiado. Mostralo en tu próxima visita." : "No se pudo copiar. El código es MASIVO15.");
    });
  }
})();
