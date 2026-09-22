-- handle_new_user() consumed the invite code (UPDATE invite_codes SET
-- used_by = new.id) before inserting the matching profiles row, but
-- invite_codes.used_by has a foreign key to profiles(id) and that FK is
-- not deferrable — so the UPDATE's end-of-statement constraint check
-- always failed with a foreign-key violation, since the referenced
-- profile didn't exist yet. Every athlete self-signup via invite code
-- was broken. Fixed by creating the profile first, then validating and
-- consuming the invite code — an invalid/used code still raises and
-- rolls back the whole transaction (including the profile insert), so
-- an invalid code can never leave an orphaned profile behind.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role user_role;
  v_code text;
begin
  v_role := coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'athlete');
  v_code := new.raw_user_meta_data ->> 'invite_code';

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_role
  );

  if v_role = 'athlete' then
    if v_code is null or length(trim(v_code)) = 0 then
      raise exception 'An invite code is required to sign up.';
    end if;

    update public.invite_codes
      set used_by = new.id, used_at = now()
      where code = upper(trim(v_code)) and used_at is null;

    if not found then
      raise exception 'That invite code is invalid or has already been used.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
