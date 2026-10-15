-- PostgreSQL CHECK treats NULL as satisfied: require an explicit amount for paid entries.
ALTER TABLE public.checkin_participants ADD CONSTRAINT checkin_complete_payment
  CHECK (payment_status <> 'paid' OR (paid_cents IS NOT NULL AND paid_cents >= 0));
