-- Replaces manual age entry with a real date of birth field, which the
-- intake form now uses to derive age at submission time. age is kept
-- (now derived, not hand-typed) since existing reporting/queries depend on it.
alter table athlete_profiles
  add column date_of_birth date;
