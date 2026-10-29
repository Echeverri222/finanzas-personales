import * as React from "react";

import { Input } from "@/components/ui/input";
import { formatDecimal, parseMoneyInput } from "@/lib/format";

/** The bits of a change event the call sites actually read. */
export interface MoneyChangeEvent {
  target: { name?: string; value: string };
}

export interface MoneyInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  /** Canonical value: a plain numeric string ("12345.5") or number; "" when empty. */
  value: string | number | null | undefined;
  /** Called with the CANONICAL value in `e.target.value`, never the typed text. */
  onChange?: (e: MoneyChangeEvent) => void;
  /** Decimals shown once the field loses focus. Pesos need none, USD prices two. */
  maxFractionDigits?: number;
}

function display(value: MoneyInputProps["value"], maxFractionDigits: number) {
  if (value === null || value === undefined || value === "") return "";
  return formatDecimal(value, maxFractionDigits);
}

/**
 * An amount field that understands how Colombians type money.
 *
 * It replaces `<Input type="number">`, which reads "12.345" as twelve point
 * three four five: the movimiento was saved as $12 and, because amounts render
 * without decimals, nothing on screen ever looked wrong. Here a dot followed by
 * three digits is a thousands separator, a comma is the decimal mark, and the
 * field re-renders as "12.345" on blur so the user sees what was understood.
 *
 * `onChange` hands back the canonical string, so the existing
 * `handleInputChange(e)` / `set('campo')` handlers keep working unchanged.
 */
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, onBlur, name, maxFractionDigits = 2, ...props }, ref) => {
    const [text, setText] = React.useState(() => display(value, maxFractionDigits));

    // Follow external changes (a reset, opening the editor on another row)
    // without fighting the user mid-typing: only resync when the canonical
    // value no longer matches what the current text means.
    React.useEffect(() => {
      const canonical = value === null || value === undefined ? "" : String(value);
      if (parseMoneyInput(text) !== parseMoneyInput(canonical)) {
        setText(display(value, maxFractionDigits));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
      <Input
        {...props}
        ref={ref}
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.,\s$-]/g, "");
          setText(raw);
          onChange?.({ target: { name, value: parseMoneyInput(raw) } });
        }}
        onBlur={(e) => {
          const canonical = parseMoneyInput(text);
          setText(display(canonical, maxFractionDigits));
          onBlur?.(e);
        }}
      />
    );
  },
);
MoneyInput.displayName = "MoneyInput";
