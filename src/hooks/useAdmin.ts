import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to check if current user has admin role.
 * Uses server-side RLS to prevent privilege escalation.
 */
export function useAdmin() {
  const { user, isLoading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id) return false;

      // Query user_roles table - RLS will only allow if user is admin
      // If user is not admin, they won't be able to read the table at all
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        // RLS denied access or other error - user is not admin
        console.log("Admin check: access denied or error", error.message);
        return false;
      }

      return data !== null;
    },
    enabled: !!user?.id && !authLoading,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    isAdmin: query.data ?? false,
    isLoading: authLoading || query.isLoading,
    error: query.error,
  };
}
