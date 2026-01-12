/**
 * Hook for managing saved comparisons
 * 
 * Provides CRUD operations for user comparisons stored in the database.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SavedComparison {
  id: string;
  name: string;
  scenario_a_id: string;
  scenario_b_id: string;
  created_at: string;
  updated_at: string;
}

interface CreateComparisonParams {
  name: string;
  scenario_a_id: string;
  scenario_b_id: string;
}

export function useComparisons() {
  const { user, isAnonymous } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all user comparisons
  const comparisonsQuery = useQuery({
    queryKey: ["comparisons", user?.id],
    queryFn: async (): Promise<SavedComparison[]> => {
      if (!user?.id || isAnonymous) return [];

      const { data, error } = await supabase
        .from("user_comparisons")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching comparisons:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.id && !isAnonymous,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch a single comparison by ID (with error propagation for retry logic)
  const getComparison = async (id: string): Promise<SavedComparison | null> => {
    if (!user?.id || isAnonymous) return null;

    const { data, error } = await supabase
      .from("user_comparisons")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching comparison:", error);
      // Propagate error for retry handling in UI
      throw error;
    }

    return data;
  };

  // Create a new comparison
  const createMutation = useMutation({
    mutationFn: async (params: CreateComparisonParams): Promise<SavedComparison> => {
      if (!user?.id || isAnonymous) {
        throw new Error("Must be authenticated to create comparisons");
      }

      const { data, error } = await supabase
        .from("user_comparisons")
        .insert({
          user_id: user.id,
          name: params.name,
          scenario_a_id: params.scenario_a_id,
          scenario_b_id: params.scenario_b_id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating comparison:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comparisons", user?.id] });
    },
  });

  // Delete a comparison
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!user?.id || isAnonymous) {
        throw new Error("Must be authenticated to delete comparisons");
      }

      const { error } = await supabase
        .from("user_comparisons")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting comparison:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comparisons", user?.id] });
    },
  });

  return {
    comparisons: comparisonsQuery.data || [],
    isLoading: comparisonsQuery.isLoading,
    isLoaded: !comparisonsQuery.isLoading,
    getComparison,
    createComparison: createMutation.mutateAsync,
    deleteComparison: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
