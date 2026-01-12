-- Create saved_comparisons table for persistent comparison storage
-- This stores user-created comparisons as stable records

CREATE TABLE IF NOT EXISTS public.user_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scenario_a_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  scenario_b_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure both scenarios are different
  CONSTRAINT different_scenarios CHECK (scenario_a_id != scenario_b_id)
);

-- Enable RLS
ALTER TABLE public.user_comparisons ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own comparisons"
  ON public.user_comparisons
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own comparisons"
  ON public.user_comparisons
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comparisons"
  ON public.user_comparisons
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comparisons"
  ON public.user_comparisons
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_comparisons_updated_at
  BEFORE UPDATE ON public.user_comparisons
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

-- Create index for user lookups
CREATE INDEX idx_user_comparisons_user_id ON public.user_comparisons(user_id);
CREATE INDEX idx_user_comparisons_created_at ON public.user_comparisons(created_at DESC);