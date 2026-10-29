/* ============================================================
   MASIVO CONTROL — Conector con Supabase
   Login, sesión y guardado del estado compartido vía RPC.
   Sin dependencias: usa fetch contra /rest/v1/rpc.
   ============================================================ */

(() => {
  "use strict";

  const config = window.MASIVO_SUPABASE || {};
  const base = String(config.url || "").replace(/\/+$/, "");
  const anonKey = String(config.anonKey || "");
  const TOKEN_KEY = "masivo.cloud.token.v1";
  const TIMEOUT = 15000;

  const remote = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(base);
  const localDev = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base);
  const enabled = (remote || localDev) && anonKey.length > 20 && !/^(pegar|tu-|aqui)/i.test(anonKey);

  let status = enabled ? "idle" : "local";
  let lastError = "";
  let lastSyncAt = 0;
  let inFlight = 0;

  /* ---------------- token del dispositivo ---------------- */

  function token() {
    try {
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch {
      return "";
    }
  }

  function setToken(value) {
    try {
      if (value) localStorage.setItem(TOKEN_KEY, value);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      // sin almacenamiento: la sesión vive solo en memoria
    }
  }

  /* ---------------- estado para la UI ---------------- */

  function setStatus(next, error = "") {
    status = next;
    lastError = error;
    if (next === "online") lastSyncAt = Date.now();
    window.dispatchEvent(new CustomEvent("masivo:cloud-status", { detail: { status, lastError, lastSyncAt } }));
  }

  function info() {
    return { enabled, status, lastError, lastSyncAt, online: status !== "offline" && status !== "error" };
  }

  /* ---------------- transporte ---------------- */

  async function rpc(name, params = {}) {
    if (!enabled) throw new Error("supabase_disabled");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    inFlight += 1;

    try {
      const response = await fetch(`${base}/rest/v1/rpc/${name}`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`
        },
        body: JSON.stringify(params)
      });

      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message = data?.message || data?.hint || `HTTP ${response.status}`;
        throw new Error(message);
      }
      return data;
    } finally {
      clearTimeout(timer);
      inFlight -= 1;
    }
  }

  /* ---------------- operaciones ---------------- */

  async function login(username, password) {
    try {
      const data = await rpc("app_login", { p_username: username, p_password: password });
      if (!data || !data.ok) {
        setStatus("online");
        return { ok: false, error: data?.error || "invalid_credentials" };
      }
      setToken(data.token);
      setStatus("online");
      return { ok: true, token: data.token, state: data.state, version: data.version, userId: data.userId };
    } catch (error) {
      setStatus(navigator.onLine === false ? "offline" : "error", error.message);
      return { ok: false, error: error.message || "network" };
    }
  }

  async function restore() {
    const current = token();
    if (!current) return { ok: false, error: "no_token" };
    try {
      const data = await rpc("app_session", { p_token: current });
      if (!data || !data.ok) {
        setToken("");
        setStatus("online");
        return { ok: false, error: data?.error || "invalid_session" };
      }
      setStatus("online");
      return { ok: true, state: data.state, version: data.version, userId: data.userId, token: current };
    } catch (error) {
      setStatus(navigator.onLine === false ? "offline" : "error", error.message);
      return { ok: false, error: error.message || "network" };
    }
  }

  async function session() {
    const current = token();
    if (!current) return { ok: false, error: "no_token" };
    try {
      const data = await rpc("app_session", { p_token: current });
      if (!data || !data.ok) {
        setStatus("online");
        return { ok: false, error: data?.error || "invalid_session" };
      }
      setStatus("online");
      return { ok: true, state: data.state, version: data.version, userId: data.userId };
    } catch (error) {
      setStatus(navigator.onLine === false ? "offline" : "error", error.message);
      return { ok: false, error: error.message || "network" };
    }
  }

  async function save(state) {
    const current = token();
    if (!current) return { ok: false, error: "no_token" };
    try {
      const data = await rpc("app_save_state", { p_token: current, p_state: state });
      if (!data || !data.ok) {
        setStatus("error", data?.error || "save_failed");
        return { ok: false, error: data?.error || "save_failed" };
      }
      setStatus("online");
      return { ok: true, state: data.state, version: data.version };
    } catch (error) {
      setStatus(navigator.onLine === false ? "offline" : "error", error.message);
      return { ok: false, error: error.message || "network" };
    }
  }

  async function logout() {
    const current = token();
    setToken("");
    if (!current) return;
    try {
      await rpc("app_logout", { p_token: current });
    } catch {
      // el token igual se borró del dispositivo
    }
  }

  window.addEventListener("online", () => {
    if (enabled && status !== "online") setStatus("online");
  });
  window.addEventListener("offline", () => {
    if (enabled) setStatus("offline");
  });

  window.MasivoCloud = {
    enabled,
    base,
    info,
    setStatus,
    token,
    setToken,
    login,
    restore,
    session,
    save,
    logout,
    busy: () => inFlight > 0
  };
})();
