/* ============================================================
   MASIVO CONTROL — Conexión con Supabase
   ------------------------------------------------------------
   Pegá acá los datos del proyecto (Dashboard → Project Settings → API):

     url      = Project URL        (https://xxxxxxxx.supabase.co)
     anonKey  = anon public key    (empieza con eyJ...)

   Mientras estén vacíos, el panel funciona como siempre: todo
   queda guardado en este dispositivo (localStorage).

   La anon key es pública: puede viajar en el navegador. La
   seguridad real vive en la base (RLS + RPCs con permisos),
   por eso el acceso directo a las tablas está revocado.
   ============================================================ */

window.MASIVO_SUPABASE = {
  url: "",
  anonKey: ""
};
