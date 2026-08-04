import { resolveAppOrigin } from "../_shared/appOrigin.ts";
import {
  resolveStripeCustomerByUserId,
  type StripeCustomerLike,
} from "../_shared/stripeCustomerResolve.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface CustomerPortalUser {
  id: string;
  email?: string | null;
}

export interface CustomerPortalDeps {
  getUserFromToken: (
    token: string
  ) => Promise<{ user: CustomerPortalUser | null; error?: { message: string } | null }>;
  isAdmin: (userId: string) => Promise<boolean>;
  logAdminBypass: (userId: string) => Promise<void>;
  /** Authoritative billing.stripe_customer_id for the authenticated user only. */
  getBillingCustomerId: (userId: string) => Promise<string | null | undefined>;
  /** Metadata-only Stripe search candidates for the authenticated user. */
  searchCustomersByUserId: (userId: string) => Promise<StripeCustomerLike[]>;
  /** Repairs the authenticated user's billing mapping after a unique metadata match. */
  upsertBillingCustomerId: (userId: string, customerId: string) => Promise<void>;
  createPortalSession: (customerId: string, returnUrl: string) => Promise<{ url: string; id: string }>;
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

export async function handleCustomerPortalRequest(
  req: Request,
  deps: CustomerPortalDeps
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { user, error: userError } = await deps.getUserFromToken(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    if (!user) throw new Error("User not authenticated");

    if (await deps.isAdmin(user.id)) {
      await deps.logAdminBypass(user.id);
      return jsonResponse(
        { code: "ADMIN_USER", error: "Billing not required for administrator access" },
        200
      );
    }

    let customerId = (await deps.getBillingCustomerId(user.id)) ?? null;
    if (!customerId) {
      const resolution = resolveStripeCustomerByUserId(
        await deps.searchCustomersByUserId(user.id),
        user.id
      );

      if (resolution.kind === "ambiguous") {
        return jsonResponse(
          { code: "CUSTOMER_AMBIGUOUS", error: "Multiple billing profiles found" },
          409
        );
      }

      if (resolution.kind === "none") {
        return jsonResponse(
          { code: "NO_STRIPE_CUSTOMER", error: "No billing profile found" },
          200
        );
      }

      customerId = resolution.customerId;
      await deps.upsertBillingCustomerId(user.id, customerId);
    }

    const origin = resolveAppOrigin(req);
    const portalSession = await deps.createPortalSession(customerId, `${origin}/app/account`);

    return jsonResponse({ url: portalSession.url }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: errorMessage }, 500);
  }
}
