/**
 * Coerce optional interest-rate input values.
 * Preserves explicit 0%; maps null/undefined/NaN to null (empty).
 */
export function coerceOptionalInterestRate(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  return value;
}
