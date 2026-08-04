import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_APP_ORIGIN,
  resolveAppOrigin,
} from "../../../supabase/functions/_shared/appOrigin";
import {
  handleCustomerPortalRequest,
  type CustomerPortalDeps,
} from "../../../supabase/functions/customer-portal/handler";

const USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const CUSTOMER_A = "cus_test_user_a";
const CUSTOMER_B = "cus_test_user_b";

function requestWithAuth(
  token: string,
  options: { origin?: string | null; body?: Record<string, unknown> } = {}
): Request {
  const headers = new Headers({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  });
  if (options.origin !== undefined && options.origin !== null) {
    headers.set("origin", options.origin);
  }
  return new Request("https://example.invalid/functions/v1/customer-portal", {
    method: "POST",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

function makeDeps(overrides: Partial<CustomerPortalDeps> = {}): CustomerPortalDeps {
  return {
    getUserFromToken: vi.fn(async () => ({
      user: { id: USER_A, email: "user-a@example.com" },
      error: null,
    })),
    isAdmin: vi.fn(async () => false),
    logAdminBypass: vi.fn(async () => undefined),
    getBillingCustomerId: vi.fn(async () => null),
    createPortalSession: vi.fn(async (_customerId, returnUrl) => ({
      url: `https://billing.stripe.com/session/test?return=${encodeURIComponent(returnUrl)}`,
      id: "bps_test",
    })),
    ...overrides,
  };
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("handleCustomerPortalRequest", () => {
  it("denies unauthenticated requests", async () => {
    const deps = makeDeps();
    const req = new Request("https://example.invalid/functions/v1/customer-portal", {
      method: "POST",
    });

    const response = await handleCustomerPortalRequest(req, deps);
    const body = await readJson(response);

    expect(response.status).toBe(500);
    expect(body.error).toBe("No authorization header provided");
    expect(deps.getBillingCustomerId).not.toHaveBeenCalled();
    expect(deps.createPortalSession).not.toHaveBeenCalled();
  });

  it("returns NO_STRIPE_CUSTOMER when no billing row exists", async () => {
    const deps = makeDeps({
      getBillingCustomerId: vi.fn(async () => null),
    });

    const response = await handleCustomerPortalRequest(requestWithAuth("valid-token"), deps);
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.code).toBe("NO_STRIPE_CUSTOMER");
    expect(body.url).toBeUndefined();
    expect(deps.createPortalSession).not.toHaveBeenCalled();
  });

  it("returns NO_STRIPE_CUSTOMER when billing row has no stripe_customer_id", async () => {
    const deps = makeDeps({
      getBillingCustomerId: vi.fn(async () => null),
    });

    const response = await handleCustomerPortalRequest(requestWithAuth("valid-token"), deps);
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.code).toBe("NO_STRIPE_CUSTOMER");
    expect(deps.createPortalSession).not.toHaveBeenCalled();
  });

  it("creates a portal session when billing.stripe_customer_id is present for the user", async () => {
    const deps = makeDeps({
      getBillingCustomerId: vi.fn(async (userId) => {
        expect(userId).toBe(USER_A);
        return CUSTOMER_A;
      }),
    });

    const response = await handleCustomerPortalRequest(
      requestWithAuth("valid-token", { origin: "https://app.settlerate.com" }),
      deps
    );
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(typeof body.url).toBe("string");
    expect(deps.createPortalSession).toHaveBeenCalledOnce();
    expect(deps.createPortalSession).toHaveBeenCalledWith(
      CUSTOMER_A,
      "https://app.settlerate.com/app/account"
    );
  });

  it("ignores client-supplied customer IDs", async () => {
    const deps = makeDeps({
      getBillingCustomerId: vi.fn(async () => CUSTOMER_A),
    });

    const response = await handleCustomerPortalRequest(
      requestWithAuth("valid-token", {
        body: { stripeCustomerId: CUSTOMER_B, customerId: CUSTOMER_B },
      }),
      deps
    );
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.url).toBeDefined();
    expect(deps.createPortalSession).toHaveBeenCalledWith(
      CUSTOMER_A,
      `${DEFAULT_APP_ORIGIN}/app/account`
    );
    expect(deps.createPortalSession).not.toHaveBeenCalledWith(CUSTOMER_B, expect.any(String));
  });

  it("does not use another user's billing mapping", async () => {
    const deps = makeDeps({
      getUserFromToken: vi.fn(async () => ({
        user: { id: USER_B, email: "user-b@example.com" },
        error: null,
      })),
      getBillingCustomerId: vi.fn(async (userId) => {
        expect(userId).toBe(USER_B);
        return null;
      }),
    });

    const response = await handleCustomerPortalRequest(requestWithAuth("valid-token"), deps);
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.code).toBe("NO_STRIPE_CUSTOMER");
    expect(deps.createPortalSession).not.toHaveBeenCalled();
  });

  it("does not establish ownership from a matching Stripe email without billing binding", async () => {
    const listCustomersByEmail = vi.fn(async () => ({
      data: [{ id: CUSTOMER_A, metadata: { user_id: USER_A } }],
    }));

    const deps = makeDeps({
      getBillingCustomerId: vi.fn(async () => null),
      createPortalSession: vi.fn(async () => {
        throw new Error("portal session must not be created without billing binding");
      }),
    });

    const response = await handleCustomerPortalRequest(
      requestWithAuth("valid-token"),
      deps
    );
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.code).toBe("NO_STRIPE_CUSTOMER");
    expect(listCustomersByEmail).not.toHaveBeenCalled();
    expect(deps.createPortalSession).not.toHaveBeenCalled();
  });

  it("rejects arbitrary origins for portal return URLs", async () => {
    const deps = makeDeps({
      getBillingCustomerId: vi.fn(async () => CUSTOMER_A),
    });

    const evilOrigin = "https://evil.example";
    expect(resolveAppOrigin(requestWithAuth("valid-token", { origin: evilOrigin }))).toBe(
      DEFAULT_APP_ORIGIN
    );

    const response = await handleCustomerPortalRequest(
      requestWithAuth("valid-token", { origin: evilOrigin }),
      deps
    );

    expect(response.status).toBe(200);
    expect(deps.createPortalSession).toHaveBeenCalledWith(
      CUSTOMER_A,
      `${DEFAULT_APP_ORIGIN}/app/account`
    );
  });

  it("returns ADMIN_USER for server-verified admins without opening portal", async () => {
    const deps = makeDeps({
      isAdmin: vi.fn(async () => true),
    });

    const response = await handleCustomerPortalRequest(requestWithAuth("admin-token"), deps);
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.code).toBe("ADMIN_USER");
    expect(deps.logAdminBypass).toHaveBeenCalledOnce();
    expect(deps.getBillingCustomerId).not.toHaveBeenCalled();
    expect(deps.createPortalSession).not.toHaveBeenCalled();
  });
});
