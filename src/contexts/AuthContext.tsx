import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAnonymous: boolean;
  signOut: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  /**
   * Call this before sign-in to capture anonymous user ID for migration
   */
  prepareForSignIn: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Migrate scenarios from anonymous user to authenticated user
 */
async function migrateAnonymousScenarios(
  anonymousUserId: string,
  authenticatedUserId: string
): Promise<{ success: boolean; migratedCount: number; error?: string }> {
  try {
    // Get all scenarios owned by anonymous user
    const { data: anonScenarios, error: fetchError } = await supabase
      .from("scenarios")
      .select("id, name, inputs, derived, schema_version, scenario_type, created_at, updated_at")
      .eq("user_id", anonymousUserId);

    if (fetchError) {
      console.error("Failed to fetch anonymous scenarios:", fetchError);
      return { success: false, migratedCount: 0, error: fetchError.message };
    }

    if (!anonScenarios || anonScenarios.length === 0) {
      return { success: true, migratedCount: 0 };
    }

    // Get existing scenarios for the authenticated user to check for duplicates
    const { data: existingScenarios } = await supabase
      .from("scenarios")
      .select("id, inputs")
      .eq("user_id", authenticatedUserId);

    // Build a set of existing scenario client_ids for deduplication
    const existingClientIds = new Set<string>();
    if (existingScenarios) {
      for (const s of existingScenarios) {
        const inputs = s.inputs as Record<string, unknown>;
        if (inputs?.client_id) {
          existingClientIds.add(inputs.client_id as string);
        }
      }
    }

    // Filter out duplicates and prepare for migration
    const scenariosToMigrate = anonScenarios.filter((s) => {
      const inputs = s.inputs as Record<string, unknown>;
      const clientId = inputs?.client_id as string | undefined;
      if (clientId && existingClientIds.has(clientId)) {
        return false; // Skip duplicate
      }
      return true;
    });

    if (scenariosToMigrate.length === 0) {
      // All were duplicates, just clean up
      await supabase
        .from("scenarios")
        .delete()
        .eq("user_id", anonymousUserId);
      return { success: true, migratedCount: 0 };
    }

    // Update ownership of scenarios to the authenticated user
    const scenarioIds = scenariosToMigrate.map((s) => s.id);
    const { error: updateError } = await supabase
      .from("scenarios")
      .update({ user_id: authenticatedUserId })
      .in("id", scenarioIds);

    if (updateError) {
      console.error("Failed to migrate scenarios:", updateError);
      return { success: false, migratedCount: 0, error: updateError.message };
    }

    // Delete any remaining scenarios from anonymous user (duplicates)
    const migratedIds = new Set(scenarioIds);
    const remainingToDelete = anonScenarios
      .filter((s) => !migratedIds.has(s.id))
      .map((s) => s.id);

    if (remainingToDelete.length > 0) {
      await supabase
        .from("scenarios")
        .delete()
        .in("id", remainingToDelete);
    }

    return { success: true, migratedCount: scenariosToMigrate.length };
  } catch (e: unknown) {
    console.error("Migration error:", e);
    const message = e instanceof Error ? e.message : "Unknown migration error";
    return { success: false, migratedCount: 0, error: message };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Track anonymous user ID for migration when signing in
  const pendingMigrationUserIdRef = useRef<string | null>(null);

  const isAnonymous = user?.is_anonymous === true;

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        const previousUserId = pendingMigrationUserIdRef.current;
        const newUserId = newSession?.user?.id;
        const wasAnonymous = previousUserId && previousUserId !== newUserId;
        const isNowAuthenticated = newSession?.user && !newSession.user.is_anonymous;

        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsLoading(false);

        // Handle migration from anonymous to authenticated
        if (event === "SIGNED_IN" && wasAnonymous && isNowAuthenticated && newUserId) {
          // Defer to avoid deadlock
          setTimeout(async () => {
            const result = await migrateAnonymousScenarios(previousUserId, newUserId);
            if (result.success && result.migratedCount > 0) {
              console.log(`Migrated ${result.migratedCount} scenarios from anonymous session`);
            } else if (!result.success) {
              console.error("Failed to migrate scenarios:", result.error);
            }
            pendingMigrationUserIdRef.current = null;
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInAnonymously = useCallback(async () => {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error("Failed to sign in anonymously:", error);
      throw error;
    }
  }, []);

  const prepareForSignIn = useCallback((): string | null => {
    // Capture current anonymous user ID before sign-in
    if (user?.is_anonymous) {
      pendingMigrationUserIdRef.current = user.id;
      return user.id;
    }
    return null;
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // After sign out, create a new anonymous session so app continues to work
    setTimeout(async () => {
      try {
        await supabase.auth.signInAnonymously();
      } catch (e) {
        console.error("Failed to create anonymous session after sign out:", e);
      }
    }, 100);
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isLoading, 
      isAnonymous,
      signOut, 
      signInAnonymously,
      prepareForSignIn,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
