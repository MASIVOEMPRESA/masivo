/* ============================================================
   MASIVO CONTROL — Conexión con Supabase
   ------------------------------------------------------------
   Proyecto: masivo-control (us-west-2)
   Dashboard → Project Settings → API

   La publishable/anon key es pública: puede viajar en el
   navegador. La seguridad real vive en la base (RLS + RPCs con
   permisos), por eso el acceso directo a las tablas está
   revocado y las claves se guardan con bcrypt.

   Para volver al modo "solo este dispositivo", dejá los dos
   campos vacíos.
   ============================================================ */

window.MASIVO_SUPABASE = {
  url: "https://zjfmaoxydakayicgylme.supabase.co",
  anonKey: "sb_publishable_N7tu4_n7H7cIx1rh8SPmFQ_ivsv88Yi"
};
