/* ============================================================
   MASIVO CONTROL — Estado, permisos y operaciones
   Persistencia local + auditoría de cada movimiento.
   ============================================================ */

(() => {
  "use strict";

  const STORAGE_KEY = "masivo.control.v1";
  const SESSION_KEY = "masivo.control.session.v1";
  const U = window.MasivoData.util;
  const uid = U.newId;
  const todayISO = () => U.iso(new Date());

  const CAPS = {
    owner: ["*"],
    manager: [
      "dashboard.ops",
      "team.view",
      "barbers.view",
      "ops.manage",
      "content.manage",
      "training.manage",
      "points.manage",
      "strikes.manage",
      "academy.view",
      "academy.leads",
      "academy.students",
      "academy.stock",
      "reports.create"
    ],
    barber: [
      "self.dashboard",
      "self.profile",
      "self.tasks",
      "self.content",
      "self.training",
      "self.points",
      "self.strike.response",
      "self.report"
    ]
  };

  let state = null;
  let session = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readRaw() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function persist() {
    if (!state) return;
    state.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // almacenamiento lleno o bloqueado: seguimos en memoria
    }
  }

  function load() {
    const existing = readRaw();
    state = existing || window.MasivoData.createSeed();
    if (!existing) persist();
    normalize();
  }

  function normalize() {
    if (!state.academy) {
      state.academy = { leads: [], cohorts: [], students: [], payments: [], attendance: [], products: [], stockMoves: [] };
    }
    state.roles = state.roles || {};
    state.settings = Object.assign(
      {
        businessName: "Masivo Barber",
        currency: "ARS",
        contentGoal: 3,
        pointsContent: 10,
        pointsTraining: 20,
        pointsSale: 15,
        strikeLimit: 3,
        strikeExpiryDays: 90,
        monthlyGoal: 22000000
      },
      state.settings || {}
    );
    ["users", "units", "transactions", "checklists", "checklistRuns", "tasks", "meetings", "trainings", "trainingRecords", "contentPieces", "points", "strikes", "reports", "audit"].forEach((key) => {
      if (!Array.isArray(state[key])) state[key] = [];
    });

    /* paleta violeta: recolorea datos guardados con la identidad anterior */
    const legacyColors = {
      "#00e5ff": "#a78bfa",
      "#8b6cff": "#e879f9",
      "#3dffa8": "#34d399",
      "#ffb020": "#fbbf24"
    };
    state.units.forEach((unit) => {
      const next = legacyColors[String(unit.color || "").toLowerCase()];
      if (next) unit.color = next;
    });
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.userId) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  load();
  session = loadSession();
  if (session && !state.users.some((user) => user.id === session.userId && user.active)) {
    session = null;
  }

  /* ---------------- sesión y permisos ---------------- */

  function currentUser() {
    if (!session) return null;
    return state.users.find((user) => user.id === session.userId) || null;
  }

  function setSession(userId) {
    const user = state.users.find((item) => item.id === userId && item.active);
    if (!user) return false;
    session = { userId, at: new Date().toISOString() };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // sin persistencia de sesión
    }
    return true;
  }

  function clearSession() {
    session = null;
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // sin persistencia de sesión
    }
  }

  function can(capability) {
    const user = currentUser();
    if (!user) return false;
    const caps = CAPS[user.role] || [];
    return caps.includes("*") || caps.includes(capability);
  }

  function roleLabel(role) {
    return state.roles?.[role]?.label || role;
  }

  function isOwner() {
    return currentUser()?.role === "owner";
  }

  function isBarber() {
    return currentUser()?.role === "barber";
  }

  /* ---------------- auditoría ---------------- */

  function log(action, entity, entityId, detail) {
    const user = currentUser();
    state.audit.unshift({
      id: uid("au"),
      at: new Date().toISOString(),
      userId: user?.id || "sistema",
      action,
      entity,
      entityId: entityId || "",
      detail: detail || ""
    });
    state.audit = state.audit.slice(0, 500);
  }

  function commit(audit) {
    if (audit) log(audit.action, audit.entity, audit.entityId, audit.detail);
    persist();
  }

  /* ---------------- lookups ---------------- */

  const userById = (id) => state.users.find((user) => user.id === id) || null;
  const unitById = (id) => state.units.find((unit) => unit.id === id) || null;
  const trainingById = (id) => state.trainings.find((item) => item.id === id) || null;
  const checklistById = (id) => state.checklists.find((item) => item.id === id) || null;
  const studentById = (id) => state.academy.students.find((item) => item.id === id) || null;
  const cohortById = (id) => state.academy.cohorts.find((item) => item.id === id) || null;
  const leadById = (id) => state.academy.leads.find((item) => item.id === id) || null;
  const productById = (id) => state.academy.products.find((item) => item.id === id) || null;

  function barbers() {
    return state.users.filter((user) => user.role === "barber" && user.active);
  }

  function managers() {
    return state.users.filter((user) => user.role === "manager" && user.active);
  }

  function team() {
    return state.users.filter((user) => user.active);
  }

  /* ---------------- finanzas ---------------- */

  function monthOf(date) {
    return String(date || "").slice(0, 7);
  }

  function transactionsForMonth(month) {
    return state.transactions.filter((tx) => monthOf(tx.date) === month);
  }

  function unitSummary(unitId, month) {
    const unit = unitById(unitId);
    const list = transactionsForMonth(month).filter((tx) => tx.unitId === unitId);
    const income = list.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const cost = list.filter((tx) => tx.type === "cost").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const goal = Number(unit?.goal || 0);
    return {
      unit,
      income,
      cost,
      margin: income - cost,
      marginPct: income > 0 ? ((income - cost) / income) * 100 : 0,
      goal,
      goalPct: goal > 0 ? Math.min((income / goal) * 100, 100) : 0,
      transactions: list
    };
  }

  function totalsForMonth(month) {
    const list = transactionsForMonth(month);
    const income = list.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const cost = list.filter((tx) => tx.type === "cost").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    return { income, cost, margin: income - cost, marginPct: income > 0 ? ((income - cost) / income) * 100 : 0 };
  }

  function monthlySeries(months = 6, unitId = null) {
    const result = [];
    for (let offset = -(months - 1); offset <= 0; offset += 1) {
      const key = U.monthKey(offset);
      if (unitId) {
        const summary = unitSummary(unitId, key);
        result.push({ key, label: U.monthShort(key), income: summary.income, cost: summary.cost, margin: summary.margin });
      } else {
        const totals = totalsForMonth(key);
        result.push({ key, label: U.monthShort(key), income: totals.income, cost: totals.cost, margin: totals.margin });
      }
    }
    return result;
  }

  function unitSeries(unitId, months = 6) {
    return monthlySeries(months, unitId);
  }

  function manualBilling(month) {
    return state.transactions
      .filter((tx) => tx.unitId === "barberia" && tx.type === "income" && tx.category === "Facturación mensual" && monthOf(tx.date) === month)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  /* ---------------- barberos ---------------- */

  const STAGE_WEIGHT = { grabado: 0.34, drive: 0.67, publicado: 1 };

  function userPoints(userId) {
    return state.points.filter((item) => item.userId === userId).reduce((sum, item) => sum + Number(item.points || 0), 0);
  }

  function isStrikeActive(strike) {
    if (!strike || strike.status === "archivado") return false;
    if (strike.status === "vencido") return false;
    return !strike.expiresAt || strike.expiresAt >= todayISO();
  }

  function activeStrikes(userId) {
    return state.strikes.filter((strike) => strike.userId === userId && isStrikeActive(strike));
  }

  function strikeState(strike) {
    if (strike.status === "archivado") return "archivado";
    if (strike.status === "vencido" || (strike.expiresAt && strike.expiresAt < todayISO())) return "vencido";
    return "activo";
  }

  function contentForWeek(userId, week) {
    return state.contentPieces.filter((piece) => piece.userId === userId && piece.weekStart === week);
  }

  function contentStats(userId, week = U.weekStart(0)) {
    const pieces = contentForWeek(userId, week);
    const goal = Number(state.settings.contentGoal || 3);
    const weighted = pieces.reduce((sum, piece) => sum + (STAGE_WEIGHT[piece.stage] || 0), 0);
    const published = pieces.filter((piece) => piece.stage === "publicado").length;
    const inDrive = pieces.filter((piece) => piece.stage === "drive").length;
    const recorded = pieces.filter((piece) => piece.stage === "grabado").length;
    return {
      pieces,
      goal,
      published,
      inDrive,
      recorded,
      compliance: goal > 0 ? Math.min(100, Math.round((weighted / goal) * 100)) : 0,
      rawCompliance: goal > 0 ? Math.round((weighted / goal) * 100) : 0
    };
  }

  function trainingStats(userId) {
    const records = state.trainingRecords.filter((record) => record.userId === userId);
    const approved = records.filter((record) => record.status === "aprobado").length;
    const failed = records.filter((record) => record.status === "desaprobado").length;
    const total = state.trainings.length;
    return {
      records,
      approved,
      failed,
      total,
      pending: Math.max(0, total - approved - failed),
      pct: total > 0 ? Math.round((approved / total) * 100) : 0
    };
  }

  function tasksFor(userId) {
    return state.tasks.filter((task) => task.assigneeId === userId);
  }

  function openTasks(userId = null) {
    return state.tasks.filter((task) => task.status !== "hecha" && (!userId || task.assigneeId === userId));
  }

  function overdueTasks(userId = null) {
    return openTasks(userId).filter((task) => task.due && task.due < todayISO());
  }

  function barberStats(userId, week = U.weekStart(0)) {
    const content = contentStats(userId, week);
    const training = trainingStats(userId);
    const tasks = tasksFor(userId);
    return {
      user: userById(userId),
      points: userPoints(userId),
      strikes: activeStrikes(userId).length,
      content,
      training,
      tasks,
      openTasks: tasks.filter((task) => task.status !== "hecha").length,
      overdue: tasks.filter((task) => task.status !== "hecha" && task.due < todayISO()).length,
      reports: state.reports.filter((report) => report.userId === userId).length
    };
  }

  function contentOverview(week = U.weekStart(0)) {
    return barbers().map((barber) => ({ barber, ...contentStats(barber.id, week) }));
  }

  function averageContentCompliance(week = U.weekStart(0)) {
    const list = contentOverview(week);
    if (!list.length) return 0;
    return Math.round(list.reduce((sum, item) => sum + item.compliance, 0) / list.length);
  }

  /* ---------------- academia ---------------- */

  function paymentState(payment) {
    if (payment.paidDate || payment.status === "pagado") return "pagado";
    if (payment.dueDate && payment.dueDate < todayISO()) return "vencido";
    return "pendiente";
  }

  function paymentsForMonth(month) {
    const start = `${month}-01`;
    const [year, monthNumber] = month.split("-").map(Number);
    const end = U.iso(new Date(year, monthNumber, 0, 12));
    return state.academy.payments.filter((payment) => payment.dueDate >= start && payment.dueDate <= end);
  }

  function paymentsCollected(month) {
    return state.academy.payments
      .filter((payment) => payment.paidDate && monthOf(payment.paidDate) === month)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }

  function paymentsPending(month) {
    return paymentsForMonth(month)
      .filter((payment) => paymentState(payment) !== "pagado")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }

  function overduePayments() {
    return state.academy.payments.filter((payment) => paymentState(payment) === "vencido");
  }

  function activeStudents() {
    return state.academy.students.filter((student) => student.status === "cursando");
  }

  function cohortStudents(cohortId) {
    return state.academy.students.filter((student) => student.cohortId === cohortId && student.status !== "desertor");
  }

  function cohortSummary(cohort) {
    const enrolled = cohortStudents(cohort.id);
    return {
      ...cohort,
      students: enrolled,
      count: enrolled.length,
      occupancy: cohort.capacity > 0 ? Math.round((enrolled.length / cohort.capacity) * 100) : 0
    };
  }

  function attendanceRate(cohortId = null) {
    const records = state.academy.attendance.filter((entry) => !cohortId || entry.cohortId === cohortId);
    let present = 0;
    let total = 0;
    records.forEach((entry) => {
      Object.values(entry.records || {}).forEach((value) => {
        total += 1;
        if (value) present += 1;
      });
    });
    return total > 0 ? Math.round((present / total) * 100) : 0;
  }

  function studentAttendance(studentId) {
    let present = 0;
    let total = 0;
    state.academy.attendance.forEach((entry) => {
      if (Object.prototype.hasOwnProperty.call(entry.records || {}, studentId)) {
        total += 1;
        if (entry.records[studentId]) present += 1;
      }
    });
    return { present, total, pct: total > 0 ? Math.round((present / total) * 100) : 0 };
  }

  function academyMetrics(month = U.monthKey(0)) {
    const leads = state.academy.leads;
    const leadsMonth = leads.filter((lead) => monthOf(lead.createdAt) === month);
    const newStudents = state.academy.students.filter((student) => monthOf(student.enrolledAt) === month);
    const enrolledLeads = leads.filter((lead) => lead.stage === "inscripto").length;
    const totalStudents = state.academy.students.length;
    const deserters = state.academy.students.filter((student) => student.status === "desertor").length;
    const marketing = transactionsForMonth(month)
      .filter((tx) => tx.unitId === "academia" && tx.type === "cost" && tx.category === "Marketing")
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const capacity = state.academy.cohorts.reduce((sum, cohort) => sum + Number(cohort.capacity || 0), 0);
    const occupied = activeStudents().length;
    const sources = {};
    leads.forEach((lead) => {
      sources[lead.source] = sources[lead.source] || { source: lead.source, leads: 0, enrolled: 0 };
      sources[lead.source].leads += 1;
      if (lead.stage === "inscripto") sources[lead.source].enrolled += 1;
    });
    const sellers = managers().map((user) => {
      const owned = leads.filter((lead) => lead.sellerId === user.id);
      const enrolled = owned.filter((lead) => lead.stage === "inscripto").length;
      return {
        user,
        leads: owned.length,
        enrolled,
        conversion: owned.length ? Math.round((enrolled / owned.length) * 100) : 0
      };
    });
    const funnel = ["consulta", "entrevista", "inscripto", "perdido"].map((stage) => ({
      stage,
      count: leads.filter((lead) => lead.stage === stage).length
    }));
    return {
      month,
      leads: leadsMonth.length,
      leadsTotal: leads.length,
      newStudents: newStudents.length,
      enrolledLeads,
      conversion: leads.length ? Math.round((enrolledLeads / leads.length) * 100) : 0,
      activeStudents: occupied,
      totalStudents,
      deserters,
      desertion: totalStudents ? Math.round((deserters / totalStudents) * 100) : 0,
      capacity,
      occupancy: capacity ? Math.round((occupied / capacity) * 100) : 0,
      collected: paymentsCollected(month),
      pending: paymentsPending(month),
      marketing,
      cac: newStudents.length ? Math.round(marketing / newStudents.length) : 0,
      sources: Object.values(sources).sort((a, b) => b.leads - a.leads),
      sellers,
      funnel,
      attendance: attendanceRate()
    };
  }

  function weeklyLeads() {
    const start = U.weekStart(0);
    return state.academy.leads.filter((lead) => lead.createdAt >= start);
  }

  function lowStock() {
    return state.academy.products.filter((product) => product.stock <= product.min);
  }

  function stockValue() {
    return state.academy.products.reduce((sum, product) => sum + product.stock * product.cost, 0);
  }

  /* ---------------- alertas / resumen ---------------- */

  function alerts() {
    const list = [];
    barbers().forEach((barber) => {
      const count = activeStrikes(barber.id).length;
      if (count >= Number(state.settings.strikeLimit || 3)) {
        list.push({
          id: `strike-${barber.id}`,
          tone: "danger",
          icon: "alert",
          title: `${barber.name} llegó al límite de strikes`,
          detail: `${count} de ${state.settings.strikeLimit} activos. Corresponde revisar discontinuidad.`,
          route: "puntos/strikes"
        });
      } else if (count > 0) {
        list.push({
          id: `strike-near-${barber.id}`,
          tone: "warning",
          icon: "shield",
          title: `${barber.name} tiene ${count} strike${count > 1 ? "s" : ""} activo${count > 1 ? "s" : ""}`,
          detail: `A ${Number(state.settings.strikeLimit || 3) - count} del límite de la marca.`,
          route: "puntos/strikes"
        });
      }
    });

    overdueTasks().slice(0, 3).forEach((task) => {
      list.push({
        id: `task-${task.id}`,
        tone: "warning",
        icon: "clock",
        title: "Tarea vencida",
        detail: `${task.title} · ${userById(task.assigneeId)?.name || "Sin responsable"}`,
        route: "operacion"
      });
    });

    lowStock().slice(0, 3).forEach((product) => {
      list.push({
        id: `stock-${product.id}`,
        tone: "warning",
        icon: "package",
        title: "Stock bajo",
        detail: `${product.name}: quedan ${product.stock} unidades.`,
        route: "academia/stock"
      });
    });

    if (overduePayments().length) {
      const total = overduePayments().reduce((sum, payment) => sum + payment.amount, 0);
      list.push({
        id: "payments-overdue",
        tone: "danger",
        icon: "wallet",
        title: `${overduePayments().length} cuota${overduePayments().length > 1 ? "s" : ""} vencida${overduePayments().length > 1 ? "s" : ""}`,
        detail: `Hay ${overduePayments().length} pagos por revisar en Academia.`,
        route: "academia/pagos",
        amount: total
      });
    }

    const compliance = averageContentCompliance();
    if (compliance < 70) {
      list.push({
        id: "content-low",
        tone: "warning",
        icon: "image",
        title: "Contenido por debajo de la meta",
        detail: `El equipo está al ${compliance}% de cumplimiento semanal.`,
        route: "contenido"
      });
    }

    return list;
  }

  function weekSummary() {
    const start = U.weekStart(0);
    const end = U.iso(U.addDays(U.parseISO(start), 6));
    const inWeek = (value) => {
      if (!value) return false;
      const day = String(value).slice(0, 10);
      return day >= start && day <= end;
    };
    const income = state.transactions.filter((tx) => tx.type === "income" && inWeek(tx.date)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const collected = state.academy.payments.filter((payment) => payment.paidDate && inWeek(payment.paidDate)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const published = state.contentPieces.filter((piece) => piece.stage === "publicado" && inWeek(piece.publishedAt)).length;
    const newStudents = state.academy.students.filter((student) => inWeek(student.enrolledAt)).length;
    const leads = state.academy.leads.filter((lead) => inWeek(lead.createdAt)).length;
    const doneTasks = state.tasks.filter((task) => task.completedAt && inWeek(task.completedAt)).length;
    const strikes = barbers().reduce((sum, barber) => sum + activeStrikes(barber.id).length, 0);
    const contentGoal = Math.max(1, state.settings.contentGoal || 1) * Math.max(1, barbers().length);
    return { start, end, income, collected, published, contentGoal, newStudents, leads, doneTasks, strikes };
  }

  function ownerSummary(month = U.monthKey(0)) {
    const totals = totalsForMonth(month);
    const previous = totalsForMonth(U.monthKey(-1));
    const academy = academyMetrics(month);
    return {
      revenue: totals.income,
      cost: totals.cost,
      margin: totals.margin,
      marginPct: totals.marginPct,
      revenueDelta: previous.income ? ((totals.income - previous.income) / previous.income) * 100 : 0,
      marginDelta: previous.margin ? ((totals.margin - previous.margin) / previous.margin) * 100 : 0,
      activeStudents: academy.activeStudents,
      newStudents: academy.newStudents,
      weeklyLeads: weeklyLeads().length,
      contentCompliance: averageContentCompliance(),
      activeStrikes: barbers().reduce((sum, barber) => sum + activeStrikes(barber.id).length, 0),
      overdueTasks: overdueTasks().length,
      collected: academy.collected,
      pendingPayments: academy.pending,
      lowStock: lowStock().length
    };
  }

  /* ---------------- mutaciones: finanzas ---------------- */

  function addTransaction(data) {
    const tx = {
      id: uid("tx"),
      date: data.date || todayISO(),
      unitId: data.unitId,
      type: data.type === "cost" ? "cost" : "income",
      amount: Math.max(0, Math.round(Number(data.amount || 0))),
      category: data.category || (data.type === "cost" ? "Gasto" : "Ingreso"),
      description: data.description || "",
      source: data.source || "manual",
      createdBy: currentUser()?.id || "sistema",
      linkedType: data.linkedType || null,
      linkedId: data.linkedId || null
    };
    state.transactions.push(tx);
    commit({
      action: "cargó",
      entity: tx.type === "income" ? "Ingreso" : "Costo",
      entityId: tx.id,
      detail: `${unitById(tx.unitId)?.name || "Unidad"} · ${tx.description || tx.category}`
    });
    return tx;
  }

  function updateTransaction(id, data) {
    const tx = state.transactions.find((item) => item.id === id);
    if (!tx) return null;
    Object.assign(tx, {
      date: data.date || tx.date,
      unitId: data.unitId || tx.unitId,
      type: data.type || tx.type,
      amount: data.amount !== undefined ? Math.max(0, Math.round(Number(data.amount))) : tx.amount,
      category: data.category || tx.category,
      description: data.description !== undefined ? data.description : tx.description
    });
    commit({ action: "editó", entity: "Movimiento", entityId: id, detail: tx.description || tx.category });
    return tx;
  }

  function deleteTransaction(id) {
    const tx = state.transactions.find((item) => item.id === id);
    if (!tx) return false;
    if (tx.linkedType) return false;
    state.transactions = state.transactions.filter((item) => item.id !== id);
    commit({ action: "eliminó", entity: "Movimiento", entityId: id, detail: `${tx.description || tx.category} · ${tx.amount}` });
    return true;
  }

  function upsertUnit(data) {
    let unit = state.units.find((item) => item.id === data.id);
    if (unit) {
      Object.assign(unit, data);
      commit({ action: "editó", entity: "Unidad", entityId: unit.id, detail: unit.name });
    } else {
      unit = {
        id: data.id || uid("unit"),
        name: data.name,
        kind: data.kind || "custom",
        description: data.description || "",
        color: data.color || "#00e5ff",
        icon: data.icon || "layers",
        goal: Number(data.goal || 0),
        active: data.active !== false
      };
      state.units.push(unit);
      commit({ action: "creó", entity: "Unidad", entityId: unit.id, detail: unit.name });
    }
    return unit;
  }

  function toggleUnit(id) {
    const unit = unitById(id);
    if (!unit) return false;
    unit.active = !unit.active;
    commit({ action: unit.active ? "activó" : "desactivó", entity: "Unidad", entityId: id, detail: unit.name });
    return true;
  }

  /* ---------------- mutaciones: equipo ---------------- */

  function upsertUser(data) {
    let user = state.users.find((item) => item.id === data.id);
    const role = ["owner", "manager", "barber"].includes(data.role) ? data.role : "barber";
    if (user) {
      Object.assign(user, {
        name: data.name || user.name,
        role,
        email: data.email !== undefined ? data.email : user.email,
        phone: data.phone !== undefined ? data.phone : user.phone,
        commission: data.commission !== undefined ? Number(data.commission) : user.commission,
        active: data.active !== undefined ? Boolean(data.active) : user.active
      });
      user.initials = user.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
      commit({ action: "editó", entity: "Persona", entityId: user.id, detail: `${user.name} · ${roleLabel(role)}` });
    } else {
      user = {
        id: uid("u"),
        name: data.name,
        role,
        email: data.email || "",
        phone: data.phone || "",
        active: true,
        startedAt: data.startedAt || todayISO(),
        commission: Number(data.commission || 0),
        initials: String(data.name || "")
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase(),
        tone: role === "manager" ? "violet" : role === "owner" ? "cyan" : "green"
      };
      state.users.push(user);
      commit({ action: "creó", entity: "Persona", entityId: user.id, detail: `${user.name} · ${roleLabel(role)}` });
    }
    return user;
  }

  function toggleUser(id) {
    const user = userById(id);
    if (!user) return false;
    if (user.id === currentUser()?.id) return false;
    user.active = !user.active;
    commit({ action: user.active ? "activó" : "desactivó", entity: "Persona", entityId: id, detail: user.name });
    return true;
  }

  function updateRoles(data) {
    ["owner", "manager", "barber"].forEach((role) => {
      if (!state.roles[role]) state.roles[role] = { label: role, description: "" };
      if (data[role] && String(data[role]).trim()) state.roles[role].label = String(data[role]).trim().slice(0, 28);
    });
    commit({ action: "editó", entity: "Roles", entityId: "roles", detail: "Nombres de jerarquías" });
  }

  /* ---------------- mutaciones: operación ---------------- */

  function addTask(data) {
    const task = {
      id: uid("t"),
      title: data.title,
      assigneeId: data.assigneeId,
      due: data.due || todayISO(),
      status: data.status || "pendiente",
      priority: data.priority || "media",
      unitId: data.unitId || "barberia",
      notes: data.notes || "",
      createdBy: currentUser()?.id || "sistema",
      createdAt: new Date().toISOString()
    };
    state.tasks.unshift(task);
    commit({ action: "creó", entity: "Tarea", entityId: task.id, detail: task.title });
    return task;
  }

  function updateTask(id, data) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return null;
    Object.assign(task, {
      title: data.title || task.title,
      assigneeId: data.assigneeId || task.assigneeId,
      due: data.due || task.due,
      status: data.status || task.status,
      priority: data.priority || task.priority,
      unitId: data.unitId || task.unitId,
      notes: data.notes !== undefined ? data.notes : task.notes
    });
    commit({ action: "editó", entity: "Tarea", entityId: id, detail: task.title });
    return task;
  }

  function setTaskStatus(id, status) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return false;
    task.status = status;
    task.completedAt = status === "hecha" ? new Date().toISOString() : null;
    commit({ action: status === "hecha" ? "completó" : "actualizó", entity: "Tarea", entityId: id, detail: task.title });
    return true;
  }

  function deleteTask(id) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return false;
    state.tasks = state.tasks.filter((item) => item.id !== id);
    commit({ action: "eliminó", entity: "Tarea", entityId: id, detail: task.title });
    return true;
  }

  function saveChecklistRun(checklistId, completed, userId) {
    const checklist = checklistById(checklistId);
    if (!checklist) return null;
    const date = todayISO();
    let run = state.checklistRuns.find((item) => item.checklistId === checklistId && item.date === date);
    if (run) {
      run.completed = completed;
      run.userId = userId || currentUser()?.id;
      run.completedAt = new Date().toISOString();
    } else {
      run = {
        id: uid("cr"),
        checklistId,
        date,
        userId: userId || currentUser()?.id,
        completed,
        completedAt: new Date().toISOString()
      };
      state.checklistRuns.push(run);
    }
    const full = completed.length >= checklist.items.length;
    commit({
      action: full ? "completó" : "actualizó",
      entity: "Checklist",
      entityId: checklistId,
      detail: `${checklist.title} · ${completed.length}/${checklist.items.length}`
    });
    return run;
  }

  function addMeeting(data) {
    const meeting = {
      id: uid("m"),
      title: data.title || `MeetBarber · ${U.weekLabel(U.weekStart(0))}`,
      date: data.date || todayISO(),
      attendees: data.attendees || [],
      notes: data.notes || "",
      decisions: data.decisions || [],
      actions: data.actions || []
    };
    state.meetings.unshift(meeting);
    commit({ action: "creó", entity: "Reunión", entityId: meeting.id, detail: meeting.title });
    return meeting;
  }

  /* ---------------- mutaciones: contenido ---------------- */

  function addContentPiece(data) {
    const week = data.weekStart || U.weekStart(0);
    const piece = {
      id: uid("cp"),
      userId: data.userId,
      weekStart: week,
      title: data.title,
      type: data.type || "Reel",
      stage: data.stage || "grabado",
      link: data.link || "",
      createdAt: todayISO(),
      publishedAt: data.stage === "publicado" ? todayISO() : null,
      pointsAwarded: false
    };
    state.contentPieces.push(piece);
    if (piece.stage === "publicado") awardForContent(piece);
    commit({ action: "creó", entity: "Contenido", entityId: piece.id, detail: `${userById(piece.userId)?.name || ""} · ${piece.title}` });
    return piece;
  }

  function advanceContent(id) {
    const piece = state.contentPieces.find((item) => item.id === id);
    if (!piece) return null;
    const flow = { grabado: "drive", drive: "publicado", publicado: "publicado" };
    piece.stage = flow[piece.stage] || "publicado";
    if (piece.stage === "publicado") {
      piece.publishedAt = todayISO();
      awardForContent(piece);
    }
    commit({ action: "actualizó", entity: "Contenido", entityId: id, detail: `${piece.title} → ${piece.stage}` });
    return piece;
  }

  function awardForContent(piece) {
    if (piece.pointsAwarded) return;
    const exists = state.points.some((item) => item.refId === piece.id);
    if (exists) {
      piece.pointsAwarded = true;
      return;
    }
    state.points.push({
      id: uid("pt"),
      userId: piece.userId,
      date: todayISO(),
      points: Number(state.settings.pointsContent || 10),
      reason: `Contenido publicado: ${piece.title}`,
      category: "contenido",
      refId: piece.id,
      createdBy: currentUser()?.id || "sistema"
    });
    piece.pointsAwarded = true;
  }

  function deleteContentPiece(id) {
    const piece = state.contentPieces.find((item) => item.id === id);
    if (!piece) return false;
    state.contentPieces = state.contentPieces.filter((item) => item.id !== id);
    commit({ action: "eliminó", entity: "Contenido", entityId: id, detail: piece.title });
    return true;
  }

  /* ---------------- mutaciones: puntos / strikes ---------------- */

  function awardPoints(data) {
    const entry = {
      id: uid("pt"),
      userId: data.userId,
      date: data.date || todayISO(),
      points: Math.round(Number(data.points || 0)),
      reason: data.reason,
      category: data.category || "manual",
      refId: data.refId || null,
      createdBy: currentUser()?.id || "sistema"
    };
    state.points.push(entry);
    commit({ action: "otorgó", entity: "Puntos", entityId: entry.userId, detail: `+${entry.points} · ${entry.reason}` });
    return entry;
  }

  function addStrike(data) {
    const expiryDays = Number(data.expiryDays || state.settings.strikeExpiryDays || 90);
    const strike = {
      id: uid("st"),
      userId: data.userId,
      date: data.date || todayISO(),
      reason: data.reason,
      detail: data.detail || "",
      evidence: data.evidence || "",
      expiresAt: data.expiresAt || U.iso(U.addDays(new Date(), expiryDays)),
      response: "",
      responseDate: null,
      status: "activo",
      createdBy: currentUser()?.id || "sistema"
    };
    state.strikes.unshift(strike);
    commit({
      action: "registró",
      entity: "Strike",
      entityId: strike.userId,
      detail: `${userById(strike.userId)?.name || ""} · ${strike.reason}`
    });
    return strike;
  }

  function respondStrike(id, response) {
    const strike = state.strikes.find((item) => item.id === id);
    if (!strike) return null;
    strike.response = response;
    strike.responseDate = todayISO();
    commit({ action: "respondió", entity: "Strike", entityId: id, detail: strike.reason });
    return strike;
  }

  function archiveStrike(id, note = "") {
    const strike = state.strikes.find((item) => item.id === id);
    if (!strike) return null;
    strike.status = "archivado";
    strike.archiveNote = note;
    commit({ action: "archivó", entity: "Strike", entityId: id, detail: strike.reason });
    return strike;
  }

  function addReport(data) {
    const report = {
      id: uid("rep"),
      userId: data.userId,
      date: data.date || todayISO(),
      type: data.type || "semanal",
      summary: data.summary,
      metrics: {
        cortes: Number(data.cortes || 0),
        ventas: Number(data.ventas || 0),
        resenas: Number(data.resenas || 0)
      },
      createdBy: currentUser()?.id || "sistema"
    };
    state.reports.unshift(report);
    commit({ action: "registró", entity: "Reporte", entityId: report.userId, detail: `${userById(report.userId)?.name || ""} · ${report.type}` });
    return report;
  }

  /* ---------------- mutaciones: capacitaciones ---------------- */

  function addTraining(data) {
    const training = {
      id: uid("tr"),
      title: data.title,
      description: data.description || "",
      level: data.level || "inicial",
      minutes: Number(data.minutes || 30),
      passScore: Number(data.passScore || 70),
      questions: data.questions || []
    };
    state.trainings.push(training);
    commit({ action: "creó", entity: "Capacitación", entityId: training.id, detail: training.title });
    return training;
  }

  function saveTrainingRecord(data) {
    const existing = state.trainingRecords.find((record) => record.trainingId === data.trainingId && record.userId === data.userId);
    const score = Math.max(0, Math.min(100, Math.round(Number(data.score || 0))));
    const training = trainingById(data.trainingId);
    const status = data.status || (score >= Number(training?.passScore || 70) ? "aprobado" : "desaprobado");
    if (existing) {
      const wasApproved = existing.status === "aprobado";
      existing.status = status;
      existing.score = score;
      existing.date = data.date || todayISO();
      if (status === "aprobado" && !wasApproved) {
        awardTrainingPoints(existing, training);
      }
      commit({ action: "actualizó", entity: "Capacitación", entityId: existing.userId, detail: `${training?.title} · ${status}` });
      return existing;
    }
    const record = {
      id: uid("trr"),
      trainingId: data.trainingId,
      userId: data.userId,
      status,
      score,
      date: data.date || todayISO(),
      createdBy: currentUser()?.id || data.userId
    };
    state.trainingRecords.push(record);
    if (status === "aprobado") awardTrainingPoints(record, training);
    commit({ action: "registró", entity: "Capacitación", entityId: record.userId, detail: `${training?.title} · ${status} (${score}%)` });
    return record;
  }

  function awardTrainingPoints(record, training) {
    if (state.points.some((item) => item.refId === record.id)) return;
    state.points.push({
      id: uid("pt"),
      userId: record.userId,
      date: record.date || todayISO(),
      points: Number(state.settings.pointsTraining || 20),
      reason: `Capacitación aprobada: ${training?.title || "Capacitación"}`,
      category: "capacitacion",
      refId: record.id,
      createdBy: currentUser()?.id || "sistema"
    });
  }

  /* ---------------- mutaciones: academia ---------------- */

  function addLead(data) {
    const lead = {
      id: uid("lead"),
      name: data.name,
      phone: data.phone || "",
      source: data.source || "Instagram",
      sellerId: data.sellerId || managers()[0]?.id || "u-sofi",
      stage: data.stage || "consulta",
      level: data.level || "inicial",
      createdAt: data.createdAt || todayISO(),
      notes: data.notes || ""
    };
    state.academy.leads.unshift(lead);
    commit({ action: "creó", entity: "Lead", entityId: lead.id, detail: `${lead.name} · ${lead.source}` });
    return lead;
  }

  function updateLead(id, data) {
    const lead = leadById(id);
    if (!lead) return null;
    Object.assign(lead, data);
    commit({ action: "actualizó", entity: "Lead", entityId: id, detail: `${lead.name} · ${lead.stage}` });
    return lead;
  }

  function moveLead(id, stage) {
    const lead = leadById(id);
    if (!lead) return null;
    lead.stage = stage;
    commit({ action: "movió", entity: "Lead", entityId: id, detail: `${lead.name} → ${stage}` });
    return lead;
  }

  function addCohort(data) {
    const cohort = {
      id: uid("co"),
      name: data.name,
      level: data.level || "inicial",
      startDate: data.startDate || todayISO(),
      endDate: data.endDate || U.daysAhead(60),
      capacity: Number(data.capacity || 8),
      price: Number(data.price || 120000),
      inscription: Number(data.inscription || 60000),
      teacherId: data.teacherId || "u-sofi",
      schedule: data.schedule || ""
    };
    state.academy.cohorts.push(cohort);
    commit({ action: "creó", entity: "Cohorte", entityId: cohort.id, detail: cohort.name });
    return cohort;
  }

  function addStudent(data) {
    const cohort = cohortById(data.cohortId);
    if (!cohort) return null;
    const student = {
      id: uid("stu"),
      name: data.name,
      phone: data.phone || "",
      email: data.email || "",
      level: cohort.level,
      cohortId: cohort.id,
      status: data.status || "cursando",
      enrolledAt: data.enrolledAt || todayISO(),
      leadId: data.leadId || null
    };
    state.academy.students.push(student);
    if (data.createPayment !== false) {
      const payment = addPaymentRecord({
        studentId: student.id,
        concept: "Inscripción",
        amount: Number(data.inscription || cohort.inscription),
        dueDate: todayISO(),
        paid: Boolean(data.paid),
        method: data.method || "Transferencia"
      });
      student.inscriptionPaymentId = payment.id;
    }
    commit({ action: "creó", entity: "Alumno", entityId: student.id, detail: `${student.name} · ${cohort.name}` });
    return student;
  }

  function enrollLead(leadId, cohortId, options = {}) {
    const lead = leadById(leadId);
    const cohort = cohortById(cohortId);
    if (!lead || !cohort) return null;
    const student = {
      id: uid("stu"),
      name: lead.name,
      phone: lead.phone,
      email: `${lead.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]+/g, ".")}@mail.com`,
      level: cohort.level,
      cohortId: cohort.id,
      status: "cursando",
      enrolledAt: todayISO(),
      leadId: lead.id
    };
    state.academy.students.push(student);
    lead.stage = "inscripto";
    const payment = addPaymentRecord({
      studentId: student.id,
      concept: "Inscripción",
      amount: Number(options.amount || cohort.inscription),
      dueDate: todayISO(),
      paid: Boolean(options.paid),
      method: options.method || "Transferencia"
    });
    student.inscriptionPaymentId = payment.id;
    commit({
      action: "inscribió",
      entity: "Alumno",
      entityId: student.id,
      detail: `${student.name} · ${cohort.name}${options.paid ? " · inscripción paga" : ""}`
    });
    return { student, payment, cohort };
  }

  function addPaymentRecord(data) {
    const student = studentById(data.studentId);
    const cohort = student ? cohortById(student.cohortId) : null;
    const payment = {
      id: uid("pay"),
      studentId: data.studentId,
      cohortId: data.cohortId || cohort?.id || "",
      concept: data.concept || "Cuota",
      amount: Number(data.amount || 0),
      dueDate: data.dueDate || todayISO(),
      paidDate: data.paid ? data.paidDate || todayISO() : null,
      method: data.paid ? data.method || "Transferencia" : "",
      status: data.paid ? "pagado" : "pendiente",
      transactionId: null,
      createdBy: currentUser()?.id || "sistema"
    };
    state.academy.payments.push(payment);
    if (payment.paidDate) createPaymentTransaction(payment, student);
    return payment;
  }

  function addPayment(data) {
    const payment = addPaymentRecord(data);
    commit({
      action: "registró",
      entity: "Pago",
      entityId: payment.id,
      detail: `${studentById(payment.studentId)?.name || ""} · ${payment.concept}`
    });
    return payment;
  }

  function createPaymentTransaction(payment, student) {
    if (payment.transactionId) return;
    const tx = {
      id: uid("tx"),
      date: payment.paidDate,
      unitId: "academia",
      type: "income",
      amount: Number(payment.amount || 0),
      category: payment.concept.includes("Inscripción") ? "Inscripciones" : "Cuotas",
      description: `${payment.concept} · ${student?.name || "Alumno"}`,
      source: "academia",
      createdBy: currentUser()?.id || "sistema",
      linkedType: "payment",
      linkedId: payment.id
    };
    state.transactions.push(tx);
    payment.transactionId = tx.id;
  }

  function markPaymentPaid(id, method = "Transferencia", paidDate = todayISO()) {
    const payment = state.academy.payments.find((item) => item.id === id);
    if (!payment) return null;
    const student = studentById(payment.studentId);
    payment.paidDate = paidDate;
    payment.method = method;
    payment.status = "pagado";
    if (!payment.transactionId) createPaymentTransaction(payment, student);
    commit({
      action: "cobró",
      entity: "Pago",
      entityId: payment.id,
      detail: `${student?.name || ""} · ${payment.concept}`
    });
    return payment;
  }

  function markPaymentPending(id) {
    const payment = state.academy.payments.find((item) => item.id === id);
    if (!payment) return null;
    if (payment.transactionId) {
      state.transactions = state.transactions.filter((tx) => tx.id !== payment.transactionId);
    }
    payment.paidDate = null;
    payment.method = "";
    payment.status = "pendiente";
    payment.transactionId = null;
    commit({
      action: "reabrió",
      entity: "Pago",
      entityId: payment.id,
      detail: `${studentById(payment.studentId)?.name || ""} · ${payment.concept}`
    });
    return payment;
  }

  function saveAttendance(cohortId, date, records) {
    const existing = state.academy.attendance.find((item) => item.cohortId === cohortId && item.date === date);
    if (existing) {
      existing.records = records;
      existing.createdBy = currentUser()?.id || "sistema";
      commit({ action: "actualizó", entity: "Asistencia", entityId: cohortId, detail: `${cohortById(cohortId)?.name || ""} · ${date}` });
      return existing;
    }
    const entry = {
      id: uid("att"),
      cohortId,
      date,
      records,
      createdBy: currentUser()?.id || "sistema"
    };
    state.academy.attendance.push(entry);
    commit({ action: "registró", entity: "Asistencia", entityId: cohortId, detail: `${cohortById(cohortId)?.name || ""} · ${date}` });
    return entry;
  }

  function addProduct(data) {
    const product = {
      id: uid("pr"),
      name: data.name,
      sku: data.sku || "",
      category: data.category || "Producto",
      cost: Number(data.cost || 0),
      price: Number(data.price || 0),
      stock: Number(data.stock || 0),
      min: Number(data.min || 0),
      unitId: data.unitId || "productos"
    };
    state.academy.products.push(product);
    commit({ action: "creó", entity: "Producto", entityId: product.id, detail: product.name });
    return product;
  }

  function updateProduct(id, data) {
    const product = productById(id);
    if (!product) return null;
    Object.assign(product, {
      name: data.name || product.name,
      sku: data.sku !== undefined ? data.sku : product.sku,
      category: data.category || product.category,
      cost: data.cost !== undefined ? Number(data.cost) : product.cost,
      price: data.price !== undefined ? Number(data.price) : product.price,
      min: data.min !== undefined ? Number(data.min) : product.min,
      unitId: data.unitId || product.unitId
    });
    commit({ action: "editó", entity: "Producto", entityId: id, detail: product.name });
    return product;
  }

  function stockMove(data) {
    const product = productById(data.productId);
    if (!product) return null;
    const qty = Math.max(0, Math.round(Number(data.qty || 0)));
    if (!qty) return null;
    if (["salida", "venta"].includes(data.type) && qty > product.stock) {
      throw new Error("No hay stock suficiente para esa salida.");
    }
    const move = {
      id: uid("sm"),
      productId: product.id,
      type: data.type || "entrada",
      qty,
      date: data.date || todayISO(),
      note: data.note || "",
      userId: currentUser()?.id || "sistema",
      transactionId: null
    };
    if (move.type === "entrada") product.stock += qty;
    else if (move.type === "ajuste") product.stock = qty;
    else product.stock -= qty;
    if (move.type === "venta") {
      const price = Number(data.price || product.price);
      const tx = addTxInternal({
        date: move.date,
        unitId: product.unitId || "productos",
        type: "income",
        amount: price * qty,
        category: "Venta de producto",
        description: `${product.name} · ${qty} unidad${qty > 1 ? "es" : ""}`,
        source: "stock",
        linkedType: "stock",
        linkedId: move.id
      });
      move.transactionId = tx.id;
      move.price = price;
    }
    state.academy.stockMoves.unshift(move);
    commit({
      action: move.type === "venta" ? "vendió" : "movió",
      entity: "Stock",
      entityId: product.id,
      detail: `${product.name} · ${move.type} ${qty}`
    });
    return move;
  }

  function addTxInternal(data) {
    const tx = {
      id: uid("tx"),
      date: data.date || todayISO(),
      unitId: data.unitId,
      type: data.type === "cost" ? "cost" : "income",
      amount: Math.round(Number(data.amount || 0)),
      category: data.category,
      description: data.description,
      source: data.source || "manual",
      createdBy: currentUser()?.id || "sistema",
      linkedType: data.linkedType || null,
      linkedId: data.linkedId || null
    };
    state.transactions.push(tx);
    return tx;
  }

  /* ---------------- ajustes / datos ---------------- */

  function saveSettings(data) {
    Object.assign(state.settings, {
      businessName: data.businessName || state.settings.businessName,
      contentGoal: Math.max(1, Number(data.contentGoal || state.settings.contentGoal)),
      pointsContent: Math.max(0, Number(data.pointsContent || state.settings.pointsContent)),
      pointsTraining: Math.max(0, Number(data.pointsTraining || state.settings.pointsTraining)),
      pointsSale: Math.max(0, Number(data.pointsSale || state.settings.pointsSale)),
      strikeLimit: Math.max(1, Number(data.strikeLimit || state.settings.strikeLimit)),
      strikeExpiryDays: Math.max(1, Number(data.strikeExpiryDays || state.settings.strikeExpiryDays)),
      monthlyGoal: Number(data.monthlyGoal || state.settings.monthlyGoal)
    });
    commit({ action: "editó", entity: "Configuración", entityId: "settings", detail: "Parámetros generales" });
  }

  function exportData() {
    return JSON.stringify(state, null, 2);
  }

  function importData(raw) {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.users) || !Array.isArray(parsed.units)) {
      throw new Error("El archivo no tiene el formato de MASIVO Control.");
    }
    state = parsed;
    normalize();
    persist();
    log("importó", "Datos", "backup", "Restauración completa desde archivo");
    persist();
    return true;
  }

  function resetData() {
    state = window.MasivoData.createSeed();
    persist();
    log("reinició", "Datos", "demo", "Datos de demostración restaurados");
    persist();
    return true;
  }

  function storageInfo() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || "";
      return { bytes: new Blob([raw]).size, updatedAt: state.updatedAt };
    } catch {
      return { bytes: 0, updatedAt: state.updatedAt };
    }
  }

  window.MasivoStore = {
    getState: () => state,
    currentUser,
    currentUserId: () => currentUser()?.id || null,
    setSession,
    clearSession,
    can,
    isOwner,
    isBarber,
    roleLabel,
    log,
    userById,
    unitById,
    trainingById,
    checklistById,
    studentById,
    cohortById,
    leadById,
    productById,
    barbers,
    managers,
    team,
    transactionsForMonth,
    unitSummary,
    totalsForMonth,
    monthlySeries,
    unitSeries,
    manualBilling,
    userPoints,
    activeStrikes,
    strikeState,
    contentForWeek,
    contentStats,
    contentOverview,
    averageContentCompliance,
    trainingStats,
    tasksFor,
    openTasks,
    overdueTasks,
    barberStats,
    paymentState,
    paymentsForMonth,
    paymentsCollected,
    paymentsPending,
    overduePayments,
    activeStudents,
    cohortStudents,
    cohortSummary,
    attendanceRate,
    studentAttendance,
    academyMetrics,
    weeklyLeads,
    lowStock,
    stockValue,
    alerts,
    ownerSummary,
    weekSummary,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    upsertUnit,
    toggleUnit,
    upsertUser,
    toggleUser,
    updateRoles,
    addTask,
    updateTask,
    setTaskStatus,
    deleteTask,
    saveChecklistRun,
    addMeeting,
    addContentPiece,
    advanceContent,
    deleteContentPiece,
    awardPoints,
    addStrike,
    respondStrike,
    archiveStrike,
    addReport,
    addTraining,
    saveTrainingRecord,
    addLead,
    updateLead,
    moveLead,
    addCohort,
    addStudent,
    enrollLead,
    addPayment,
    markPaymentPaid,
    markPaymentPending,
    saveAttendance,
    addProduct,
    updateProduct,
    stockMove,
    saveSettings,
    exportData,
    importData,
    resetData,
    storageInfo,
    monthOf
  };
})();
