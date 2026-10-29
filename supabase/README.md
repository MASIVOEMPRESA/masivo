# Panel interno sobre Supabase

El panel de `/admin` funciona de dos maneras:

- **Sin configurar**: todo se guarda en el navegador (`localStorage`). Es el modo actual.
- **Con Supabase**: usuarios, claves y datos viven en la nube y se sincronizan entre la compu y el celular.

## Puesta en marcha (una sola vez)

1. Crear un proyecto en [supabase.com](https://supabase.com/dashboard) (región `sa-east-1` o `us-east-1`).
2. Abrir **SQL Editor** y ejecutar, en este orden:
   1. `migrations/0001_admin_panel.sql` — tablas, sesiones y RPCs.
   2. `seed/0001_initial_data.sql` — usuarios del equipo con claves bcrypt + datos demo.
3. Ir a **Project Settings → API** y copiar:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public key** (`eyJ...`)
4. Pegarlos en `js/supabase-config.js`:

   ```js
   window.MASIVO_SUPABASE = {
     url: "https://xxxx.supabase.co",
     anonKey: "eyJ..."
   };
   ```

5. Commit + push a `main`. Vercel despliega solo.
6. Entrar a `/admin`, iniciar sesión y, si el panel pregunta, elegir
   **“Subir los datos de este dispositivo”** para mandar lo que ya había
   cargado en esa compu.

## Cómo está armado

| Pieza | Qué hace |
| --- | --- |
| `app_state` | Una fila (`id = 'main'`) con todo el estado del panel en JSON + `version`. |
| `app_sessions` | Sesiones por dispositivo. El token viaja al navegador; en la base se guarda su hash SHA-256, con vencimiento a 60 días. |
| `app_login` | Valida usuario + `crypt(password, passwordHash)` con bcrypt. Devuelve token y estado. |
| `app_session` | Restaura la sesión al abrir el panel. |
| `app_save_state` | Guarda el estado y sube la versión. |
| `app_logout` | Borra la sesión del servidor. |

### Seguridad

- Las tablas tienen RLS y **no** están expuestas: `anon` no puede leer ni escribir directo.
- Todo pasa por funciones `SECURITY DEFINER`.
- Las claves se guardan con **bcrypt** (`pgcrypto`), nunca en texto plano.
- El estado que baja al navegador nunca incluye `passwordHash`.
- Los permisos se revalidan en el servidor: un barbero o encargado que
  conozca la anon key **no** puede cambiar usuarios, claves, permisos ni
  parámetros; esas partes las conserva el servidor si el rol no las tiene.
- Queda siempre al menos un dueño activo (la base rechaza el guardado si no).

### Sincronización

- Cada cambio se guarda al instante en el navegador y se empuja a la nube
  ~600 ms después (debounce).
- El panel consulta la nube cada 20 s y al volver a la pestaña; si la versión
  cambió, refresca la vista y avisa.
- Si se corta internet, el chip muestra el estado y reintenta cada 6 s.
- La nube es la fuente de verdad: la copia local es solo caché para abrir rápido.

## Regenerar el seed

Si cambian los datos demo o los usuarios iniciales:

```bash
node supabase/build-seed.mjs
```

Genera `seed/0001_initial_data.sql` a partir de `js/admin-data.js`
(usuario dueño `aitorvalerio` / clave `masivo`).
