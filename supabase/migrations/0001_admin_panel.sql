/* ============================================================
   MASIVO CONTROL — Migración del panel interno a Supabase
   ------------------------------------------------------------
   - Estado compartido en una fila JSON (app_state) con versión.
   - Sesiones propias (app_sessions) con token aleatorio hasheado.
   - Contraseñas con bcrypt (pgcrypto), nunca en texto plano.
   - RPCs SECURITY DEFINER: las tablas quedan cerradas para anon.
   - Los permisos se validan en el servidor: un barbero no puede
     editar usuarios ni la matriz de accesos aunque conozca la
     anon key.
   ============================================================ */

create extension if not exists pgcrypto;

/* ---------------- tablas ---------------- */

create table if not exists public.app_state (
  id         text primary key,
  data       jsonb not null,
  version    bigint not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_sessions (
  token_hash   text primary key,
  user_id      text not null,
  username     text not null,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null
);

create index if not exists app_sessions_expires_idx on public.app_sessions (expires_at);

alter table public.app_state enable row level security;
alter table public.app_sessions enable row level security;

revoke all on public.app_state from anon, authenticated;
revoke all on public.app_sessions from anon, authenticated;

/* ---------------- helpers ---------------- */

create or replace function public.app_hash_token(p_token text)
returns text
language sql
immutable
set search_path = public, extensions, pg_temp
as $$
  select encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

/* Saca hashes y contraseñas del estado antes de mandarlo al navegador. */
create or replace function public.app_public_state(p_state jsonb)
returns jsonb
language sql
immutable
as $$
  select jsonb_set(
    p_state,
    '{users}',
    coalesce((
      select jsonb_agg(
        (u - 'password' - 'passwordHash')
        || jsonb_build_object('hasPassword', (u ? 'passwordHash') or (u ? 'password'))
      )
      from jsonb_array_elements(coalesce(p_state -> 'users', '[]'::jsonb)) u
    ), '[]'::jsonb)
  );
$$;

create or replace function public.app_user_for_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_state  jsonb;
  v_user   jsonb;
  v_userid text;
begin
  if coalesce(p_token, '') = '' then
    raise exception 'invalid_session' using errcode = 'P0001';
  end if;

  select s.user_id into v_userid
  from public.app_sessions s
  where s.token_hash = public.app_hash_token(p_token)
    and s.expires_at > now();

  if v_userid is null then
    raise exception 'invalid_session' using errcode = 'P0001';
  end if;

  select data into v_state from public.app_state where id = 'main';
  if v_state is null then
    raise exception 'app_not_initialized' using errcode = 'P0001';
  end if;

  select u into v_user
  from jsonb_array_elements(coalesce(v_state -> 'users', '[]'::jsonb)) u
  where u ->> 'id' = v_userid
    and coalesce((u ->> 'active')::boolean, false)
  limit 1;

  if v_user is null then
    raise exception 'invalid_session' using errcode = 'P0001';
  end if;

  update public.app_sessions
     set last_seen_at = now()
   where token_hash = public.app_hash_token(p_token);

  return v_user;
end;
$$;

/* ¿El usuario puede tocar un módulo? Refleja la matriz del panel. */
create or replace function public.app_can(p_user jsonb, p_module text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_state jsonb;
  v_role  text;
  v_perms jsonb;
begin
  if p_user is null then return false; end if;
  v_role := p_user ->> 'role';
  if v_role = 'owner' then return true; end if;

  select data into v_state from public.app_state where id = 'main';
  v_perms := coalesce(v_state -> 'permissions' -> v_role, '[]'::jsonb);

  if v_perms ? '*' then return true; end if;
  if v_perms ? p_module then return true; end if;

  /* alias: un permiso de academia.pagos también habilita academy.payments */
  if p_module = 'academy.payments' and v_perms ? 'academia.pagos' then return true; end if;
  if p_module = 'academy.metrics'  and v_perms ? 'academia.metricas' then return true; end if;

  return false;
end;
$$;

/* ---------------- sesión ---------------- */

create or replace function public.app_login(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_state   jsonb;
  v_version bigint;
  v_user    jsonb;
  v_token   text;
begin
  if coalesce(trim(p_username), '') = '' or coalesce(p_password, '') = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  end if;

  select data, version into v_state, v_version from public.app_state where id = 'main';
  if v_state is null then
    return jsonb_build_object('ok', false, 'error', 'app_not_initialized');
  end if;

  select u into v_user
  from jsonb_array_elements(coalesce(v_state -> 'users', '[]'::jsonb)) u
  where lower(u ->> 'username') = lower(trim(p_username))
    and coalesce((u ->> 'active')::boolean, false)
    and coalesce(u ->> 'passwordHash', '') <> ''
    and u ->> 'passwordHash' = crypt(p_password, u ->> 'passwordHash')
  limit 1;

  if v_user is null then
    /* mismo mensaje para usuario inexistente y clave incorrecta */
    return jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');

  delete from public.app_sessions where expires_at < now();

  insert into public.app_sessions (token_hash, user_id, username, expires_at)
  values (
    public.app_hash_token(v_token),
    v_user ->> 'id',
    v_user ->> 'username',
    now() + interval '60 days'
  );

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'userId', v_user ->> 'id',
    'version', v_version,
    'state', public.app_public_state(v_state)
  );
end;
$$;

create or replace function public.app_session(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_state   jsonb;
  v_version bigint;
  v_user    jsonb;
begin
  v_user := public.app_user_for_token(p_token);

  select data, version into v_state, v_version from public.app_state where id = 'main';

  return jsonb_build_object(
    'ok', true,
    'userId', v_user ->> 'id',
    'version', v_version,
    'state', public.app_public_state(v_state)
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'invalid_session');
end;
$$;

create or replace function public.app_logout(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  delete from public.app_sessions where token_hash = public.app_hash_token(p_token);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.app_ping(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_version bigint;
begin
  perform public.app_user_for_token(p_token);
  select version into v_version from public.app_state where id = 'main';
  return jsonb_build_object('ok', true, 'version', v_version);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'invalid_session');
end;
$$;

create or replace function public.app_get_state(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_state   jsonb;
  v_version bigint;
begin
  perform public.app_user_for_token(p_token);
  select data, version into v_state, v_version from public.app_state where id = 'main';
  return jsonb_build_object(
    'ok', true,
    'version', v_version,
    'state', public.app_public_state(v_state)
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

/* ---------------- guardado ---------------- */

create or replace function public.app_save_state(p_token text, p_state jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user      jsonb;
  v_current   jsonb;
  v_version   bigint;
  v_next      jsonb;
  v_users     jsonb := '[]'::jsonb;
  v_old_hash  jsonb;
  v_u         jsonb;
  v_new       jsonb;
  v_can_users boolean;
  v_can_perms boolean;
  v_can_cfg   boolean;
begin
  v_user := public.app_user_for_token(p_token);

  select data, version into v_current, v_version from public.app_state where id = 'main' for update;
  if v_current is null then
    raise exception 'app_not_initialized' using errcode = 'P0001';
  end if;

  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;

  v_can_users := public.app_can(v_user, 'config.users');
  v_can_perms := public.app_can(v_user, 'config.permissions');
  v_can_cfg   := public.app_can(v_user, 'config');

  v_next := p_state;

  /* --- usuarios: solo con permiso, hasheando claves nuevas --- */
  if v_can_users then
    select coalesce(jsonb_object_agg(u ->> 'id', u ->> 'passwordHash'), '{}'::jsonb)
      into v_old_hash
      from jsonb_array_elements(coalesce(v_current -> 'users', '[]'::jsonb)) u
     where coalesce(u ->> 'passwordHash', '') <> '';

    for v_u in select * from jsonb_array_elements(coalesce(p_state -> 'users', '[]'::jsonb)) loop
      v_new := v_u - 'password' - 'passwordHash' - 'hasPassword';

      if coalesce(length(v_u ->> 'password'), 0) > 0 then
        v_new := v_new || jsonb_build_object(
          'passwordHash', crypt(v_u ->> 'password', gen_salt('bf', 10))
        );
      elsif v_old_hash ? (v_u ->> 'id') then
        v_new := v_new || jsonb_build_object(
          'passwordHash', v_old_hash ->> (v_u ->> 'id')
        );
      else
        /* usuario sin clave conocida: clave inicial, igual que el panel local */
        v_new := v_new || jsonb_build_object(
          'passwordHash', crypt('masivo', gen_salt('bf', 10))
        );
      end if;

      v_users := v_users || jsonb_build_array(v_new);
    end loop;

    /* no dejar el panel sin dueño activo */
    if not exists (
      select 1 from jsonb_array_elements(v_users) u
       where u ->> 'role' = 'owner' and coalesce((u ->> 'active')::boolean, false)
    ) then
      raise exception 'owner_required' using errcode = 'P0001';
    end if;

    v_next := jsonb_set(v_next, '{users}', v_users);
  else
    v_next := jsonb_set(v_next, '{users}', coalesce(v_current -> 'users', '[]'::jsonb));
  end if;

  /* --- matriz de permisos: solo con permiso --- */
  if v_can_perms then
    v_next := jsonb_set(
      v_next,
      '{permissions}',
      jsonb_set(coalesce(v_next -> 'permissions', '{}'::jsonb), '{owner}', '["*"]'::jsonb)
    );
  else
    v_next := jsonb_set(v_next, '{permissions}', coalesce(v_current -> 'permissions', '{}'::jsonb));
  end if;

  /* --- nombres de jerarquía y parámetros: solo con permiso --- */
  if v_can_cfg then
    v_next := jsonb_set(v_next, '{roles}', coalesce(v_next -> 'roles', '{}'::jsonb));
    v_next := jsonb_set(v_next, '{settings}', coalesce(v_next -> 'settings', '{}'::jsonb));
  else
    v_next := jsonb_set(v_next, '{roles}', coalesce(v_current -> 'roles', '{}'::jsonb));
    v_next := jsonb_set(v_next, '{settings}', coalesce(v_current -> 'settings', '{}'::jsonb));
  end if;

  v_next := jsonb_set(v_next, '{updatedAt}', to_jsonb(now()));
  v_next := jsonb_set(v_next, '{version}', to_jsonb(1));

  insert into public.app_state (id, data, version, updated_at)
  values ('main', v_next, 1, now())
  on conflict (id) do update
    set data = excluded.data,
        version = public.app_state.version + 1,
        updated_at = now()
  returning version into v_version;

  return jsonb_build_object(
    'ok', true,
    'version', v_version,
    'state', public.app_public_state(v_next)
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

/* ---------------- reconciliación de contraseñas heredadas ---------------- */

/* Convierte cualquier 'password' en texto plano que haya quedado en el
   estado (imports viejos) en hash bcrypt y borra el original. */
create or replace function public.app_rehash_plain_passwords()
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_state jsonb;
  v_users jsonb := '[]'::jsonb;
  v_u     jsonb;
  v_new   jsonb;
  v_count integer := 0;
begin
  select data into v_state from public.app_state where id = 'main' for update;
  if v_state is null then return 0; end if;

  for v_u in select * from jsonb_array_elements(coalesce(v_state -> 'users', '[]'::jsonb)) loop
    v_new := v_u - 'hasPassword';
    if coalesce(length(v_u ->> 'password'), 0) > 0 then
      v_new := (v_new - 'password') || jsonb_build_object(
        'passwordHash', crypt(v_u ->> 'password', gen_salt('bf', 10))
      );
      v_count := v_count + 1;
    end if;
    v_users := v_users || jsonb_build_array(v_new);
  end loop;

  update public.app_state
     set data = jsonb_set(data, '{users}', v_users),
         version = version + 1,
         updated_at = now()
   where id = 'main';

  return v_count;
end;
$$;

/* ---------------- permisos de ejecución ---------------- */

/* Los roles anon/authenticated existen en Supabase; en un Postgres
   pelado el bloque se saltea para poder probar la migración igual. */
do $$
declare
  r text;
  fn text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.app_state from %I', r);
      execute format('revoke all on public.app_sessions from %I', r);

      foreach fn in array array[
        'public.app_login(text, text)',
        'public.app_session(text)',
        'public.app_logout(text)',
        'public.app_ping(text)',
        'public.app_get_state(text)',
        'public.app_save_state(text, jsonb)'
      ] loop
        execute format('grant execute on function %s to %I', fn, r);
      end loop;

      execute format('revoke execute on function public.app_public_state(jsonb) from %I', r);
      execute format('revoke execute on function public.app_user_for_token(text) from %I', r);
      execute format('revoke execute on function public.app_can(jsonb, text) from %I', r);
      execute format('revoke execute on function public.app_rehash_plain_passwords() from %I', r);
    end if;
  end loop;
end $$;
