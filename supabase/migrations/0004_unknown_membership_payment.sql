ALTER TABLE public.members ALTER COLUMN membership_status SET DEFAULT 'unknown';
ALTER TABLE public.members ALTER COLUMN payment_paid DROP NOT NULL;
ALTER TABLE public.members ALTER COLUMN payment_paid DROP DEFAULT;
