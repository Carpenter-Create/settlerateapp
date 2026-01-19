-- Add optional Scenario C support to comparisons
-- This allows comparisons to include 2 or 3 scenarios

-- Add scenario_c_id column (nullable for backward compatibility)
ALTER TABLE public.user_comparisons
ADD COLUMN IF NOT EXISTS scenario_c_id uuid REFERENCES public.scenarios(id) ON DELETE SET NULL;

-- Add constraint: scenario_c cannot equal scenario_a or scenario_b
ALTER TABLE public.user_comparisons
DROP CONSTRAINT IF EXISTS different_scenario_c;

ALTER TABLE public.user_comparisons
ADD CONSTRAINT different_scenario_c 
CHECK (
  scenario_c_id IS NULL 
  OR (scenario_c_id != scenario_a_id AND scenario_c_id != scenario_b_id)
);

-- Create index for scenario_c_id lookups
CREATE INDEX IF NOT EXISTS idx_user_comparisons_scenario_c_id 
ON public.user_comparisons(scenario_c_id) 
WHERE scenario_c_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.user_comparisons.scenario_c_id IS 'Optional third scenario for 3-way comparisons';