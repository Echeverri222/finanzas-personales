/**
 * Spanish messages for native constraint validation.
 *
 * The browser writes "Please fill out this field" in ITS language, not the
 * page's, so a Spanish app showed English bubbles on every `required` field.
 * The primitives (Input, NativeSelect) call these from onInvalid/onInput, which
 * fixes every form at once instead of adding noValidate + custom checks to each.
 */
type Validatable = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function mensaje(el: Validatable): string {
  const v = el.validity;
  if (v.valueMissing) {
    return el instanceof HTMLSelectElement ? "Elige una opción." : "Completa este campo.";
  }
  if (v.typeMismatch) {
    return el.type === "email" ? "Escribe un correo válido." : "El formato no es válido.";
  }
  if (v.rangeUnderflow) return `El valor debe ser mayor o igual a ${(el as HTMLInputElement).min}.`;
  if (v.rangeOverflow) return `El valor debe ser menor o igual a ${(el as HTMLInputElement).max}.`;
  if (v.stepMismatch) return "Ese valor no es válido aquí.";
  if (v.badInput) return "Escribe un número.";
  if (v.tooShort) return `Usa al menos ${(el as HTMLInputElement).minLength} caracteres.`;
  if (v.patternMismatch) return "El formato no es válido.";
  return "";
}

export function alInvalidar(e: React.FormEvent<Validatable>) {
  const el = e.currentTarget;
  // Only replace the browser's own message; a message set on purpose with
  // setCustomValidity elsewhere is left alone.
  if (!el.validity.customError) el.setCustomValidity(mensaje(el));
}

export function alEditar(e: React.FormEvent<Validatable>) {
  // A custom message makes the field permanently invalid until it is cleared,
  // so clear it on every edit and let the next submit re-validate.
  e.currentTarget.setCustomValidity("");
}
