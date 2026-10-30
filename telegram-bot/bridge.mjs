#!/usr/bin/env node
/**
 * MASIVO · puente Telegram ↔ OpenCode
 *
 * Recibe mensajes de Telegram (solo del chat autorizado) y los ejecuta
 * con `opencode run` en el proyecto, manteniendo una sesión fija.
 *
 * Sin dependencias externas. Requiere Node 18+ y OpenCode instalado.
 */

import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ---------------- configuración ---------------- */

function loadEnv() {
  const file = path.join(__dirname, ".env");
  if (!fs.existsSync(file)) return {};
  const out = {};
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line) => {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) return;
    const index = clean.indexOf("=");
    if (index < 1) return;
    const key = clean.slice(0, index).trim();
    let value = clean.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  });
  return out;
}

const env = loadEnv();

const BOT_TOKEN = String(env.TELEGRAM_BOT_TOKEN || "").trim();
const ALLOWED = String(env.TELEGRAM_CHAT_ID || "")
  .split(/[,\s]+/)
  .map((item) => item.trim())
  .filter(Boolean);
const PROJECT_DIR = path.resolve(env.PROJECT_DIR || path.join(__dirname, ".."));
const OPENCODE_BIN = env.OPENCODE_BIN || "/Users/ividella/.local/bin/opencode";
const DEFAULT_MODEL = String(env.MODEL || "").trim();
const DEFAULT_AGENT = String(env.AGENT || "").trim();
const AUTO_APPROVE = String(env.AUTO_APPROVE ?? "1") !== "0";
const MAX_OUTPUT = Math.max(1000, Number(env.MAX_OUTPUT || 9000));
const STATE_FILE = path.join(process.env.HOME || __dirname, "Library/Application Support/masivo-telegram-bot-state.json");
const LOG_FILE = process.env.MASIVO_LOG || path.join(process.env.HOME || __dirname, "Library/Logs/masivo-telegram-bot.log");
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

/* ---------------- estado ---------------- */

function loadState() {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    return {
      sessionId: typeof raw.sessionId === "string" ? raw.sessionId : "",
      model: typeof raw.model === "string" ? raw.model : "",
      lastUpdateId: Number(raw.lastUpdateId || 0)
    };
  } catch {
    return { sessionId: "", model: "", lastUpdateId: 0 };
  }
}

const state = loadState();

function saveState() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    log(`No se pudo guardar state.json: ${error.message}`);
  }
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch {
    /* sin log a disco */
  }
}

/* ---------------- telegram ---------------- */

async function telegram(method, payload = {}) {
  const response = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!data.ok) {
    throw new Error(data.description || `Telegram ${method} falló`);
  }
  return data.result;
}

async function sendMessage(chatId, text, extra = {}) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text: String(text || "").slice(0, 4096),
    disable_web_page_preview: true,
    ...extra
  });
}

async function editMessage(chatId, messageId, text) {
  return telegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: String(text || "").slice(0, 4096),
    disable_web_page_preview: true
  });
}

function split(text, size = 3800) {
  const chunks = [];
  let rest = String(text || "");
  while (rest.length > size) {
    let cut = rest.lastIndexOf("\n", size);
    if (cut < size * 0.5) cut = size;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n+/, "");
  }
  if (rest) chunks.push(rest);
  return chunks.length ? chunks : ["(sin salida)"];
}

async function deliver(chatId, messageId, text) {
  const chunks = split(text);
  await editMessage(chatId, messageId, chunks[0]);
  for (const chunk of chunks.slice(1)) {
    await sendMessage(chatId, chunk);
  }
}

/* ---------------- opencode ---------------- */

async function opencodeApi(method, endpoint, body) {
  const args = ["api", method, endpoint];
  if (body !== undefined) args.push("--data", JSON.stringify(body));
  const { stdout } = await execFileAsync(OPENCODE_BIN, args, {
    cwd: PROJECT_DIR,
    maxBuffer: 20 * 1024 * 1024,
    env: process.env
  });
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

async function createSession(title) {
  const payload = {
    title: title || `Telegram · ${new Date().toLocaleString("es-AR")}`,
    location: { directory: PROJECT_DIR }
  };
  const result = await opencodeApi("post", "/api/session", payload);
  const id = result?.data?.id || result?.id;
  if (!id) throw new Error("OpenCode no devolvió el ID de la sesión.");
  state.sessionId = id;
  saveState();
  return id;
}

async function ensureSession() {
  if (state.sessionId) {
    try {
      const result = await opencodeApi("get", `/api/session/${encodeURIComponent(state.sessionId)}`);
      const session = result?.data || result;
      if (session?.location?.directory === PROJECT_DIR) return state.sessionId;
      log(`La sesión ${state.sessionId} no pertenece al proyecto. Se crea una nueva.`);
    } catch {
      log(`La sesión ${state.sessionId} no existe. Se crea una nueva.`);
    }
  }
  return createSession("Telegram · MASIVO");
}

function cleanOutput(value) {
  return String(value || "")
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\r/g, "")
    .trim();
}

function runOpencode(text, onSpawn) {
  return new Promise((resolve) => {
    const args = ["run", "--session", state.sessionId];
    if (AUTO_APPROVE) args.push("--auto");
    if (state.model) args.push("--model", state.model);
    else if (DEFAULT_MODEL) args.push("--model", DEFAULT_MODEL);
    if (DEFAULT_AGENT) args.push("--agent", DEFAULT_AGENT);
    args.push(text);

    log(`Ejecutando: ${text.slice(0, 120)}`);
    const child = spawn(OPENCODE_BIN, args, {
      cwd: PROJECT_DIR,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    if (onSpawn) onSpawn(child);

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (stdout.length > 400000) stdout = stdout.slice(-200000);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (stderr.length > 200000) stderr = stderr.slice(-100000);
    });
    child.on("error", (error) => resolve({ ok: false, output: "", error: error.message }));
    child.on("close", (code, signal) => {
      if (signal === "SIGTERM" || signal === "SIGKILL") {
        resolve({ ok: false, output: "", error: "Cancelado." });
        return;
      }
      const output = cleanOutput(stdout);
      const err = cleanOutput(stderr);
      if (code === 0) resolve({ ok: true, output });
      else resolve({ ok: false, output, error: err || `OpenCode terminó con código ${code}.` });
    });
  });
}

/* ---------------- comandos ---------------- */

const HELP = `🤖 MASIVO · OpenCode por Telegram

Mandame una instrucción y la ejecuto en la PC.

Comandos:
/nuevo [título] — sesión nueva
/estado — sesión, modelo y modo actual
/modelo proveedor/modelo — fijar modelo
/modelo auto — usar el modelo por defecto
/cancelar — frenar la tarea en curso
/ayuda — esta lista

Todo corre en:
${PROJECT_DIR}`;

async function handleCommand(chatId, command, rest) {
  if (command === "/start" || command === "/ayuda" || command === "/help") {
    await sendMessage(chatId, `${HELP}\n\nTu chat ID: ${chatId}`);
    return true;
  }
  if (command === "/estado" || command === "/status") {
    await ensureSession();
    await sendMessage(
      chatId,
      [
        "📊 Estado",
        `Sesión: ${state.sessionId}`,
        `Modelo: ${state.model || DEFAULT_MODEL || "el configurado en OpenCode"}`,
        `Permisos: ${AUTO_APPROVE ? "auto-aprobados" : "manuales"}`,
        `Proyecto: ${PROJECT_DIR}`
      ].join("\n")
    );
    return true;
  }
  if (command === "/nuevo" || command === "/new") {
    const title = rest.join(" ").trim();
    await createSession(title || undefined);
    await sendMessage(chatId, `🆕 Sesión nueva creada.\n${state.sessionId}`);
    return true;
  }
  if (command === "/modelo" || command === "/model") {
    const value = rest.join(" ").trim();
    if (!value || value === "auto" || value === "default") {
      state.model = "";
      saveState();
      await sendMessage(chatId, "Modelo restablecido al predeterminado de OpenCode.");
      return true;
    }
    state.model = value;
    saveState();
    await sendMessage(chatId, `Modelo fijado: ${value}`);
    return true;
  }
  if (command === "/cancelar" || command === "/cancel" || command === "/stop") {
    try {
      await opencodeApi("post", `/api/session/${encodeURIComponent(state.sessionId)}/interrupt`);
    } catch (error) {
      log(`Interrupt falló: ${error.message}`);
    }
    if (activeChild) {
      try {
        activeChild.kill("SIGTERM");
      } catch {
        /* ya terminó */
      }
    }
    await sendMessage(chatId, "⏹️ Cancelado.");
    return true;
  }
  return false;
}

/* ---------------- cola ---------------- */

const queue = [];
let busy = false;
let activeChild = null;

async function processQueue() {
  if (busy || !queue.length) return;
  busy = true;
  const item = queue.shift();
  let placeholder = null;
  let typing = null;

  try {
    await ensureSession();
    placeholder = await sendMessage(item.chatId, "🧠 Trabajando…");
    typing = setInterval(() => {
      telegram("sendChatAction", { chat_id: item.chatId, action: "typing" }).catch(() => {});
    }, 4200);

    const result = await runOpencode(item.text, (child) => {
      activeChild = child;
    });

    if (typing) clearInterval(typing);
    typing = null;

    if (result.ok) {
      const output = result.output || "✅ Listo.";
      await deliver(item.chatId, placeholder.message_id, output.slice(0, MAX_OUTPUT));
      if (output.length > MAX_OUTPUT) {
        await sendMessage(item.chatId, `…salida recortada. La sesión completa está en OpenCode: ${state.sessionId}`);
      }
    } else {
      await deliver(item.chatId, placeholder.message_id, `⚠️ ${result.error}\n\n${result.output || ""}`.trim());
    }
  } catch (error) {
    log(`Error procesando mensaje: ${error.stack || error.message}`);
    try {
      if (placeholder) await editMessage(item.chatId, placeholder.message_id, `⚠️ ${error.message}`);
      else await sendMessage(item.chatId, `⚠️ ${error.message}`);
    } catch {
      /* sin respuesta */
    }
  } finally {
    if (typing) clearInterval(typing);
    activeChild = null;
    busy = false;
    if (queue.length) setTimeout(processQueue, 250);
  }
}

/* ---------------- loop de Telegram ---------------- */

async function handleUpdate(update) {
  const message = update.message;
  if (!message || !message.text) return;
  const chatId = String(message.chat?.id || "");
  const text = String(message.text || "").trim();
  if (!text) return;

  if (!ALLOWED.includes(chatId)) {
    await sendMessage(
      chatId,
      `⛔ Este chat no está autorizado.\n\nTu chat ID es: ${chatId}\nAgregalo en TELEGRAM_CHAT_ID del archivo .env y reiniciá el bot.`
    );
    log(`Chat no autorizado: ${chatId}`);
    return;
  }

  const [rawCommand, ...rest] = text.split(/\s+/);
  const command = rawCommand.toLowerCase().replace(/@\w+$/, "");
  if (command.startsWith("/")) {
    const handled = await handleCommand(chatId, command, rest);
    if (!handled) await sendMessage(chatId, "Comando no reconocido. Probá /ayuda.");
    return;
  }

  queue.push({ chatId, text });
  if (busy) {
    await sendMessage(chatId, `⏳ En cola (${queue.length}). Cuando termine la tarea actual sigo con esta.`);
  } else {
    processQueue();
  }
}

async function poll() {
  log("Bot iniciado. Esperando mensajes…");
  if (!ALLOWED.length) log("⚠️ TELEGRAM_CHAT_ID vacío: solo responderá el chat ID para configurarlo.");
  await ensureSession().catch((error) => log(`No se pudo crear la sesión inicial: ${error.message}`));

  let offset = state.lastUpdateId ? state.lastUpdateId + 1 : undefined;
  for (;;) {
    try {
      const updates = await telegram("getUpdates", {
        offset,
        timeout: 50,
        allowed_updates: ["message"]
      });
      for (const update of updates) {
        offset = update.update_id + 1;
        state.lastUpdateId = update.update_id;
        saveState();
        await handleUpdate(update);
      }
    } catch (error) {
      log(`getUpdates: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

/* ---------------- arranque ---------------- */

if (!BOT_TOKEN) {
  console.error("Falta TELEGRAM_BOT_TOKEN en telegram-bot/.env");
  process.exit(1);
}

if (!fs.existsSync(PROJECT_DIR)) {
  console.error(`No existe PROJECT_DIR: ${PROJECT_DIR}`);
  process.exit(1);
}

process.on("SIGINT", () => {
  log("Detenido por SIGINT.");
  process.exit(0);
});
process.on("SIGTERM", () => {
  log("Detenido por SIGTERM.");
  process.exit(0);
});

poll();
