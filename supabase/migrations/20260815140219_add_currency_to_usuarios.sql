-- ============================================================================
-- M11: per-user currency.
--
-- Amounts have always been Colombian pesos (median grocery movimiento ~29.000,
-- max 8.507.278) but the client formatted them with Intl en-US/USD/0-decimals,
-- so the UI rendered "$29,000" for COP $29.000 on every screen. The currency was
-- hardcoded in lib/constants.js CURRENCY; this moves it into the data where it
-- belongs and lets lib/format read it.
--
-- Single currency per user, not per movimiento: no user tracks more than one.
-- If that changes, add movimientos.currency and let it override this.
--
-- Risk: LOW. Additive, no existing value is read or rewritten.
-- Reversible: yes -- see the down block at the bottom.
-- ============================================================================

alter table public.usuarios
  add column if not exists currency text not null default 'COP';

comment on column public.usuarios.currency is
  'ISO 4217 code used to format this user''s amounts. Display concern only: '
  'importe is stored as a plain numeric and is never converted.';

-- ISO 4217 alpha codes are exactly three uppercase letters. Cheap guard against
-- a '$' or 'cop' finding its way in from a settings form later.
alter table public.usuarios
  drop constraint if exists usuarios_currency_check;
alter table public.usuarios
  add constraint usuarios_currency_check check (currency ~ '^[A-Z]{3}$');

-- Every existing row takes the DEFAULT above. Assert it rather than assume it:
-- if a NULL or malformed code somehow exists, fail here, not in the UI.
do $$
declare bad integer;
begin
  select count(*) into bad from public.usuarios
   where currency is null or currency !~ '^[A-Z]{3}$';
  if bad > 0 then
    raise exception 'M11: % usuarios with missing/invalid currency after backfill', bad;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- down (not auto-run by the Supabase CLI; kept so the rollback is written down)
--
--   alter table public.usuarios drop constraint if exists usuarios_currency_check;
--   alter table public.usuarios drop column if exists currency;
-- ----------------------------------------------------------------------------
