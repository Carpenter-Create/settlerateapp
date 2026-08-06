import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  redactBreadcrumb,
  redactEvent,
  redactExtra,
  scrubString,
  type MinimalSentryEvent,
} from "@/lib/observabilityRedaction";

describe("scrubString", () => {
  it("redacts JWT-shaped strings", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    expect(scrubString(`token=${jwt}`)).not.toContain(jwt);
    expect(scrubString(`token=${jwt}`)).toContain("[REDACTED]");
  });

  it("redacts Bearer tokens", () => {
    expect(scrubString("Authorization: Bearer abc123XYZ")).toBe("Authorization: [REDACTED]");
  });

  it("redacts Stripe secret-shaped keys", () => {
    expect(scrubString("using sk_live_ABC123xyz for auth")).toBe(
      "using [REDACTED] for auth"
    );
    expect(scrubString("whsec_ABC123xyz")).toBe("[REDACTED]");
  });

  it("redacts email addresses", () => {
    expect(scrubString("contact jane.doe@example.com for help")).toBe(
      "contact [REDACTED] for help"
    );
  });

  it("redacts long digit runs (SSN/card/account-shaped)", () => {
    expect(scrubString("account 123456789012")).toBe("account [REDACTED]");
  });

  it("leaves ordinary text untouched", () => {
    expect(scrubString("Checkout session created")).toBe("Checkout session created");
  });

  it("fails closed: never throws, always returns a string", () => {
    expect(() => scrubString("")).not.toThrow();
    expect(scrubString("")).toBe("");
  });
});

describe("redactExtra — allowlist-based, fail-closed", () => {
  it("drops prohibited financial and mortgage fields", () => {
    const input = {
      purchasePrice: 500000,
      loanAmount: 400000,
      rate: 6.5,
      downPayment: 100000,
      income: 150000,
      assetValue: 20000,
      debtValue: 5000,
      paymentDetails: "4111111111111111",
    };
    expect(redactExtra(input)).toEqual({});
  });

  it("drops prohibited credentials and identity data", () => {
    const input = {
      password: "hunter2",
      authToken: "abc",
      jwt: "eyJhbGciOiJIUzI1NiJ9.x.y",
      cookie: "session=abc",
      authorization: "Bearer abc",
      stripeSecret: "sk_live_abc",
      rawStripePayload: { id: "evt_1" },
      serviceRoleCredential: "abc",
      name: "Jane Doe",
      email: "jane@example.com",
      address: "123 Main St",
    };
    expect(redactExtra(input)).toEqual({});
  });

  it("preserves approved opaque identifiers and generic status/error metadata", () => {
    const input = {
      user_id: "11111111-1111-1111-1111-111111111111",
      event_id: "evt_123",
      request_id: "req_abc",
      customer_id: "cus_123",
      subscription_id: "sub_123",
      scenario_id: "scn_123",
      comparison_id: "cmp_123",
      price_id: "price_123",
      product_id: "prod_123",
      code: "CHECKOUT_MAINTENANCE",
      status: "active",
      action_taken: "updated",
      entitlement_status: "entitled",
      plan_code: "professional",
      function_name: "create-checkout",
      environment: "production",
    };
    expect(redactExtra(input)).toEqual(input);
  });

  it("drops non-scalar values even on allowlisted keys", () => {
    expect(redactExtra({ user_id: { nested: true } })).toEqual({});
    expect(redactExtra({ code: ["a", "b"] })).toEqual({});
  });

  it("scrubs string values on allowlisted keys that happen to contain secret-shaped text", () => {
    expect(redactExtra({ status: "Bearer abc123" })).toEqual({ status: "[REDACTED]" });
  });

  it("is fail-closed for non-object input", () => {
    expect(redactExtra(null)).toEqual({});
    expect(redactExtra(undefined)).toEqual({});
  });
});

describe("redactBreadcrumb — fail-closed", () => {
  it("drops breadcrumbs outside the approved category allowlist", () => {
    expect(redactBreadcrumb({ category: "console", message: "log line" })).toBeNull();
    expect(redactBreadcrumb({ category: "xhr", message: "GET /api" })).toBeNull();
    expect(redactBreadcrumb({ category: "fetch", data: { url: "/api" } })).toBeNull();
  });

  it("keeps approved categories and scrubs their contents", () => {
    const result = redactBreadcrumb({
      category: "navigation",
      type: "navigation",
      message: "contact jane@example.com",
      data: { user_id: "u1", income: 100 },
    });
    expect(result).toEqual({
      category: "navigation",
      type: "navigation",
      message: "[REDACTED]",
      data: { user_id: "u1" },
    });
  });

  it("returns null for null/undefined input", () => {
    expect(redactBreadcrumb(null)).toBeNull();
    expect(redactBreadcrumb(undefined)).toBeNull();
  });
});

describe("redactEvent — fail-closed", () => {
  it("strips request and user objects entirely", () => {
    const event: MinimalSentryEvent = {
      request: { url: "https://app.settlerate.com", data: { income: 100 } },
      user: { email: "jane@example.com" },
      message: "ok",
    };
    const result = redactEvent(event);
    expect(result).not.toHaveProperty("request");
    expect(result).not.toHaveProperty("user");
  });

  it("scrubs message and exception values, drops contexts, allowlist-filters extra/tags", () => {
    const event: MinimalSentryEvent = {
      message: "Failed for jane@example.com",
      exception: {
        values: [{ type: "Error", value: "token Bearer abc123" }],
      },
      extra: { user_id: "u1", income: 999 },
      tags: { code: "ERR", loanAmount: 1 },
      contexts: { device: { arch: "x64" } },
      breadcrumbs: [
        { category: "console", message: "leak" },
        { category: "navigation", message: "ok" },
      ],
    };
    const result = redactEvent(event);
    expect(result?.message).toBe("Failed for [REDACTED]");
    expect(result?.exception?.values?.[0].value).toBe("token [REDACTED]");
    expect(result?.extra).toEqual({ user_id: "u1" });
    expect(result?.tags).toEqual({ code: "ERR" });
    expect(result?.contexts).toEqual({});
    expect(result?.breadcrumbs).toEqual([{ category: "navigation", message: "ok" }]);
  });

  it("returns null for null/undefined input", () => {
    expect(redactEvent(null)).toBeNull();
    expect(redactEvent(undefined)).toBeNull();
  });
});

describe("observabilityRedaction mirror sync", () => {
  it("Deno shared module matches src/lib (byte-identical)", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/observabilityRedaction.ts"), "utf8");
    const deno = readFileSync(
      join(process.cwd(), "supabase/functions/_shared/observabilityRedaction.ts"),
      "utf8"
    );
    expect(createHash("sha256").update(deno).digest("hex")).toBe(
      createHash("sha256").update(src).digest("hex")
    );
  });
});
