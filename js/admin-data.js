/* ============================================================
   MASIVO CONTROL — Datos semilla y utilidades
   Panel interno. Sin dependencias.
   ============================================================ */

(() => {
  "use strict";

  const DAY = 86400000;
  const pad = (value) => String(value).padStart(2, "0");
  const atNoon = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const newDate = () => atNoon(new Date());

  function addDays(base, amount) {
    const date = new Date(base);
    date.setDate(date.getDate() + amount);
    return atNoon(date);
  }

  function iso(date) {
    const value = date instanceof Date ? date : new Date(date);
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }

  function parseISO(value) {
    if (!value) return null;
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function daysAgo(amount) {
    return iso(addDays(newDate(), -amount));
  }

  function daysAhead(amount) {
    return iso(addDays(newDate(), amount));
  }

  function dateInMonth(offset, day = 3) {
    const now = newDate();
    return iso(new Date(now.getFullYear(), now.getMonth() + offset, Math.min(day, 28), 12));
  }

  function monthKey(offset = 0) {
    const now = newDate();
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1, 12);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  }

  function monthLabel(key) {
    const [year, month] = String(key).split("-").map(Number);
    return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1, 12));
  }

  function monthShort(key) {
    const [year, month] = String(key).split("-").map(Number);
    return new Intl.DateTimeFormat("es-AR", { month: "short" }).format(new Date(year, month - 1, 1, 12)).replace(".", "");
  }

  function startOfWeek(base = newDate()) {
    const date = atNoon(base);
    const offset = (date.getDay() + 6) % 7;
    return addDays(date, -offset);
  }

  function weekStart(offset = 0) {
    return iso(addDays(startOfWeek(newDate()), offset * 7));
  }

  function weekLabel(value) {
    const date = parseISO(value) || newDate();
    const end = addDays(date, 6);
    const format = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });
    return `${format.format(date).replace(".", "")} — ${format.format(end).replace(".", "")}`;
  }

  function isoWeek(value) {
    const date = parseISO(value) || newDate();
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - day + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const firstDay = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
    return 1 + Math.round((target - firstThursday) / (7 * DAY));
  }

  function hoursAgo(amount) {
    return new Date(Date.now() - amount * 3600000).toISOString();
  }

  function newId(prefix) {
    return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }

  /* ---------------- mapa de responsabilidades ---------------- */

  const TEAM_MAP_PRESETS = [
    { key: "contenido", label: "Contenido", icon: "image", metric: "contenido", x: 13, y: 18, note: "Calendario, piezas y publicaciones de la semana." },
    { key: "meetbarber", label: "MeetBarber", icon: "message", metric: "meetbarber", x: 38, y: 8, note: "Reunión semanal, decisiones y acciones abiertas." },
    { key: "checklist", label: "Checklist", icon: "check-square", metric: "checklist", x: 62, y: 17, note: "Apertura, cierre y controles del día." },
    { key: "stock", label: "Stock", icon: "package", metric: "stock", x: 63, y: 45, note: "Productos bajo mínimo y reposición." },
    { key: "capacitaciones", label: "Capacitaciones", icon: "graduation", metric: "capacitaciones", x: 56, y: 78, note: "Cursos pendientes y aprobaciones del equipo." },
    { key: "reporte", label: "Reporte de turno", icon: "file", metric: "reporte", x: 35, y: 91, note: "Cierre de turno y reportes del equipo." },
    { key: "puntos", label: "Puntos / Strikes", icon: "zap", metric: "puntos", x: 9, y: 66, note: "Reconocimientos, sanciones y seguimiento." }
  ];

  function createTeamMap(user) {
    return {
      userId: user?.id || "",
      daily: { x: 87, y: 50 },
      nodes: TEAM_MAP_PRESETS.map((preset) => ({
        id: `tm-${user?.id || "base"}-${preset.key}`,
        key: preset.key,
        label: preset.label,
        icon: preset.icon,
        metric: preset.metric,
        note: preset.note,
        x: preset.x,
        y: preset.y,
        percent: preset.metric === "custom" ? 100 : 0,
        pending: preset.metric === "custom" ? 0 : 0
      }))
    };
  }

  function createSeed() {
    const today = newDate();
    const currentWeek = weekStart(0);
    const previousWeek = weekStart(-1);
    const twoWeeksAgo = weekStart(-2);

    /* ---------------- equipo ---------------- */

    const users = [
      {
        id: "u-nico",
        name: "Nico Ferreyra",
        username: "nico",
        password: "masivo",
        role: "owner",
        email: "nico@masivobarber.com",
        phone: "+54 11 6296-3590",
        active: true,
        startedAt: "2021-03-01",
        commission: 0,
        initials: "NF",
        tone: "cyan"
      },
      {
        id: "u-sofi",
        name: "Sofi Ríos",
        username: "sofi",
        password: "masivo",
        role: "manager",
        email: "sofi@masivobarber.com",
        phone: "+54 11 5555-2010",
        active: true,
        startedAt: "2022-08-15",
        commission: 0,
        initials: "SR",
        tone: "violet"
      },
      {
        id: "u-diego",
        name: "Diego Aquino",
        username: "diego",
        password: "masivo",
        role: "manager",
        email: "diego@masivobarber.com",
        phone: "+54 11 5555-3300",
        active: true,
        startedAt: "2024-06-10",
        commission: 0,
        initials: "DA",
        tone: "violet",
        photo: "/img/team/diego-aquino.png"
      },
      {
        id: "u-caro",
        name: "Caro Méndez",
        username: "caro",
        password: "masivo",
        role: "academy",
        email: "caro@masivobarber.com",
        phone: "+54 11 5555-8821",
        active: true,
        startedAt: "2023-02-06",
        commission: 0,
        initials: "CM",
        tone: "amber"
      },
      {
        id: "u-tomi",
        name: "Tomi Aguirre",
        username: "tomi",
        password: "masivo",
        role: "barber",
        email: "tomi@masivobarber.com",
        phone: "+54 11 5555-4412",
        active: true,
        startedAt: "2023-05-10",
        commission: 45,
        initials: "TA",
        tone: "cyan"
      },
      {
        id: "u-lauta",
        name: "Lautaro Benítez",
        username: "lauta",
        password: "masivo",
        role: "barber",
        email: "lauta@masivobarber.com",
        phone: "+54 11 5555-7730",
        active: true,
        startedAt: "2023-09-18",
        commission: 40,
        initials: "LB",
        tone: "red"
      },
      {
        id: "u-mica",
        name: "Mica Duarte",
        username: "mica",
        password: "masivo",
        role: "barber",
        email: "mica@masivobarber.com",
        phone: "+54 11 5555-1198",
        active: true,
        startedAt: "2024-01-22",
        commission: 45,
        initials: "MD",
        tone: "violet"
      },
      {
        id: "u-fede",
        name: "Fede Salas",
        username: "fede",
        password: "masivo",
        role: "barber",
        email: "fede@masivobarber.com",
        phone: "+54 11 5555-6604",
        active: true,
        startedAt: "2025-11-03",
        commission: 40,
        initials: "FS",
        tone: "green"
      }
    ];

    const roles = {
      owner: { label: "Dueño", description: "Ve todo. Finanzas, equipo, academia y auditoría." },
      manager: { label: "Encargado", description: "Maneja la operación diaria y el equipo. Sin finanzas." },
      academy: { label: "Encargado academia", description: "Maneja toda la academia, cobranzas y métricas. Sin caja del salón." },
      barber: { label: "Barbero", description: "Ve solo su ficha, tareas, contenido, puntos y strikes." }
    };

    const settings = {
      businessName: "Masivo Barber",
      currency: "ARS",
      contentGoal: 3,
      pointsContent: 10,
      pointsTraining: 20,
      pointsSale: 15,
      strikeLimit: 3,
      strikeExpiryDays: 90,
      weekStart: "monday",
      monthlyGoal: 22000000
    };

    /* ---------------- unidades ---------------- */

    const units = [
      {
        id: "barberia",
        name: "Barbería",
        kind: "barberia",
        description: "Cortes, barba, color y servicios en el local.",
        color: "#a78bfa",
        icon: "scissors",
        goal: 17000000,
        active: true
      },
      {
        id: "academia",
        name: "Academia",
        kind: "academia",
        description: "Cursos, cohortes y formación de barberos.",
        color: "#e879f9",
        icon: "graduation",
        goal: 2500000,
        active: true
      },
      {
        id: "productos",
        name: "Productos",
        kind: "productos",
        description: "Venta de herramientas e insumos en el local.",
        color: "#34d399",
        icon: "package",
        goal: 1200000,
        active: true
      },
      {
        id: "ecommerce",
        name: "Ecommerce",
        kind: "ecommerce",
        description: "Tienda online, envíos y venta digital.",
        color: "#fbbf24",
        icon: "globe",
        goal: 2000000,
        active: true
      }
    ];

    /* ---------------- transacciones ---------------- */

    const transactions = [];
    const revenueSeries = [12400000, 12950000, 13500000, 14150000, 14850000, 15600000];

    function addTx({ date, unitId, type, amount, category, description, source = "manual", createdBy = "u-nico", linkedType = null, linkedId = null }) {
      const tx = {
        id: newId("tx"),
        date,
        unitId,
        type,
        amount: Math.round(amount),
        category,
        description,
        source,
        createdBy,
        linkedType,
        linkedId
      };
      transactions.push(tx);
      return tx;
    }

    for (let offset = -5; offset <= 0; offset += 1) {
      const index = offset + 5;
      const revenue = revenueSeries[index];
      addTx({
        date: dateInMonth(offset, 3),
        unitId: "barberia",
        type: "income",
        amount: revenue,
        category: "Facturación mensual",
        description: `Facturación mensual barbería · ${monthLabel(monthKey(offset))}`,
        source: "manual"
      });
      addTx({
        date: dateInMonth(offset, 5),
        unitId: "barberia",
        type: "cost",
        amount: revenue * 0.45,
        category: "Comisiones",
        description: "Comisiones del equipo"
      });
      addTx({
        date: dateInMonth(offset, 2),
        unitId: "barberia",
        type: "cost",
        amount: 900000 + index * 22000,
        category: "Alquiler",
        description: "Alquiler del local"
      });
      addTx({
        date: dateInMonth(offset, 8),
        unitId: "barberia",
        type: "cost",
        amount: 310000 + index * 18000,
        category: "Insumos",
        description: "Reposición de insumos de trabajo"
      });
      addTx({
        date: dateInMonth(offset, 10),
        unitId: "barberia",
        type: "cost",
        amount: 165000,
        category: "Servicios",
        description: "Luz, agua e internet"
      });

      if (offset < -2) {
        addTx({
          date: dateInMonth(offset, 12),
          unitId: "academia",
          type: "income",
          amount: 1850000 + index * 70000,
          category: "Cierre de cuotas",
          description: `Cierre de cobranzas academia · ${monthLabel(monthKey(offset))}`,
          source: "cierre"
        });
      }

      addTx({
        date: dateInMonth(offset, 6),
        unitId: "academia",
        type: "cost",
        amount: 620000 + index * 15000,
        category: "Docentes",
        description: "Honorarios docentes"
      });
      addTx({
        date: dateInMonth(offset, 7),
        unitId: "academia",
        type: "cost",
        amount: offset === 0 ? 380000 : 260000,
        category: "Marketing",
        description: "Campañas de captación"
      });
      addTx({
        date: dateInMonth(offset, 9),
        unitId: "academia",
        type: "cost",
        amount: 240000,
        category: "Aula",
        description: "Alquiler de aula y mantenimiento"
      });

      addTx({
        date: dateInMonth(offset, 14),
        unitId: "productos",
        type: "income",
        amount: 760000 + index * 42000,
        category: "Ventas mostrador",
        description: "Ventas de productos en el local"
      });
      addTx({
        date: dateInMonth(offset, 11),
        unitId: "productos",
        type: "cost",
        amount: 480000 + index * 22000,
        category: "Reposición",
        description: "Compra de stock"
      });

      addTx({
        date: dateInMonth(offset, 16),
        unitId: "ecommerce",
        type: "income",
        amount: 1680000 + index * 95000,
        category: "Ventas online",
        description: "Ventas de la tienda online"
      });
      addTx({
        date: dateInMonth(offset, 18),
        unitId: "ecommerce",
        type: "cost",
        amount: 320000,
        category: "Publicidad",
        description: "Meta Ads y Google"
      });
      addTx({
        date: dateInMonth(offset, 20),
        unitId: "ecommerce",
        type: "cost",
        amount: 98000 + index * 4500,
        category: "Envíos",
        description: "Logística y envíos"
      });
      addTx({
        date: dateInMonth(offset, 21),
        unitId: "ecommerce",
        type: "cost",
        amount: 62000,
        category: "Packaging",
        description: "Packaging y etiquetas"
      });
    }

    /* ---------------- checklists ---------------- */

    const checklists = [
      {
        id: "cl-apertura",
        title: "Apertura del local",
        area: "Apertura",
        frequency: "diaria",
        time: "09:30",
        items: [
          { id: "a1", label: "Abrir persianas y encender luces" },
          { id: "a2", label: "Encender aire y música" },
          { id: "a3", label: "Revisar limpieza de estaciones" },
          { id: "a4", label: "Cargar máquinas y verificar baterías" },
          { id: "a5", label: "Revisar caja chica y turnos del día" }
        ]
      },
      {
        id: "cl-cierre",
        title: "Cierre de caja",
        area: "Cierre",
        frequency: "diaria",
        time: "20:30",
        items: [
          { id: "c1", label: "Cerrar caja y contar efectivo" },
          { id: "c2", label: "Registrar ventas de productos" },
          { id: "c3", label: "Limpiar y guardar herramientas" },
          { id: "c4", label: "Revisar turnos del día siguiente" },
          { id: "c5", label: "Apagar equipos y luces" }
        ]
      },
      {
        id: "cl-limpieza",
        title: "Limpieza profunda",
        area: "Limpieza",
        frequency: "semanal",
        time: "Lunes",
        items: [
          { id: "l1", label: "Desinfectar máquinas y peines" },
          { id: "l2", label: "Lavar toallas y capas" },
          { id: "l3", label: "Limpiar espejos y vitrinas" },
          { id: "l4", label: "Barrer y trapear todo el salón" },
          { id: "l5", label: "Reponer productos de exhibición" }
        ]
      },
      {
        id: "cl-reunion",
        title: "Prep de MeetBarber",
        area: "Reunión",
        frequency: "semanal",
        time: "Domingo",
        items: [
          { id: "r1", label: "Actualizar números de la semana" },
          { id: "r2", label: "Revisar puntos y strikes" },
          { id: "r3", label: "Preparar reconocimientos" },
          { id: "r4", label: "Armar agenda de la reunión" }
        ]
      }
    ];

    const checklistRuns = [
      {
        id: "cr-hoy-apertura",
        checklistId: "cl-apertura",
        date: daysAgo(0),
        userId: "u-sofi",
        completed: ["a1", "a2", "a3", "a4"],
        completedAt: new Date().toISOString()
      },
      {
        id: "cr-ayer-cierre",
        checklistId: "cl-cierre",
        date: daysAgo(1),
        userId: "u-caro",
        completed: ["c1", "c2", "c3", "c4", "c5"],
        completedAt: new Date(Date.now() - DAY).toISOString()
      },
      {
        id: "cr-limpieza",
        checklistId: "cl-limpieza",
        date: daysAgo(2),
        userId: "u-sofi",
        completed: ["l1", "l2", "l3", "l4"],
        completedAt: new Date(Date.now() - 2 * DAY).toISOString()
      }
    ];

    /* ---------------- tareas ---------------- */

    const tasks = [
      {
        id: "t-1",
        title: "Publicar reel de transformación de Mica",
        assigneeId: "u-mica",
        due: daysAhead(1),
        status: "en-curso",
        priority: "alta",
        unitId: "barberia",
        notes: "Usar el audio que pasó Sofi. Etiquetar a la marca de pomada.",
        createdBy: "u-sofi",
        createdAt: daysAgo(2)
      },
      {
        id: "t-2",
        title: "Confirmar modelos para práctica de academia",
        assigneeId: "u-caro",
        due: daysAhead(2),
        status: "pendiente",
        priority: "alta",
        unitId: "academia",
        notes: "Faltan 3 modelos para el sábado.",
        createdBy: "u-sofi",
        createdAt: daysAgo(1)
      },
      {
        id: "t-3",
        title: "Reponer pomada mate en vitrina",
        assigneeId: "u-fede",
        due: daysAgo(1),
        status: "pendiente",
        priority: "media",
        unitId: "productos",
        notes: "",
        createdBy: "u-caro",
        createdAt: daysAgo(4)
      },
      {
        id: "t-4",
        title: "Cargar facturación de barbería de octubre",
        assigneeId: "u-nico",
        due: daysAhead(3),
        status: "pendiente",
        priority: "alta",
        unitId: "barberia",
        notes: "Traer el número de la plataforma de agenda.",
        createdBy: "u-nico",
        createdAt: daysAgo(1)
      },
      {
        id: "t-5",
        title: "Revisar stock de navajas",
        assigneeId: "u-sofi",
        due: daysAhead(5),
        status: "en-curso",
        priority: "media",
        unitId: "productos",
        notes: "",
        createdBy: "u-nico",
        createdAt: daysAgo(3)
      },
      {
        id: "t-6",
        title: "Enviar cuotas vencidas por WhatsApp",
        assigneeId: "u-caro",
        due: daysAgo(2),
        status: "pendiente",
        priority: "alta",
        unitId: "academia",
        notes: "2 alumnas de la cohorte de septiembre.",
        createdBy: "u-sofi",
        createdAt: daysAgo(5)
      },
      {
        id: "t-7",
        title: "Grabar video de cuidado de barba",
        assigneeId: "u-tomi",
        due: daysAhead(4),
        status: "en-curso",
        priority: "media",
        unitId: "barberia",
        notes: "Formato vertical, 30 segundos.",
        createdBy: "u-sofi",
        createdAt: daysAgo(2)
      },
      {
        id: "t-8",
        title: "Actualizar precios en la web",
        assigneeId: "u-nico",
        due: daysAhead(7),
        status: "pendiente",
        priority: "baja",
        unitId: "ecommerce",
        notes: "",
        createdBy: "u-nico",
        createdAt: daysAgo(6)
      },
      {
        id: "t-9",
        title: "Limpiar vidriera y cambiar afiche",
        assigneeId: "u-fede",
        due: daysAhead(0),
        status: "hecha",
        priority: "baja",
        unitId: "barberia",
        notes: "",
        createdBy: "u-sofi",
        createdAt: daysAgo(3)
      },
      {
        id: "t-10",
        title: "Cerrar planilla de asistencia de octubre",
        assigneeId: "u-sofi",
        due: daysAhead(6),
        status: "pendiente",
        priority: "media",
        unitId: "academia",
        notes: "",
        createdBy: "u-caro",
        createdAt: daysAgo(2)
      },
      {
        id: "t-11",
        title: "Revisar apertura y asignar estaciones",
        assigneeId: "u-diego",
        due: daysAhead(0),
        status: "en-curso",
        priority: "alta",
        unitId: "barberia",
        notes: "Confirmar que las máquinas estén cargadas antes del primer turno.",
        createdBy: "u-nico",
        createdAt: daysAgo(1)
      },
      {
        id: "t-12",
        title: "Aprobar calendario de contenido semanal",
        assigneeId: "u-diego",
        due: daysAhead(0),
        status: "pendiente",
        priority: "alta",
        unitId: "barberia",
        notes: "Faltan dos piezas del equipo. Cerrar antes del MeetBarber.",
        createdBy: "u-sofi",
        createdAt: daysAgo(1)
      },
      {
        id: "t-13",
        title: "Confirmar stock de pomadas y navajas",
        assigneeId: "u-diego",
        due: daysAhead(1),
        status: "pendiente",
        priority: "media",
        unitId: "productos",
        notes: "",
        createdBy: "u-diego",
        createdAt: daysAgo(2)
      },
      {
        id: "t-14",
        title: "Cerrar reporte de turno del equipo",
        assigneeId: "u-diego",
        due: daysAhead(0),
        status: "pendiente",
        priority: "media",
        unitId: "barberia",
        notes: "Pedir el cierre a los que todavía no lo cargaron.",
        createdBy: "u-nico",
        createdAt: daysAgo(1)
      }
    ];

    /* ---------------- reuniones ---------------- */

    const meetings = [
      {
        id: "m-1",
        title: "MeetBarber · Semana 43",
        date: daysAgo(3),
        attendees: ["u-nico", "u-sofi", "u-caro", "u-tomi", "u-lauta", "u-mica", "u-fede"],
        notes: "Semana fuerte en barbería. La academia cerró 4 inscriptos nuevos. Repasamos el sistema de puntos y el caso de Lautaro.",
        decisions: [
          "Subir la meta de contenido a 3 piezas semanales por barbero.",
          "Lautaro queda en plan de acompañamiento por 30 días.",
          "Mica arranca a capacitar al equipo nuevo en fade."
        ],
        actions: [
          { text: "Compartir calendario de contenido", ownerId: "u-sofi", due: daysAhead(2), status: "pendiente" },
          { text: "Preparar material de capacitación de fade", ownerId: "u-mica", due: daysAhead(6), status: "en-curso" }
        ]
      },
      {
        id: "m-2",
        title: "MeetBarber · Semana 42",
        date: daysAgo(10),
        attendees: ["u-nico", "u-sofi", "u-caro", "u-tomi", "u-lauta", "u-mica", "u-fede"],
        notes: "Revisión de números de septiembre y lanzamiento de la cohorte de noviembre. Foco en retención de alumnos.",
        decisions: [
          "Abrir cohorte avanzada para noviembre.",
          "Sumar recordatorio de cuotas 48 horas antes del vencimiento."
        ],
        actions: [
          { text: "Armar campaña de inscripción", ownerId: "u-caro", due: daysAgo(4), status: "hecha" }
        ]
      }
    ];

    /* ---------------- meetbarber: sesiones uno a uno ---------------- */

    const meetSessions = [
      {
        id: "mb-1",
        userId: "u-tomi",
        weekStart: weekStart(-1),
        date: daysAgo(2),
        good: "Facturación arriba de la meta y ninguna queja de clientes en la semana.",
        adjust: "Venta de productos en 0%. No ofrece nada al cerrar el corte.",
        focus: "Ofrecer una tasa de 10% de productos a cada cliente que se haga la barba.",
        prevFocus: "Mostrar el antes y después en redes al menos una vez por día.",
        result: "cumplido",
        reason: "Subió 5 publicaciones y creció el alcance.",
        support: [],
        supportWhat: "",
        createdBy: "u-diego",
        createdAt: daysAgo(2)
      },
      {
        id: "mb-2",
        userId: "u-lauta",
        weekStart: weekStart(-1),
        date: daysAgo(3),
        good: "Bajó el tiempo de corte promedio y mejoró la prolijidad en los degradados.",
        adjust: "Llega justo a los turnos de la mañana y arranca tarde la primera cita.",
        focus: "Estar 10 minutos antes de su primer turno todos los días.",
        prevFocus: "Ordenar la estación al terminar cada cliente.",
        result: "parcial",
        reason: "Ordenó la estación, pero solo 3 de 5 días.",
        support: ["aitor"],
        supportWhat: "Revisar el horario de entrada y el viaje con Diego.",
        createdBy: "u-diego",
        createdAt: daysAgo(3)
      },
      {
        id: "mb-3",
        userId: "u-mica",
        weekStart: weekStart(-2),
        date: daysAgo(9),
        good: "Muy buena facturación y clientes fieles que vuelven por ella.",
        adjust: "Cierra pocos servicios extra y no registra los productos que usa.",
        focus: "Ofrecer un tratamiento de hidratación a cada cliente nuevo.",
        prevFocus: "Cargar el cierre de turno antes de irse.",
        result: "no-cumplido",
        reason: "Se le pasó el cierre tres veces y no lo justificó.",
        support: ["ivan"],
        supportWhat: "Simplificar el formulario de cierre y avisarle 15 minutos antes.",
        createdBy: "u-diego",
        createdAt: daysAgo(9)
      },
      {
        id: "mb-4",
        userId: "u-fede",
        weekStart: weekStart(-2),
        date: daysAgo(10),
        good: "Mejoró el trato con el cliente y las reseñas de la semana fueron positivas.",
        adjust: "Vende muy poco producto y no propone upgrades.",
        focus: "Vender una tasa de 10% de productos por día.",
        prevFocus: "Saludar a cada cliente por su nombre.",
        result: "cumplido",
        reason: "Se acordó de todos los nombres y lo destacaron en una reseña.",
        support: [],
        supportWhat: "",
        createdBy: "u-diego",
        createdAt: daysAgo(10)
      }
    ];

    /* ---------------- capacitaciones ---------------- */

    const trainings = [
      {
        id: "tr-fade",
        title: "Fade desde cero",
        description: "Degradé bajo, medio y alto. Líneas limpias, transiciones y uso correcto de la máquina.",
        level: "inicial",
        minutes: 45,
        passScore: 70,
        questions: [
          { q: "¿Con qué número conviene arrancar un fade bajo?", options: ["0.5 o 0", "3", "6"], answer: 0 },
          { q: "¿Para qué sirve la línea guía?", options: ["Para marcar el largo inicial", "Para limpiar la máquina", "Para peinar"], answer: 0 },
          { q: "¿Cuándo se usa la navaja en un fade?", options: ["Antes de la máquina", "Al final, para perfilar", "Solo en el pelo largo"], answer: 1 },
          { q: "¿Qué evita el sobrecalentamiento de la máquina?", options: ["Usarla sin peine", "Limpiar y lubricar seguido", "Mojar el pelo"], answer: 1 }
        ]
      },
      {
        id: "tr-bio",
        title: "Bioseguridad e higiene",
        description: "Protocolo de limpieza de herramientas, manejo de residuos y cuidado personal en el salón.",
        level: "inicial",
        minutes: 20,
        passScore: 70,
        questions: [
          { q: "¿Cada cuánto se desinfectan las máquinas?", options: ["Una vez por semana", "Entre clientes", "Una vez por mes"], answer: 1 },
          { q: "¿Qué se usa para desinfectar peines?", options: ["Agua", "Alcohol al 70%", "Shampoo"], answer: 1 },
          { q: "¿Dónde se descartan las hojas usadas?", options: ["En un recipiente rígido", "En el cesto común", "En el lavabo"], answer: 0 }
        ]
      },
      {
        id: "tr-ventas",
        title: "Venta de productos sin vender humo",
        description: "Cómo recomendar el producto correcto según el tipo de pelo y cerrar la venta en el sillón.",
        level: "intermedio",
        minutes: 30,
        passScore: 70,
        questions: [
          { q: "¿Cuál es el primer paso para recomendar un producto?", options: ["Mostrar el más caro", "Entender el tipo de pelo y rutina", "Ofrecer el combo"], answer: 1 },
          { q: "¿Qué genera más confianza?", options: ["Explicar el beneficio concreto", "Hablar rápido", "Dar descuentos"], answer: 0 },
          { q: "¿Cuándo conviene ofrecer el producto?", options: ["Antes del corte", "Mientras termina el styling", "Cuando se va"], answer: 1 }
        ]
      },
      {
        id: "tr-contenido",
        title: "Contenido que llena la agenda",
        description: "Grabar, editar y publicar contenido simple para atraer clientes nuevos todas las semanas.",
        level: "intermedio",
        minutes: 35,
        passScore: 70,
        questions: [
          { q: "¿Qué se graba primero?", options: ["El resultado final", "El proceso desde el inicio", "Solo el antes"], answer: 1 },
          { q: "¿Cuál es una buena duración para un reel?", options: ["15 a 30 segundos", "3 minutos", "10 minutos"], answer: 0 },
          { q: "¿Qué mejora el alcance?", options: ["Publicar sin texto", "Un hook claro en los primeros segundos", "Borrar los comentarios"], answer: 1 }
        ]
      },
      {
        id: "tr-atencion",
        title: "Atención y experiencia Masivo",
        description: "Recepción, consulta previa, despedida y los detalles que hacen que el cliente vuelva.",
        level: "inicial",
        minutes: 25,
        passScore: 70,
        questions: [
          { q: "¿Qué se hace al recibir al cliente?", options: ["Pedirle que espere", "Saludar, ofrecer agua y confirmar el servicio", "Cobrar primero"], answer: 1 },
          { q: "¿Qué pregunta abre mejor la consulta?", options: ["¿Qué te hago?", "¿Cómo lo usás normalmente y qué te gustaría cambiar?", "¿Tenés turno?"], answer: 1 },
          { q: "¿Qué cierra bien la experiencia?", options: ["Despedirse sin mirar", "Explicar el cuidado en casa y ofrecer el próximo turno", "Dar un descuento"], answer: 1 }
        ]
      }
    ];

    const trainingRecords = [];
    const barberIds = ["u-tomi", "u-lauta", "u-mica", "u-fede"];
    const trainingSeeds = [
      { userId: "u-tomi", trainingId: "tr-fade", score: 100, days: 20 },
      { userId: "u-tomi", trainingId: "tr-bio", score: 100, days: 18 },
      { userId: "u-tomi", trainingId: "tr-atencion", score: 67, days: 11 },
      { userId: "u-lauta", trainingId: "tr-fade", score: 100, days: 22 },
      { userId: "u-lauta", trainingId: "tr-bio", score: 100, days: 19 },
      { userId: "u-lauta", trainingId: "tr-contenido", score: 67, days: 8 },
      { userId: "u-mica", trainingId: "tr-fade", score: 100, days: 25 },
      { userId: "u-mica", trainingId: "tr-bio", score: 100, days: 24 },
      { userId: "u-mica", trainingId: "tr-ventas", score: 100, days: 14 },
      { userId: "u-mica", trainingId: "tr-contenido", score: 100, days: 9 },
      { userId: "u-fede", trainingId: "tr-bio", score: 100, days: 6 },
      { userId: "u-fede", trainingId: "tr-fade", score: 67, days: 4 }
    ];

    trainingSeeds.forEach((item, index) => {
      trainingRecords.push({
        id: `trr-${index + 1}`,
        trainingId: item.trainingId,
        userId: item.userId,
        status: item.score >= 70 ? "aprobado" : "desaprobado",
        score: item.score,
        date: daysAgo(item.days),
        createdBy: item.userId
      });
    });

    /* ---------------- contenido ---------------- */

    const contentPieces = [];
    const contentTypes = ["Reel", "Foto", "Video", "Story"];

    function addPiece(barberId, week, index, type, stage, title, publishOffset = 0) {
      const created = daysAgo(week === 0 ? 1 + index : 8 + index);
      contentPieces.push({
        id: `cp-${barberId}-${week}-${index}`,
        userId: barberId,
        weekStart: week === 0 ? currentWeek : week === -1 ? previousWeek : twoWeeksAgo,
        title,
        type: contentTypes[index % contentTypes.length],
        stage,
        link: stage === "publicado" ? "https://www.instagram.com/masivobarber" : "",
        createdAt: created,
        publishedAt: stage === "publicado" ? daysAgo(Math.max(0, week === 0 ? publishOffset : 8 + publishOffset)) : null,
        pointsAwarded: stage === "publicado"
      });
    }

    addPiece("u-mica", 0, 0, "Reel", "publicado", "Antes y después de un fade alto", 1);
    addPiece("u-mica", 0, 1, "Foto", "publicado", "Detalle de barba con toalla caliente", 2);
    addPiece("u-mica", 0, 2, "Reel", "publicado", "Rutina de styling para pelo ondulado", 0);
    addPiece("u-mica", -1, 0, "Reel", "publicado", "Cómo elegir el producto según tu pelo", 2);
    addPiece("u-mica", -1, 1, "Foto", "publicado", "Backstage de la academia", 3);
    addPiece("u-mica", -1, 2, "Reel", "publicado", "Tutorial de peinado con secador", 1);

    addPiece("u-tomi", 0, 0, "Reel", "publicado", "Fade bajo en 40 segundos", 1);
    addPiece("u-tomi", 0, 1, "Foto", "publicado", "Resultado de corte texturizado", 3);
    addPiece("u-tomi", 0, 2, "Video", "drive", "Cuidado de barba paso a paso", 0);
    addPiece("u-tomi", -1, 0, "Reel", "publicado", "Mi herramienta favorita", 1);
    addPiece("u-tomi", -1, 1, "Foto", "publicado", "Antes y después del sillón", 2);
    addPiece("u-tomi", -1, 2, "Story", "publicado", "Turnos disponibles del sábado", 0);

    addPiece("u-lauta", 0, 0, "Video", "grabado", "Cómo mantener el filo de la navaja", 0);
    addPiece("u-lauta", 0, 1, "Reel", "drive", "Corte clásico para pelo lacio", 0);
    addPiece("u-lauta", -1, 0, "Reel", "publicado", "Tutorial de tijera", 1);
    addPiece("u-lauta", -1, 1, "Foto", "publicado", "Detalle de línea", 2);

    addPiece("u-fede", 0, 0, "Reel", "publicado", "Mi primer mes en Masivo", 2);
    addPiece("u-fede", 0, 1, "Foto", "publicado", "Corte nuevo, clienta feliz", 1);
    addPiece("u-fede", 0, 2, "Story", "grabado", "Preparando la estación", 0);
    addPiece("u-fede", -1, 0, "Foto", "publicado", "Textura y movimiento", 2);
    addPiece("u-fede", -1, 1, "Reel", "publicado", "Cómo usar la cera mate", 1);

    /* ---------------- puntos ---------------- */

    const points = [];

    contentPieces
      .filter((piece) => piece.stage === "publicado")
      .forEach((piece, index) => {
        points.push({
          id: `pt-${piece.id}`,
          userId: piece.userId,
          date: piece.publishedAt || piece.createdAt,
          points: settings.pointsContent,
          reason: `Contenido publicado: ${piece.title}`,
          category: "contenido",
          refId: piece.id,
          createdBy: "u-sofi"
        });
      });

    trainingRecords
      .filter((record) => record.status === "aprobado")
      .forEach((record) => {
        const training = trainings.find((item) => item.id === record.trainingId);
        points.push({
          id: `pt-${record.id}`,
          userId: record.userId,
          date: record.date,
          points: settings.pointsTraining,
          reason: `Capacitación aprobada: ${training?.title || "Capacitación"}`,
          category: "capacitacion",
          refId: record.id,
          createdBy: "u-sofi"
        });
      });

    points.push(
      {
        id: "pt-sale-mica-1",
        userId: "u-mica",
        date: daysAgo(3),
        points: settings.pointsSale,
        reason: "Venta de kit de barba",
        category: "ventas",
        refId: "sale-mica-1",
        createdBy: "u-sofi"
      },
      {
        id: "pt-sale-tomi-1",
        userId: "u-tomi",
        date: daysAgo(5),
        points: settings.pointsSale,
        reason: "Venta de pomada mate",
        category: "ventas",
        refId: "sale-tomi-1",
        createdBy: "u-caro"
      },
      {
        id: "pt-extra-tomi",
        userId: "u-tomi",
        date: daysAgo(7),
        points: 20,
        reason: "Cubrió un turno de urgencia",
        category: "equipo",
        refId: null,
        createdBy: "u-nico"
      },
      {
        id: "pt-extra-fede",
        userId: "u-fede",
        date: daysAgo(4),
        points: 10,
        reason: "Ayudó con la limpieza profunda",
        category: "equipo",
        refId: null,
        createdBy: "u-sofi"
      }
    );

    /* ---------------- strikes ---------------- */

    const strikes = [
      {
        id: "st-1",
        userId: "u-lauta",
        date: daysAgo(9),
        reason: "Llegadas tarde reiteradas",
        detail: "Tercera llegada tarde en dos semanas. Se habló en privado y se acordó un plan de puntualidad.",
        evidence: "https://drive.google.com/",
        expiresAt: daysAhead(81),
        response: "",
        responseDate: null,
        status: "activo",
        createdBy: "u-sofi"
      },
      {
        id: "st-2",
        userId: "u-lauta",
        date: daysAgo(2),
        reason: "Contenido de la semana sin publicar",
        detail: "No publicó las piezas comprometidas sin avisar. Tenía el material grabado desde el martes.",
        evidence: "",
        expiresAt: daysAhead(88),
        response: "Me quedé sin tiempo por dos turnos que se extendieron. Ya subí una pieza y hoy publico la segunda.",
        responseDate: daysAgo(1),
        status: "activo",
        createdBy: "u-sofi"
      },
      {
        id: "st-3",
        userId: "u-tomi",
        date: daysAgo(16),
        reason: "Uso incorrecto del protocolo de higiene",
        detail: "Se encontró una máquina sin desinfectar entre clientes. Se repasó el protocolo.",
        evidence: "",
        expiresAt: daysAhead(74),
        response: "",
        responseDate: null,
        status: "activo",
        createdBy: "u-caro"
      },
      {
        id: "st-4",
        userId: "u-mica",
        date: daysAgo(120),
        reason: "Falta de aviso de ausencia",
        detail: "No avisó con 48 horas de anticipación. Quedó registrado y vencido.",
        evidence: "",
        expiresAt: daysAgo(30),
        response: "Avisé por WhatsApp pero el mensaje no llegó a tiempo. Coordinamos el reemplazo.",
        responseDate: daysAgo(119),
        status: "vencido",
        createdBy: "u-sofi"
      }
    ];

    /* ---------------- reportes de trabajo ---------------- */

    const reports = [
      {
        id: "rep-1",
        userId: "u-mica",
        date: daysAgo(2),
        type: "semanal",
        summary: "Semana muy buena. 3 contenidos publicados, 2 ventas de productos y 1 clienta nueva que vino por Instagram.",
        metrics: { cortes: 32, ventas: 2, resenas: 4 },
        createdBy: "u-mica"
      },
      {
        id: "rep-2",
        userId: "u-tomi",
        date: daysAgo(3),
        type: "semanal",
        summary: "Cerré 28 cortes y una venta de pomada. El reel del fade tuvo buen alcance. Necesito reponer cera.",
        metrics: { cortes: 28, ventas: 1, resenas: 2 },
        createdBy: "u-tomi"
      },
      {
        id: "rep-3",
        userId: "u-lauta",
        date: daysAgo(4),
        type: "incidente",
        summary: "Se rompió el peine de la máquina 2 durante un corte. Se usó la de respaldo y se avisó a Sofi.",
        metrics: { cortes: 21, ventas: 0, resenas: 1 },
        createdBy: "u-lauta"
      },
      {
        id: "rep-4",
        userId: "u-fede",
        date: daysAgo(5),
        type: "cierre",
        summary: "Cierre de caja sin diferencias. Quedaron 2 turnos para mañana y la vitrina completa.",
        metrics: { cortes: 18, ventas: 1, resenas: 1 },
        createdBy: "u-fede"
      }
    ];

    /* ---------------- academia ---------------- */

    const leads = [
      {
        id: "lead-1",
        name: "Agustina Pérez",
        phone: "+54 11 6032-1188",
        source: "Instagram",
        sellerId: "u-caro",
        stage: "consulta",
        level: "inicial",
        createdAt: daysAgo(1),
        notes: "Quiere arrancar en noviembre. Trabaja de mañana."
      },
      {
        id: "lead-2",
        name: "Ramiro Costa",
        phone: "+54 11 4410-2299",
        source: "Recomendación",
        sellerId: "u-sofi",
        stage: "entrevista",
        level: "inicial",
        createdAt: daysAgo(3),
        notes: "Entrevista agendada para el jueves a las 18."
      },
      {
        id: "lead-3",
        name: "Camila Ferro",
        phone: "+54 11 5521-9034",
        source: "Google",
        sellerId: "u-caro",
        stage: "consulta",
        level: "intermedio",
        createdAt: daysAgo(2),
        notes: "Ya hizo un curso online. Quiere práctica con modelos."
      },
      {
        id: "lead-4",
        name: "Julián Rivas",
        phone: "+54 11 6789-3311",
        source: "WhatsApp",
        sellerId: "u-sofi",
        stage: "entrevista",
        level: "inicial",
        createdAt: daysAgo(5),
        notes: "Tiene 19 años, turno tarde."
      },
      {
        id: "lead-5",
        name: "Delfina Sosa",
        phone: "+54 11 3344-7788",
        source: "Walk-in",
        sellerId: "u-caro",
        stage: "inscripto",
        level: "inicial",
        createdAt: daysAgo(6),
        notes: "Ya pagó la inscripción. Arranca en la cohorte de noviembre."
      },
      {
        id: "lead-6",
        name: "Bruno Acosta",
        phone: "+54 11 2211-6655",
        source: "Instagram",
        sellerId: "u-sofi",
        stage: "inscripto",
        level: "avanzado",
        createdAt: daysAgo(9),
        notes: "Viene de otra academia. Entra directo a avanzado."
      },
      {
        id: "lead-7",
        name: "Malena Ortiz",
        phone: "+54 11 7890-1122",
        source: "Recomendación",
        sellerId: "u-caro",
        stage: "inscripto",
        level: "intermedio",
        createdAt: daysAgo(11),
        notes: "Pagó inscripción y primera cuota."
      },
      {
        id: "lead-8",
        name: "Thiago Medina",
        phone: "+54 11 5566-9900",
        source: "Instagram",
        sellerId: "u-sofi",
        stage: "consulta",
        level: "inicial",
        createdAt: daysAgo(0),
        notes: "Consultó por horarios y precio."
      },
      {
        id: "lead-9",
        name: "Victoria Luna",
        phone: "+54 11 6677-2233",
        source: "Google",
        sellerId: "u-caro",
        stage: "perdido",
        level: "inicial",
        createdAt: daysAgo(14),
        notes: "Eligió otra academia por precio."
      },
      {
        id: "lead-10",
        name: "Franco Gil",
        phone: "+54 11 4455-8899",
        source: "WhatsApp",
        sellerId: "u-sofi",
        stage: "entrevista",
        level: "dueno",
        createdAt: daysAgo(4),
        notes: "Tiene una barbería en Quilmes. Quiere el módulo de gestión."
      }
    ];

    const cohorts = [
      {
        id: "co-inicial-oct",
        name: "Inicial N1 · Octubre",
        level: "inicial",
        startDate: daysAgo(18),
        endDate: daysAhead(51),
        capacity: 10,
        price: 120000,
        inscription: 60000,
        teacherId: "u-sofi",
        schedule: "Lun y Mar · 14 a 16"
      },
      {
        id: "co-inicial-sep",
        name: "Inicial N1 · Septiembre",
        level: "inicial",
        startDate: daysAgo(49),
        endDate: daysAhead(20),
        capacity: 10,
        price: 120000,
        inscription: 60000,
        teacherId: "u-sofi",
        schedule: "Mié y Jue · 10 a 12"
      },
      {
        id: "co-inter-oct",
        name: "Intermedio N2 · Octubre",
        level: "intermedio",
        startDate: daysAgo(11),
        endDate: daysAhead(58),
        capacity: 8,
        price: 140000,
        inscription: 60000,
        teacherId: "u-caro",
        schedule: "Sáb · 10 a 13"
      },
      {
        id: "co-avz-nov",
        name: "Avanzado N3 · Noviembre",
        level: "avanzado",
        startDate: daysAhead(10),
        endDate: daysAhead(80),
        capacity: 8,
        price: 160000,
        inscription: 60000,
        teacherId: "u-caro",
        schedule: "Mar y Jue · 18 a 21"
      },
      {
        id: "co-dueno-nov",
        name: "Dueño de barbería · Noviembre",
        level: "dueno",
        startDate: daysAhead(18),
        endDate: daysAhead(46),
        capacity: 6,
        price: 220000,
        inscription: 80000,
        teacherId: "u-nico",
        schedule: "Lun · 19 a 22"
      }
    ];

    const studentNames = [
      ["Agustina Pérez", "co-inicial-oct", "cursando", 20],
      ["Ramiro Costa", "co-inicial-oct", "cursando", 20],
      ["Camila Ferro", "co-inicial-oct", "cursando", 19],
      ["Julián Rivas", "co-inicial-oct", "cursando", 18],
      ["Delfina Sosa", "co-inicial-oct", "cursando", 17],
      ["Thiago Medina", "co-inicial-oct", "cursando", 15],
      ["Malena Ortiz", "co-inicial-sep", "cursando", 48],
      ["Bruno Acosta", "co-inicial-sep", "cursando", 47],
      ["Martina Ruiz", "co-inicial-sep", "cursando", 46],
      ["Gonzalo Paredes", "co-inicial-sep", "cursando", 44],
      ["Lucas Herrera", "co-inicial-sep", "cursando", 43],
      ["Sofía Varela", "co-inicial-sep", "cursando", 42],
      ["Nahuel Torres", "co-inicial-sep", "cursando", 41],
      ["Belén Castro", "co-inicial-sep", "desertor", 40],
      ["Franco Gil", "co-inter-oct", "cursando", 12],
      ["Renata Paz", "co-inter-oct", "cursando", 11],
      ["Iván Molina", "co-inter-oct", "cursando", 11],
      ["Lola Serra", "co-inter-oct", "cursando", 10],
      ["Mateo Ríos", "co-inter-oct", "cursando", 9],
      ["Victoria Luna", "co-avz-nov", "cursando", 8],
      ["Tomás Ibarra", "co-avz-nov", "cursando", 7],
      ["Carla Domínguez", "co-avz-nov", "cursando", 5],
      ["Leandro Vega", "co-avz-nov", "cursando", 4],
      ["Florencia Rojas", "co-dueno-nov", "cursando", 3],
      ["Diego Salcedo", "co-dueno-nov", "cursando", 2],
      ["Pilar Navarro", "co-dueno-nov", "cursando", 1]
    ];

    const students = studentNames.map((item, index) => {
      const cohort = cohorts.find((entry) => entry.id === item[1]);
      return {
        id: `stu-${index + 1}`,
        name: item[0],
        phone: `+54 11 ${5500 + index * 7}-${1200 + index * 13}`,
        email: `${item[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]+/g, ".")}@mail.com`,
        level: cohort.level,
        cohortId: cohort.id,
        status: item[2],
        enrolledAt: daysAgo(item[3]),
        leadId: index < 6 ? `lead-${index + 5}` : null
      };
    });

    const payments = [];

    function addPayment(student, concept, amount, due, paid, method = "Transferencia") {
      const payment = {
        id: newId("pay"),
        studentId: student.id,
        cohortId: student.cohortId,
        concept,
        amount,
        dueDate: due,
        paidDate: paid,
        method: paid ? method : "",
        status: paid ? "pagado" : "pendiente",
        transactionId: null,
        createdBy: "u-caro"
      };
      payments.push(payment);
      if (paid) {
        const tx = addTx({
          date: paid,
          unitId: "academia",
          type: "income",
          amount,
          category: concept.includes("Inscripción") ? "Inscripciones" : "Cuotas",
          description: `${concept} · ${student.name}`,
          source: "academia",
          linkedType: "payment",
          linkedId: payment.id
        });
        payment.transactionId = tx.id;
      }
    }

    students.forEach((student, index) => {
      const cohort = cohorts.find((item) => item.id === student.cohortId);
      addPayment(student, "Inscripción", cohort.inscription, daysAgo(Math.max(1, student.enrolledAt ? 0 : 1)), daysAgo(index % 4 === 0 ? 1 : 30 + (index % 5)), "Transferencia");

      if (student.status === "desertor") {
        addPayment(student, "Cuota 1", cohort.price, daysAgo(35), daysAgo(34));
        return;
      }

      if (student.cohortId === "co-inicial-oct") {
        addPayment(student, "Cuota 1", cohort.price, daysAgo(10), daysAgo(9 + (index % 2)));
        addPayment(student, "Cuota 2", cohort.price, daysAhead(14), null);
      } else if (student.cohortId === "co-inicial-sep") {
        addPayment(student, "Cuota 1", cohort.price, daysAgo(40), daysAgo(39));
        addPayment(student, "Cuota 2", cohort.price, daysAgo(10), daysAgo(9));
        addPayment(student, "Cuota 3", cohort.price, daysAgo(4 + (index % 3)), index % 4 === 0 ? null : daysAgo(3));
      } else if (student.cohortId === "co-inter-oct") {
        addPayment(student, "Cuota 1", cohort.price, daysAgo(5), daysAgo(4));
        addPayment(student, "Cuota 2", cohort.price, daysAhead(25), null);
      } else if (student.cohortId === "co-avz-nov") {
        addPayment(student, "Cuota 1", cohort.price, daysAhead(10), null);
      } else {
        addPayment(student, "Cuota 1", cohort.price, daysAhead(18), null);
      }
    });

    /* ---------------- asistencia ---------------- */

    const attendance = [];
    const cohortDates = [
      { cohortId: "co-inicial-oct", date: daysAgo(4) },
      { cohortId: "co-inicial-oct", date: daysAgo(11) },
      { cohortId: "co-inicial-sep", date: daysAgo(3) },
      { cohortId: "co-inicial-sep", date: daysAgo(10) },
      { cohortId: "co-inter-oct", date: daysAgo(6) },
      { cohortId: "co-avz-nov", date: daysAhead(10) }
    ];

    cohortDates.forEach((entry, index) => {
      const records = {};
      students
        .filter((student) => student.cohortId === entry.cohortId && student.status !== "desertor")
        .forEach((student, studentIndex) => {
          records[student.id] = (studentIndex + index) % 7 !== 0;
        });
      attendance.push({
        id: `att-${index + 1}`,
        cohortId: entry.cohortId,
        date: entry.date,
        records,
        createdBy: "u-sofi"
      });
    });

    /* ---------------- stock ---------------- */

    const products = [
      { id: "pr-1", name: "Pomada mate Masivo", sku: "POM-MAT", category: "Producto", cost: 3800, price: 9500, stock: 14, min: 6, unitId: "productos" },
      { id: "pr-2", name: "Máquina Wahl Magic Clip", sku: "WAH-MAG", category: "Herramienta", cost: 85000, price: 135000, stock: 4, min: 3, unitId: "productos" },
      { id: "pr-3", name: "Navaja Barber Pro", sku: "NAV-PRO", category: "Herramienta", cost: 12000, price: 24000, stock: 2, min: 5, unitId: "productos" },
      { id: "pr-4", name: "Shampoo sólido carbón", sku: "SHA-CAR", category: "Producto", cost: 4200, price: 11000, stock: 22, min: 8, unitId: "productos" },
      { id: "pr-5", name: "Peine de carbono", sku: "PEI-CAR", category: "Insumo", cost: 1600, price: 4500, stock: 31, min: 10, unitId: "productos" },
      { id: "pr-6", name: "Capa impermeable negra", sku: "CAP-NEG", category: "Insumo", cost: 5200, price: 12000, stock: 3, min: 5, unitId: "productos" },
      { id: "pr-7", name: "Kit barba (aceite + bálsamo)", sku: "KIT-BAR", category: "Producto", cost: 7200, price: 18000, stock: 9, min: 4, unitId: "productos" }
    ];

    const stockMoves = [
      {
        id: "sm-1",
        productId: "pr-1",
        type: "venta",
        qty: 2,
        date: daysAgo(3),
        note: "Venta en mostrador",
        userId: "u-tomi",
        transactionId: null
      },
      {
        id: "sm-2",
        productId: "pr-3",
        type: "salida",
        qty: 1,
        date: daysAgo(6),
        note: "Uso interno en academia",
        userId: "u-caro",
        transactionId: null
      },
      {
        id: "sm-3",
        productId: "pr-5",
        type: "entrada",
        qty: 20,
        date: daysAgo(12),
        note: "Compra a proveedor",
        userId: "u-sofi",
        transactionId: null
      }
    ];

    addTx({
      date: daysAgo(3),
      unitId: "productos",
      type: "income",
      amount: 19000,
      category: "Venta de producto",
      description: "Pomada mate · 2 unidades",
      source: "stock",
      createdBy: "u-tomi",
      linkedType: "stock",
      linkedId: "sm-1"
    });

    /* ---------------- auditoría ---------------- */

    const audit = [
      { id: "au-1", at: hoursAgo(2), userId: "u-sofi", action: "creó", entity: "Tarea", entityId: "t-1", detail: "Publicar reel de transformación de Mica" },
      { id: "au-2", at: hoursAgo(5), userId: "u-caro", action: "actualizó", entity: "Lead", entityId: "lead-2", detail: "Ramiro Costa pasó a entrevista" },
      { id: "au-3", at: hoursAgo(8), userId: "u-sofi", action: "otorgó", entity: "Puntos", entityId: "u-mica", detail: "+10 por contenido publicado" },
      { id: "au-4", at: hoursAgo(11), userId: "u-nico", action: "cargó", entity: "Facturación", entityId: "barberia", detail: "Facturación mensual de octubre" },
      { id: "au-5", at: hoursAgo(26), userId: "u-caro", action: "registró", entity: "Pago", entityId: "stu-8", detail: "Cuota 2 de Bruno Acosta" },
      { id: "au-6", at: hoursAgo(30), userId: "u-sofi", action: "registró", entity: "Strike", entityId: "st-2", detail: "Lautaro Benítez · contenido sin publicar" },
      { id: "au-7", at: hoursAgo(34), userId: "u-nico", action: "creó", entity: "Unidad", entityId: "ecommerce", detail: "Unidad Ecommerce" },
      { id: "au-8", at: hoursAgo(50), userId: "u-sofi", action: "completó", entity: "Checklist", entityId: "cl-limpieza", detail: "Limpieza profunda" }
    ];

    /* ---------------- mapas de responsabilidades ---------------- */

    const teamMaps = {};
    users
      .filter((user) => user.role === "manager" || user.role === "academy")
      .forEach((user) => {
        teamMaps[user.id] = createTeamMap(user);
      });

    return {
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings,
      roles,
      users,
      units,
      transactions,
      checklists,
      checklistRuns,
      tasks,
      meetings,
      trainings,
      trainingRecords,
      contentPieces,
      points,
      strikes,
      reports,
      academy: {
        leads,
        cohorts,
        students,
        payments,
        attendance,
        products,
        stockMoves
      },
      audit,
      teamMaps,
      meetSessions
    };
  }

  window.MasivoData = {
    createSeed,
    createTeamMap,
    teamMapPresets: TEAM_MAP_PRESETS,
    util: {
      DAY,
      pad,
      atNoon,
      addDays,
      iso,
      parseISO,
      daysAgo,
      daysAhead,
      dateInMonth,
      monthKey,
      monthLabel,
      monthShort,
      startOfWeek,
      weekStart,
      weekLabel,
      isoWeek,
      newId
    }
  };
})();
