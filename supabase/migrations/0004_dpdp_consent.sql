-- DPDP Act compliance: records when a user gave explicit consent to the
-- Privacy Policy / Terms at signup, so "notice and consent" is auditable
-- rather than just implied by using the app.
alter table profiles
  add column consent_accepted_at timestamptz;
