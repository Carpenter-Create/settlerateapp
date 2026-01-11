import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BillingRow {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  price_id: string | null;
  current_period_end: string | null;
  updated_at: string;
}

export function useBilling() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["billing", user?.id],
    queryFn: async (): Promise<BillingRow | null> => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("billing")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function isPro(billing: BillingRow | null | undefined): boolean {
  if (!billing) return false;
  return ["active", "trialing"].includes(billing.subscription_status ?? "");
}
