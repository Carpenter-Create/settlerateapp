-- Update scenarios table to support HELOC and Assumption scenario types
-- This is a backwards-compatible change that extends the allowed values

-- Drop the existing check constraint on scenario_type
ALTER TABLE public.scenarios DROP CONSTRAINT IF EXISTS scenarios_scenario_type_check;

-- Add the new check constraint with all four scenario types
ALTER TABLE public.scenarios 
  ADD CONSTRAINT scenarios_scenario_type_check 
  CHECK (scenario_type IN ('purchase', 'refinance', 'heloc', 'assumption'));

-- Add a comment explaining the scenario types
COMMENT ON COLUMN public.scenarios.scenario_type IS 'Type of scenario: purchase (new home purchase), refinance (existing mortgage refinance), heloc (home equity line of credit), assumption (loan assumption with gap financing)';