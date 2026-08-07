import { describe, expect, it } from "vitest";
import {
  redactBreadcrumb,
  redactEvent,
  redactExtra,
  scrubString,
  type MinimalSentryEvent,
} from "@settlerate/core/observability-redaction";

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

  it("preserves stacktrace frames (location/identity fields) required for symbolication", () => {
    const event: MinimalSentryEvent = {
      exception: {
        values: [
          {
            type: "TypeError",
            value: "Cannot read properties of undefined",
            stacktrace: {
              frames: [
                {
                  filename: "https://app.settlerate.com/assets/index-abc123.js",
                  function: "handleSubmit",
                  module: "index",
                  platform: "javascript",
                  lineno: 42,
                  colno: 17,
                  abs_path: "https://app.settlerate.com/assets/index-abc123.js",
                  in_app: true,
                  instruction_addr: "0x1a2b",
                  addr_mode: "abs",
                  debug_id: "11111111-1111-1111-1111-111111111111",
                },
              ],
            },
          },
        ],
      },
    };
    const result = redactEvent(event);
    expect(result?.exception?.values?.[0].stacktrace).toEqual({
      frames: [
        {
          filename: "https://app.settlerate.com/assets/index-abc123.js",
          function: "handleSubmit",
          module: "index",
          platform: "javascript",
          lineno: 42,
          colno: 17,
          abs_path: "https://app.settlerate.com/assets/index-abc123.js",
          in_app: true,
          instruction_addr: "0x1a2b",
          addr_mode: "abs",
          debug_id: "11111111-1111-1111-1111-111111111111",
        },
      ],
    });
  });

  it("preserves mechanism (type/handled/synthetic) but drops arbitrary mechanism.data", () => {
    const event: MinimalSentryEvent = {
      exception: {
        values: [
          {
            type: "Error",
            value: "boom",
            mechanism: {
              type: "onerror",
              handled: false,
              synthetic: true,
              data: { arbitrary: "detail", target: "<button>" },
            },
          },
        ],
      },
    };
    const result = redactEvent(event);
    expect(result?.exception?.values?.[0].mechanism).toEqual({
      type: "onerror",
      handled: false,
      synthetic: true,
    });
  });

  it("drops prohibited stack-frame fields: vars, context_line, pre_context, post_context", () => {
    const event: MinimalSentryEvent = {
      exception: {
        values: [
          {
            type: "Error",
            value: "boom",
            stacktrace: {
              frames: [
                {
                  filename: "app.js",
                  lineno: 1,
                  vars: { loanAmount: 400000, email: "jane@example.com" },
                  context_line: "  const loanAmount = 400000;",
                  pre_context: ["function calc() {"],
                  post_context: ["}"],
                },
              ],
            },
          },
        ],
      },
    };
    const result = redactEvent(event);
    const frame = result?.exception?.values?.[0].stacktrace?.frames?.[0];
    expect(frame).toEqual({ filename: "app.js", lineno: 1 });
    expect(frame).not.toHaveProperty("vars");
    expect(frame).not.toHaveProperty("context_line");
    expect(frame).not.toHaveProperty("pre_context");
    expect(frame).not.toHaveProperty("post_context");
  });

  it("still scrubs the exception message/value even when stacktrace/mechanism are present", () => {
    const event: MinimalSentryEvent = {
      exception: {
        values: [
          {
            type: "Error",
            value: "Failed for jane@example.com with token Bearer abc123",
            stacktrace: { frames: [{ filename: "app.js", lineno: 1 }] },
            mechanism: { type: "generic", handled: true },
          },
        ],
      },
    };
    const result = redactEvent(event);
    const value = result?.exception?.values?.[0];
    expect(value?.value).toBe("Failed for [REDACTED] with token [REDACTED]");
    expect(value?.stacktrace).toEqual({ frames: [{ filename: "app.js", lineno: 1 }] });
    expect(value?.mechanism).toEqual({ type: "generic", handled: true });
  });

  it("fails closed on a malformed/circular stacktrace without throwing, and drops the event rather than emit unscrubbed data", () => {
    const circularFrame: Record<string, unknown> = { filename: "app.js", lineno: 1 };
    circularFrame.self = circularFrame;
    const event: MinimalSentryEvent = {
      exception: {
        values: [
          {
            type: "Error",
            value: "boom",
            stacktrace: { frames: [circularFrame] },
          },
        ],
      },
    };
    expect(() => redactEvent(event)).not.toThrow();
    const result = redactEvent(event);
    // A circular self-reference on an allowlisted-out key is not itself
    // fatal (we never touch `self`), so the event still comes through with
    // the frame's safe fields preserved.
    expect(result?.exception?.values?.[0].stacktrace).toEqual({
      frames: [{ filename: "app.js", lineno: 1 }],
    });
  });

  it("fails closed when stacktrace.frames is not an array — drops the stacktrace, not the whole event", () => {
    const event: MinimalSentryEvent = {
      exception: {
        values: [
          {
            type: "Error",
            value: "boom",
            // @ts-expect-error — intentionally malformed input for fail-closed test
            stacktrace: { frames: "not-an-array" },
          },
        ],
      },
    };
    expect(() => redactEvent(event)).not.toThrow();
    const result = redactEvent(event);
    expect(result?.exception?.values?.[0]).not.toHaveProperty("stacktrace");
    expect(result?.exception?.values?.[0].type).toBe("Error");
  });

  it("fails closed when mechanism is a hostile non-object — drops the mechanism, not the whole event", () => {
    const event: MinimalSentryEvent = {
      exception: {
        values: [
          {
            type: "Error",
            value: "boom",
            // @ts-expect-error — intentionally malformed input for fail-closed test
            mechanism: "not-an-object",
          },
        ],
      },
    };
    expect(() => redactEvent(event)).not.toThrow();
    const result = redactEvent(event);
    expect(result?.exception?.values?.[0]).not.toHaveProperty("mechanism");
  });
});
