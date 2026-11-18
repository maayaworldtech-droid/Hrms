-- 1. Payroll: every person has a set number of paid days off a month (week offs + paid leave),
--    taken on any day they like. Days off beyond that are cut at monthly salary / working days.
ALTER TABLE public.company_settings ADD COLUMN week_offs_per_month integer;
UPDATE public.company_settings SET week_offs_per_month = 4 WHERE week_offs_per_month IS NULL;
UPDATE public.company_settings SET paid_leaves_per_month = 1 WHERE paid_leaves_per_month IS NULL;

-- Working days used to price one unpaid day (days in month - paid days off), and the paid days
-- off this person was allowed. Empty on older payslips, which keep the earlier calculation.
ALTER TABLE public.payslips ADD COLUMN working_days integer;
ALTER TABLE public.payslips ADD COLUMN days_off_allowed double precision;
ALTER TABLE public.payslips ADD COLUMN days_off_taken double precision;

-- 2. Leavers: the last working day, so someone deactivated is still paid for the days they worked.
ALTER TABLE public.employees ADD COLUMN date_of_exit date;

-- 3. Daily sales form: BookMyShow, cash deposited, Google Pay, Paytm / Maaya World, less expenses.
--    Existing figures are kept: "website" becomes Paytm / Maaya World, "cash counter" becomes cash deposited.
ALTER TABLE public.daily_collections DROP CONSTRAINT ck_daily_collections_amounts;
ALTER TABLE public.daily_collections RENAME COLUMN website TO paytm_maaya_world;
ALTER TABLE public.daily_collections RENAME COLUMN cash_counter TO cash_deposited;
ALTER TABLE public.daily_collections ADD COLUMN google_pay double precision NOT NULL DEFAULT 0;
ALTER TABLE public.daily_collections ADD COLUMN expense_cash double precision NOT NULL DEFAULT 0;
ALTER TABLE public.daily_collections ADD COLUMN expense_online double precision NOT NULL DEFAULT 0;
ALTER TABLE public.daily_collections ADD COLUMN notes character varying(500);
ALTER TABLE public.daily_collections
    ADD CONSTRAINT ck_daily_collections_amounts CHECK (
        book_my_show >= 0 AND cash_deposited >= 0 AND google_pay >= 0 AND paytm_maaya_world >= 0
        AND expense_cash >= 0 AND expense_online >= 0
    );
