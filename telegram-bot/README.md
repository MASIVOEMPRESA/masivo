# Telegram ↔ OpenCode

Puente para mandarle instrucciones a OpenCode desde Telegram, con la Mac prendida.

## Qué hace

- Escucha mensajes de Telegram.
- Solo acepta el chat o los chats configurados en `TELEGRAM_CHAT_ID`.
- Ejecuta cada instrucción con `opencode run` dentro de este proyecto.
- Mantiene una sesión fija, así conserva el contexto entre mensajes.
- Devuelve la respuesta de OpenCode al chat.

## Puesta en marcha

1. En Telegram, hablá con **@BotFather**:
   - `/newbot`
   - Elegí nombre y usuario.
   - Copiá el token.

2. Creá el archivo de configuración:

   ```sh
   cd telegram-bot
   cp .env.example .env
   ```

3. Editá `.env` y pegá el token en `TELEGRAM_BOT_TOKEN`.
   Dejá `TELEGRAM_CHAT_ID` vacío por ahora.

4. Arrancá el bot:

   ```sh
   chmod +x start.sh install-service.sh
   ./start.sh
   ```

5. Desde tu celular, abrí el bot y mandá `/start`.
   Te va a responder con tu **chat ID**.

6. Poné ese número en `TELEGRAM_CHAT_ID` y reiniciá el bot.

7. Opcional: instalarlo como servicio para que arranque solo:

   ```sh
   ./install-service.sh
   ```

## Comandos

- `/nuevo [título]` — crea una sesión nueva.
- `/estado` — muestra sesión, modelo y proyecto.
- `/modelo proveedor/modelo` — fija un modelo.
- `/modelo auto` — vuelve al modelo por defecto.
- `/cancelar` — interrumpe la tarea actual.
- `/ayuda` — lista de comandos.

Todo lo que no sea un comando se envía a OpenCode como instrucción.

## Seguridad

- `AUTO_APPROVE=1` permite que OpenCode ejecute comandos y edite archivos sin pedir confirmación. Es cómodo, pero solo debe usarse con un chat propio y el token guardado en local.
- Si querés aprobar a mano, poné `AUTO_APPROVE=0`; en ese caso la ejecución puede quedar esperando confirmación en OpenCode.
- No compartas `.env` ni el token. Están excluidos de git.

## Notas

- Si el modelo gratuito llega al límite, usá `/modelo proveedor/modelo` con un modelo pago o configurá `MODEL` en `.env`.
- La Mac tiene que estar encendida y con internet. `start.sh` usa `caffeinate` para evitar la suspensión por inactividad.
- Los logs quedan en `bridge.log` y `service.log`.
