-- MatchWise database schema
-- Project: matchwise (org "Matchwize", region ap-southeast-2)
-- Applied via migrations: create_matchwise_profiles, matchwise_profile_functions
--
-- Security model
-- --------------
-- Row-level security is ON and there are deliberately NO policies, so the
-- anon/publishable key cannot touch this table directly. All access goes
-- through the two SECURITY DEFINER functions below. That means nobody can
-- list the table or enumerate share codes in bulk; they would have to guess
-- an 8-character code out of ~1.1e12 combinations, one HTTP call at a time.

create table if not exists public.profiles (
  code        text primary key,
  name        text not null,
  lang        text not null default 'en',
  answers     jsonb not null,
  app_version int  not null default 2,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '6 months',
  views       int  not null default 0,
  constraint name_len     check (char_length(name) between 1 and 60),
  constraint lang_ok      check (lang in ('en','ar')),
  constraint answers_obj  check (jsonb_typeof(answers) = 'object'),
  constraint answers_size check (pg_column_size(answers) < 20000)
);

create index if not exists profiles_expires_at_idx on public.profiles (expires_at);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;

-- ---------------------------------------------------------------- helpers --

create or replace function public.mw_normalize_code(p_code text)
returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

-- 8 characters from a 31-symbol alphabet; 0/O and 1/I/L are omitted so a code
-- can be read over the phone or copied off a screenshot without ambiguity.
create or replace function public.mw_random_code()
returns text language plpgsql volatile as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  n        constant int  := char_length(alphabet);
  out_code text := '';
  i        int;
begin
  for i in 1..8 loop
    out_code := out_code || substr(alphabet, 1 + floor(random() * n)::int, 1);
  end loop;
  return out_code;
end;
$$;

-- ---------------------------------------------------------------- public ---

create or replace function public.create_profile(
  p_name text, p_lang text, p_answers jsonb
) returns text
language plpgsql security definer set search_path = public as $$
declare
  new_code text;
  tries    int := 0;
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'answers must be a JSON object';
  end if;
  if (select count(*) from jsonb_object_keys(p_answers)) not between 1 and 200 then
    raise exception 'answers must contain between 1 and 200 entries';
  end if;

  loop
    tries := tries + 1;
    new_code := mw_random_code();
    begin
      insert into profiles (code, name, lang, answers)
      values (new_code, btrim(p_name), coalesce(p_lang, 'en'), p_answers);
      return new_code;
    exception when unique_violation then
      if tries >= 8 then raise exception 'could not allocate a share code'; end if;
    end;
  end loop;
end;
$$;

create or replace function public.get_profile(p_code text)
returns table (
  code text, name text, lang text,
  answers jsonb, created_at timestamptz, expires_at timestamptz
)
language plpgsql security definer set search_path = public as $$
declare
  wanted text := mw_normalize_code(p_code);
begin
  if char_length(wanted) <> 8 then return; end if;

  update profiles p set views = p.views + 1
   where p.code = wanted and p.expires_at > now();

  return query
    select p.code, p.name, p.lang, p.answers, p.created_at, p.expires_at
      from profiles p
     where p.code = wanted and p.expires_at > now();
end;
$$;

-- Not exposed to clients. Run manually, or schedule with pg_cron.
create or replace function public.purge_expired_profiles()
returns int language plpgsql security definer set search_path = public as $$
declare removed int;
begin
  delete from profiles where expires_at <= now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.create_profile(text, text, jsonb) from public;
revoke all on function public.get_profile(text)                 from public;
revoke all on function public.purge_expired_profiles()          from public, anon, authenticated;

grant execute on function public.create_profile(text, text, jsonb) to anon, authenticated;
grant execute on function public.get_profile(text)                 to anon, authenticated;
