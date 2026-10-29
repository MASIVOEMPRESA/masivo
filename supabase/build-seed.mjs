/* Genera supabase/seed/0001_initial_data.sql a partir del seed del panel.
   Uso: node supabase/build-seed.mjs */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);

globalThis.window = {};
require("../js/admin-data.js");

const seed = globalThis.window.MasivoData.createSeed();

/* El seed del panel no trae la matriz de permisos: la agrega normalize()
   en el navegador. Acá la fijamos para que el servidor pueda autorizar
   desde el primer login, sin esperar al primer guardado. */
seed.permissions = {
  owner: ["*"],
  manager: ["resumen", "equipo", "barberos", "operacion", "contenido", "capacitaciones", "puntos", "academia"],
  academy: ["resumen", "contenido", "capacitaciones", "academia", "academia.pagos", "academia.metricas"],
  barber: ["self"]
};

/* El dueño arranca con el usuario que ya usa en el panel. */
const owner = seed.users.find((user) => user.role === "owner");
if (owner) {
  owner.username = "aitorvalerio";
  owner.name = "Aitor Valerio";
  owner.initials = "AV";
}

const json = JSON.stringify(seed);
const escaped = json.replace(/'/g, "''");

const sql = `/* ============================================================
   MASIVO CONTROL — Datos iniciales (demo) + usuarios del equipo
   Generado por supabase/build-seed.mjs — no editar a mano.
   ============================================================ */

insert into public.app_state (id, data, version, updated_at)
values ('main', '${escaped}'::jsonb, 0, now())
on conflict (id) do nothing;

/* Convierte las claves demo en bcrypt y borra el texto plano. */
select public.app_rehash_plain_passwords();
`;

writeFileSync(new URL("./seed/0001_initial_data.sql", import.meta.url), sql, "utf8");
console.log(`seed listo: ${(sql.length / 1024).toFixed(0)} KB · ${seed.users.length} usuarios`);
