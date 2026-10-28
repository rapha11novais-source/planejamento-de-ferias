begin;
create schema vacation_4p_internal;
revoke all on schema vacation_4p_internal from public;
grant usage on schema vacation_4p_internal to anon,authenticated;

create table public.vacation_4p_2027 (
  id uuid primary key default gen_random_uuid(),
  registration text not null unique check (registration ~ '^[0-9]{4,20}$'),
  name text not null check (char_length(btrim(name)) between 3 and 160),
  first_month smallint not null check (first_month between 1 and 12),
  second_month smallint not null check (second_month between 1 and 12),
  third_month smallint not null check (third_month between 1 and 12),
  edit_hash text not null unique,
  version integer not null default 1 check (version>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (first_month<>second_month and first_month<>third_month and second_month<>third_month)
);
alter table public.vacation_4p_2027 enable row level security;
revoke all on public.vacation_4p_2027 from public,anon,authenticated;
grant select(id,registration,name,first_month,second_month,third_month,version,created_at,updated_at) on public.vacation_4p_2027 to authenticated;
create policy organizer_read on public.vacation_4p_2027 for select to authenticated using (
  (select auth.uid()) is not null and lower((select auth.jwt())->>'email')='rapha11novais@gmail.com'
);

-- Anonymous respondents prove ownership with a 256-bit personal token, rather than an account.
-- Privileged implementations stay outside the exposed public schema; no arbitrary SQL is executed.
create function vacation_4p_internal.load(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.vacation_4p_2027;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Link pessoal inválido.'; end if;
  select * into r from public.vacation_4p_2027 where edit_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found then return null; end if;
  return jsonb_build_object('name',r.name,'registration',r.registration,'firstMonth',r.first_month,'secondMonth',r.second_month,'thirdMonth',r.third_month,'version',r.version,'updatedAt',r.updated_at);
end;
$$;
revoke all on function vacation_4p_internal.load(text) from public;
grant execute on function vacation_4p_internal.load(text) to anon,authenticated;

create function vacation_4p_internal.save(p_entry jsonb,p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.vacation_4p_2027; v integer; n text; matricula text; m1 integer; m2 integer; m3 integer; token_hash text;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Link pessoal inválido.'; end if;
  if p_entry is null or jsonb_typeof(p_entry)<>'object' or octet_length(p_entry::text)>3000 then raise exception 'Dados inválidos.'; end if;
  if jsonb_typeof(p_entry->'name') is distinct from 'string' or jsonb_typeof(p_entry->'registration') is distinct from 'string' then raise exception 'Informe nome completo e matrícula.'; end if;
  n=btrim(p_entry->>'name'); matricula=btrim(p_entry->>'registration');
  if char_length(n) not between 3 and 160 or matricula !~ '^[0-9]{4,20}$' then raise exception 'Confira o nome completo e a matrícula.'; end if;
  if jsonb_typeof(p_entry->'version') is distinct from 'number' or (p_entry->>'version') !~ '^[0-9]{1,9}$' then raise exception 'Versão inválida. Recarregue sua resposta.'; end if;
  if jsonb_typeof(p_entry->'firstMonth') is distinct from 'number' or jsonb_typeof(p_entry->'secondMonth') is distinct from 'number' or jsonb_typeof(p_entry->'thirdMonth') is distinct from 'number' then raise exception 'Selecione as três opções de meses.'; end if;
  if (p_entry->>'firstMonth') !~ '^([1-9]|1[0-2])$' or (p_entry->>'secondMonth') !~ '^([1-9]|1[0-2])$' or (p_entry->>'thirdMonth') !~ '^([1-9]|1[0-2])$' then raise exception 'Escolha meses de janeiro a dezembro.'; end if;
  v=(p_entry->>'version')::integer; m1=(p_entry->>'firstMonth')::integer; m2=(p_entry->>'secondMonth')::integer; m3=(p_entry->>'thirdMonth')::integer;
  if m1=m2 or m1=m3 or m2=m3 then raise exception 'Escolha três meses distintos, em ordem de preferência.'; end if;
  token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if v=0 then
    insert into public.vacation_4p_2027(registration,name,first_month,second_month,third_month,edit_hash)
    values(matricula,n,m1,m2,m3,token_hash) returning * into r;
  else
    update public.vacation_4p_2027 set name=n,first_month=m1,second_month=m2,third_month=m3,version=version+1,updated_at=now()
    where edit_hash=token_hash and version=v and registration=matricula returning * into r;
    if not found then raise exception 'Link inválido ou resposta alterada em outra aba. Recarregue sua resposta pelo link pessoal.'; end if;
  end if;
  return jsonb_build_object('name',r.name,'registration',r.registration,'firstMonth',r.first_month,'secondMonth',r.second_month,'thirdMonth',r.third_month,'version',r.version,'updatedAt',r.updated_at);
exception when unique_violation then
  raise exception 'Já existe uma indicação para esta matrícula. Abra seu link pessoal para atualizar as opções ou procure a organização.';
end;
$$;
revoke all on function vacation_4p_internal.save(jsonb,text) from public;
grant execute on function vacation_4p_internal.save(jsonb,text) to anon,authenticated;

create function public.vacation_4p_load(p_token text) returns jsonb language sql security invoker set search_path='' as $$ select vacation_4p_internal.load(p_token) $$;
create function public.vacation_4p_save(p_entry jsonb,p_token text) returns jsonb language sql security invoker set search_path='' as $$ select vacation_4p_internal.save(p_entry,p_token) $$;
revoke all on function public.vacation_4p_load(text) from public;
revoke all on function public.vacation_4p_save(jsonb,text) from public;
grant execute on function public.vacation_4p_load(text) to anon,authenticated;
grant execute on function public.vacation_4p_save(jsonb,text) to anon,authenticated;
commit;
