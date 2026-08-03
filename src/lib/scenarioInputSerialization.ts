import type { Json } from "@/integrations/supabase/types";
import type { MortgageInputs } from "@/lib/mortgage";

/**
 * Supabase `inputs` is typed as Json; MortgageInputs is a structured domain object
 * without an index signature. JSON round-trip produces a value compatible with Json.
 */
export function serializeInputsForSupabase(inputs: MortgageInputs): Json {
  return JSON.parse(JSON.stringify(inputs)) as Json;
}

/**
 * Inverse of serializeInputsForSupabase for hydration tests and persistence round-trips.
 */
export function deserializeInputsFromSupabase(json: Json): MortgageInputs {
  return JSON.parse(JSON.stringify(json)) as MortgageInputs;
}
