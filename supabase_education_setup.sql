-- Beray Eğitim + Aura X ortak Supabase kurulumu.
-- Önce Aura X paketindeki supabase_aura_base_setup.sql çalıştırılmalı.
-- Bu dosya eğitim profillerini, veri tablolarını ve RLS politikalarını hazırlar.

create extension if not exists pgcrypto;

create table if not exists public.education_records (
  collection_name text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection_name, id)
);
create index if not exists education_records_collection_updated_idx
  on public.education_records (collection_name, updated_at desc);
create index if not exists education_records_data_gin_idx
  on public.education_records using gin (data jsonb_path_ops);

-- Answer keys are private: they are never readable directly by browser clients.
create table if not exists public.education_test_answer_keys (
  test_id text primary key,
  answers jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.education_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.created_at is null then new.created_at := now(); end if;
  return new;
end;
$$;
drop trigger if exists education_records_touch_updated_at on public.education_records;
create trigger education_records_touch_updated_at before insert or update on public.education_records
for each row execute function public.education_touch_updated_at();
drop trigger if exists education_answer_keys_touch_updated_at on public.education_test_answer_keys;
create trigger education_answer_keys_touch_updated_at before insert or update on public.education_test_answer_keys
for each row execute function public.education_touch_updated_at();

create or replace function public.education_current_role(p_uid uuid default auth.uid())
returns text language sql stable security definer set search_path = public
as $$
  select coalesce(r.data ->> 'role', 'student')
  from public.education_records r
  where r.collection_name = 'users' and r.id = p_uid::text
  limit 1;
$$;
create or replace function public.education_is_teacher_or_admin(p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select public.education_current_role(p_uid) in ('teacher','admin'); $$;
create or replace function public.education_is_admin(p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select public.education_current_role(p_uid) = 'admin'; $$;

-- Prevent self-service changes to protected profile values (points, role, achievements).
create or replace function public.education_guard_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.collection_name = 'users'
     and old.collection_name = 'users'
     and auth.uid() is not null
     and coalesce(auth.role(), '') = 'authenticated'
     and old.id = auth.uid()::text then
    if new.data ->> 'role' is distinct from old.data ->> 'role'
       or new.data ->> 'points' is distinct from old.data ->> 'points'
       or new.data -> 'completedTests' is distinct from old.data -> 'completedTests'
       or new.data -> 'completedLessons' is distinct from old.data -> 'completedLessons' then
      raise exception 'Rol, puan ve tamamlanma alanları yalnızca güvenli sunucu işlemleriyle değiştirilebilir.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists education_guard_profile_fields_trigger on public.education_records;
create trigger education_guard_profile_fields_trigger before update on public.education_records
for each row execute function public.education_guard_profile_fields();

alter table public.education_records enable row level security;
alter table public.education_test_answer_keys enable row level security;
grant select, insert, update, delete on public.education_records to authenticated;
grant all on public.education_records to service_role;
grant all on public.education_test_answer_keys to service_role;
revoke all on public.education_test_answer_keys from anon, authenticated;

-- Read access: teaching content is visible to signed-in students. User data and results are restricted.
drop policy if exists education_records_select on public.education_records;
create policy education_records_select on public.education_records for select to authenticated using (
  (collection_name = 'users' and (id = auth.uid()::text or public.education_is_teacher_or_admin()))
  or (collection_name in ('courses','lessons','tests','announcements','meetings'))
  or (collection_name = 'results' and (data ->> 'studentId' = auth.uid()::text or public.education_is_teacher_or_admin()))
  or (collection_name = 'notifications' and data ->> 'userId' = auth.uid()::text)
  or (collection_name = 'usernameClaims')
  or (collection_name in ('followRequests','friendships','pointTransfers') and (
      data ->> 'fromUid' = auth.uid()::text or data ->> 'toUid' = auth.uid()::text
      or data -> 'members' ? auth.uid()::text
  ))
);

-- A new user can create only their own student profile. Existing profiles can edit non-protected fields.
drop policy if exists education_records_insert on public.education_records;
create policy education_records_insert on public.education_records for insert to authenticated with check (
  (collection_name = 'users' and id = auth.uid()::text and coalesce(data ->> 'role','student') = 'student')
  or (collection_name = 'usernameClaims' and data ->> 'ownerUidHash' = encode(digest(auth.uid()::text, 'sha256'),'hex'))
  or (collection_name in ('courses','lessons','tests','announcements','meetings') and public.education_is_teacher_or_admin()
      and (public.education_is_admin() or data ->> 'teacherId' = auth.uid()::text))
);
drop policy if exists education_records_update on public.education_records;
create policy education_records_update on public.education_records for update to authenticated
using (
  (collection_name = 'users' and id = auth.uid()::text)
  or (collection_name = 'usernameClaims' and data ->> 'ownerUidHash' = encode(digest(auth.uid()::text, 'sha256'),'hex'))
  or (collection_name in ('courses','lessons','tests','announcements','meetings') and public.education_is_teacher_or_admin()
      and (public.education_is_admin() or data ->> 'teacherId' = auth.uid()::text))
)
with check (
  (collection_name = 'users' and id = auth.uid()::text and data ->> 'role' = public.education_current_role())
  or (collection_name = 'usernameClaims' and data ->> 'ownerUidHash' = encode(digest(auth.uid()::text, 'sha256'),'hex'))
  or (collection_name in ('courses','lessons','tests','announcements','meetings') and public.education_is_teacher_or_admin()
      and (public.education_is_admin() or data ->> 'teacherId' = auth.uid()::text))
);
drop policy if exists education_records_delete on public.education_records;
create policy education_records_delete on public.education_records for delete to authenticated using (
  (collection_name = 'users' and id = auth.uid()::text)
  or (collection_name = 'usernameClaims' and data ->> 'ownerUidHash' = encode(digest(auth.uid()::text, 'sha256'),'hex'))
  or (collection_name in ('courses','lessons','tests','announcements','meetings') and public.education_is_teacher_or_admin()
      and (public.education_is_admin() or data ->> 'teacherId' = auth.uid()::text))
);

-- Seed education profiles for existing Aura X/Supabase Auth accounts. Aura X identities use the same auth.uid().
insert into public.education_records (collection_name, id, data)
select 'users', au.id::text,
  jsonb_build_object(
    'uid', au.id::text,
    'name', coalesce(ax.data ->> 'displayName', au.raw_user_meta_data ->> 'full_name', au.raw_user_meta_data ->> 'name', split_part(coalesce(au.email,''),'@',1), 'Öğrenci'),
    'email', coalesce(au.email, ax.data ->> 'authEmail', ''),
    'username', coalesce(ax.id, ''),
    'usernameLower', lower(coalesce(ax.id, '')),
    'auraxUsername', coalesce(ax.id, ''),
    'provider', case when ax.id is null then 'supabase' else 'aurax' end,
    'role', case when lower(coalesce(ax.id,'')) = lower('A_UR_A_XX') and lower(coalesce(ax.data ->> 'role','')) = 'admin' then 'admin' else 'student' end,
    'points', 0,
    'completedLessons', '[]'::jsonb,
    'completedTests', '[]'::jsonb,
    'avatarId', 'owl-blue',
    'createdAt', to_jsonb(extract(epoch from au.created_at)::bigint * 1000)
  )
from auth.users au
left join lateral (
  select u.id, u.data from public.users u where u.data ->> 'authUid' = au.id::text limit 1
) ax on true
on conflict (collection_name, id) do nothing;

-- If an earlier SQL attempt already created the Education profile as a student,
-- safely carry over only the reserved Aura X system-admin identity.
update public.education_records er
set data = jsonb_set(er.data, '{role}', to_jsonb('admin'::text), true), updated_at = now()
from public.users ax
where er.collection_name = 'users'
  and er.id = ax.data ->> 'authUid'
  and lower(ax.id) = lower('A_UR_A_XX')
  and lower(coalesce(ax.data ->> 'role','')) = 'admin'
  and coalesce(er.data ->> 'role','student') = 'student';

-- Future Auth accounts receive a default education profile. The frontend can safely enrich it after login.
create or replace function public.education_create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username','')));
  v_name text := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'),''), nullif(btrim(new.raw_user_meta_data ->> 'full_name'),''), nullif(btrim(new.raw_user_meta_data ->> 'name'),''), split_part(coalesce(new.email,''),'@',1), 'Öğrenci');
  v_claim_rows integer;
begin
  if v_username <> '' then
    if v_username !~ '^[a-z0-9._-]{3,24}$' then
      raise exception 'Kullanıcı adı 3–24 karakter olmalı; yalnızca harf, sayı, nokta, tire ve alt çizgi kullanılabilir.' using errcode = '22023';
    end if;
    if exists (select 1 from public.users au where lower(au.id) = v_username) then
      raise exception 'Bu kullanıcı adı Aura X üzerinde zaten kullanılıyor.' using errcode = '23505';
    end if;
    if exists (select 1 from public.education_records er where er.collection_name = 'usernameClaims' and lower(er.id) = v_username and coalesce(er.data ->> 'ownerUidHash','') <> encode(digest(new.id::text,'sha256'),'hex')) then
      raise exception 'Bu kullanıcı adı zaten seçilmiş.' using errcode = '23505';
    end if;
  end if;

  insert into public.education_records (collection_name, id, data)
  values ('users', new.id::text, jsonb_build_object(
    'uid', new.id::text,
    'name', v_name,
    'email', coalesce(new.email, ''),
    'username', nullif(v_username,''),
    'usernameLower', nullif(v_username,''),
    'role', 'student', 'points', 0, 'completedLessons', '[]'::jsonb,
    'completedTests', '[]'::jsonb, 'avatarId', 'owl-blue',
    'provider', 'supabase',
    'createdAt', jsonb_build_object('seconds', floor(extract(epoch from now()))::bigint, 'nanoseconds', 0)
  )) on conflict (collection_name, id) do nothing;

  if v_username <> '' then
    insert into public.education_records (collection_name, id, data)
    values ('usernameClaims', v_username, jsonb_build_object(
      'claimed', true,
      'ownerUidHash', encode(digest(new.id::text, 'sha256'),'hex'),
      'createdAt', jsonb_build_object('seconds', floor(extract(epoch from now()))::bigint, 'nanoseconds', 0)
    )) on conflict (collection_name, id) do nothing;
    get diagnostics v_claim_rows = row_count;
    if v_claim_rows = 0 and not exists (
      select 1 from public.education_records where collection_name = 'usernameClaims' and id = v_username
        and data ->> 'ownerUidHash' = encode(digest(new.id::text, 'sha256'),'hex')
    ) then
      raise exception 'Bu kullanıcı adı zaten seçilmiş.' using errcode = '23505';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists education_auth_user_created on auth.users;
create trigger education_auth_user_created after insert on auth.users
for each row execute function public.education_create_profile_for_auth_user();

notify pgrst, 'reload schema';

-- This function is callable only by the trusted Edge Function (service_role). It grades once,
-- writes the result and updates points in one Postgres transaction to avoid duplicate rewards.
create or replace function public.education_grade_test(
  p_user_id uuid,
  p_test_id text,
  p_test_title text,
  p_answers jsonb,
  p_answer_key jsonb,
  p_wrong_focus jsonb default '[]'::jsonb,
  p_points_per_correct integer default 5,
  p_is_ready boolean default false
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_profile jsonb;
  v_test_title text;
  v_existing jsonb;
  v_total integer;
  v_correct integer := 0;
  v_wrong integer;
  v_score integer;
  v_points integer := 0;
  v_completed jsonb;
  v_result_id text;
  v_result jsonb;
  i integer;
begin
  if p_user_id is null or p_test_id is null or length(btrim(p_test_id)) = 0 then
    raise exception 'Test bilgisi geçersiz.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_answers) <> 'array' or jsonb_typeof(p_answer_key) <> 'array' then
    raise exception 'Cevap listesi geçersiz.' using errcode = '22023';
  end if;
  v_total := jsonb_array_length(p_answer_key);
  if v_total < 1 or jsonb_array_length(p_answers) <> v_total then
    raise exception 'Tüm sorular cevaplanmalı.' using errcode = '22023';
  end if;

  select data into v_profile
  from public.education_records
  where collection_name = 'users' and id = p_user_id::text
  for update;
  if v_profile is null then raise exception 'Kullanıcı profili bulunamadı.' using errcode = 'P0002'; end if;
  if coalesce(v_profile ->> 'role','student') <> 'student' then
    raise exception 'Bu işlem yalnızca öğrenci hesabında kullanılabilir.' using errcode = '42501';
  end if;

  v_result_id := p_user_id::text || '_' || p_test_id;
  select data into v_existing from public.education_records
  where collection_name = 'results' and id = v_result_id;
  if v_existing is not null then
    return jsonb_build_object(
      'score', coalesce((v_existing ->> 'score')::integer, 0),
      'correct', coalesce((v_existing ->> 'correct')::integer, 0),
      'wrong', coalesce((v_existing ->> 'wrong')::integer, 0),
      'pointsAwarded', coalesce((v_existing ->> 'pointsAwarded')::integer, 0),
      'alreadySubmitted', true,
      'wrongFocus', coalesce(v_existing -> 'wrongFocus', '[]'::jsonb)
    );
  end if;

  for i in 0..v_total-1 loop
    if (p_answers ->> i) !~ '^[0-9]+$' or (p_answer_key ->> i) !~ '^[0-9]+$' then
      raise exception 'Cevaplardan biri geçersiz.' using errcode = '22023';
    end if;
    if (p_answers ->> i)::integer < 0 or (p_answers ->> i)::integer > 5 then
      raise exception 'Cevaplardan biri geçersiz.' using errcode = '22023';
    end if;
    if (p_answers ->> i)::integer = (p_answer_key ->> i)::integer then v_correct := v_correct + 1; end if;
  end loop;

  v_wrong := v_total - v_correct;
  v_score := round((v_correct::numeric / v_total::numeric) * 100)::integer;
  v_points := case when p_is_ready then 0 else greatest(0, p_points_per_correct) * v_correct end;
  v_completed := case when jsonb_typeof(v_profile -> 'completedTests') = 'array' then v_profile -> 'completedTests' else '[]'::jsonb end;
  v_test_title := coalesce(nullif(p_test_title,''), p_test_id);

  v_result := jsonb_build_object(
    'studentId', p_user_id::text,
    'studentName', coalesce(v_profile ->> 'name','Öğrenci'),
    'testId', p_test_id,
    'testTitle', v_test_title,
    'correct', v_correct,
    'wrong', v_wrong,
    'score', v_score,
    'pointsAwarded', v_points,
    'wrongFocus', coalesce(p_wrong_focus, '[]'::jsonb),
    'createdAt', jsonb_build_object('seconds', floor(extract(epoch from clock_timestamp()))::bigint, 'nanoseconds', 0),
    'isReadyCurriculumTest', coalesce(p_is_ready, false)
  );

  insert into public.education_records (collection_name,id,data)
  values ('results',v_result_id,v_result);

  if not (v_completed ? p_test_id) then v_completed := v_completed || jsonb_build_array(p_test_id); end if;
  update public.education_records
  set data = v_profile || jsonb_build_object(
    'completedTests', v_completed,
    'points', coalesce((v_profile ->> 'points')::integer,0) + v_points
  )
  where collection_name = 'users' and id = p_user_id::text;

  return jsonb_build_object('score',v_score,'correct',v_correct,'wrong',v_wrong,'pointsAwarded',v_points,'alreadySubmitted',false,'wrongFocus',coalesce(p_wrong_focus,'[]'::jsonb));
end;
$$;
revoke all on function public.education_grade_test(uuid,text,text,jsonb,jsonb,jsonb,integer,boolean) from public, anon, authenticated;
grant execute on function public.education_grade_test(uuid,text,text,jsonb,jsonb,jsonb,integer,boolean) to service_role;

notify pgrst, 'reload schema';

-- Atomically transfer points between students who are friends in the Education social system.
create or replace function public.education_share_points(
  p_sender_id uuid,
  p_target_id uuid,
  p_amount integer
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_sender jsonb;
  v_target jsonb;
  v_transfer_id text;
  v_now jsonb;
begin
  if p_sender_id is null or p_target_id is null or p_sender_id = p_target_id then
    raise exception 'Alıcı geçersiz.' using errcode = '22023';
  end if;
  if p_amount is null or p_amount < 20 or p_amount > 100 then
    raise exception '20–100 arasında puan seçmelisin.' using errcode = '22023';
  end if;

  -- Lock both profiles in a stable order so simultaneous transfers do not overspend points.
  perform 1 from public.education_records
  where collection_name = 'users' and id in (p_sender_id::text, p_target_id::text)
  order by id for update;

  select data into v_sender from public.education_records
  where collection_name = 'users' and id = p_sender_id::text;
  select data into v_target from public.education_records
  where collection_name = 'users' and id = p_target_id::text;
  if v_sender is null or v_target is null then
    raise exception 'Kullanıcı bulunamadı.' using errcode = 'P0002';
  end if;
  if coalesce(v_sender ->> 'role','student') <> 'student'
     or coalesce(v_target ->> 'role','student') <> 'student' then
    raise exception 'Puan yalnızca öğrenci hesapları arasında paylaşılabilir.' using errcode = '42501';
  end if;
  if coalesce((v_sender ->> 'points')::integer,0) < p_amount then
    raise exception 'Yeterli puanın yok.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.education_records f
    where f.collection_name = 'friendships'
      and f.data -> 'members' @> jsonb_build_array(p_sender_id::text)
      and f.data -> 'members' @> jsonb_build_array(p_target_id::text)
  ) then
    raise exception 'Puan göndermek için önce öğrenciyle arkadaş olmalısın.' using errcode = '42501';
  end if;

  update public.education_records
  set data = v_sender || jsonb_build_object('points', coalesce((v_sender ->> 'points')::integer,0) - p_amount)
  where collection_name = 'users' and id = p_sender_id::text;
  update public.education_records
  set data = v_target || jsonb_build_object('points', coalesce((v_target ->> 'points')::integer,0) + p_amount)
  where collection_name = 'users' and id = p_target_id::text;

  v_transfer_id := gen_random_uuid()::text;
  v_now := jsonb_build_object('seconds', floor(extract(epoch from clock_timestamp()))::bigint, 'nanoseconds', 0);
  insert into public.education_records(collection_name, id, data)
  values ('pointTransfers', v_transfer_id, jsonb_build_object(
    'fromUid', p_sender_id::text,
    'toUid', p_target_id::text,
    'fromName', coalesce(v_sender ->> 'name', 'Öğrenci'),
    'toName', coalesce(v_target ->> 'name', 'Öğrenci'),
    'amount', p_amount,
    'createdAt', v_now
  ));
  insert into public.education_records(collection_name, id, data)
  values ('notifications', gen_random_uuid()::text, jsonb_build_object(
    'userId', p_target_id::text,
    'title', 'Puan aldın!',
    'body', coalesce(v_sender ->> 'name','Bir öğrenci') || ' sana ' || p_amount::text || ' puan gönderdi.',
    'type', 'points-received',
    'read', false,
    'createdAt', v_now,
    'actorUid', p_sender_id::text,
    'relatedId', v_transfer_id
  ));

  return jsonb_build_object(
    'senderPoints', coalesce((v_sender ->> 'points')::integer,0) - p_amount,
    'receiverPoints', coalesce((v_target ->> 'points')::integer,0) + p_amount
  );
end;
$$;
revoke all on function public.education_share_points(uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.education_share_points(uuid,uuid,integer) to service_role;

notify pgrst, 'reload schema';
