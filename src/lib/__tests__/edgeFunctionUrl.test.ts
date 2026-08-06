import { describe, expect, it } from "vitest";
import { buildEdgeFunctionUrl } from "@/lib/edgeFunctionUrl";

describe("buildEdgeFunctionUrl", () => {
  it("constructs the correct function path for a standard Supabase URL", () => {
    expect(
      buildEdgeFunctionUrl("https://vpcxzbaxhpucvevnkalo.supabase.co", "check-subscription")
    ).toBe("https://vpcxzbaxhpucvevnkalo.supabase.co/functions/v1/check-subscription");
  });

  it("normalizes a trailing slash on the base URL", () => {
    expect(
      buildEdgeFunctionUrl("https://vpcxzbaxhpucvevnkalo.supabase.co/", "create-checkout")
    ).toBe("https://vpcxzbaxhpucvevnkalo.supabase.co/functions/v1/create-checkout");
  });

  it("normalizes multiple trailing slashes on the base URL", () => {
    expect(
      buildEdgeFunctionUrl("https://vpcxzbaxhpucvevnkalo.supabase.co///", "customer-portal")
    ).toBe("https://vpcxzbaxhpucvevnkalo.supabase.co/functions/v1/customer-portal");
  });

  it("builds distinct correct paths per function name", () => {
    expect(
      buildEdgeFunctionUrl("https://example.supabase.co", "export-share")
    ).toBe("https://example.supabase.co/functions/v1/export-share");
    expect(
      buildEdgeFunctionUrl("https://example.supabase.co", "generate-pdf")
    ).toBe("https://example.supabase.co/functions/v1/generate-pdf");
  });

  it("supports local development base URLs", () => {
    expect(buildEdgeFunctionUrl("http://localhost:54321", "create-checkout")).toBe(
      "http://localhost:54321/functions/v1/create-checkout"
    );
  });

  it("rejects an empty base URL", () => {
    expect(() => buildEdgeFunctionUrl("", "create-checkout")).toThrow(
      /VITE_SUPABASE_URL is required/
    );
  });

  it("rejects a whitespace-only base URL", () => {
    expect(() => buildEdgeFunctionUrl("   ", "create-checkout")).toThrow(
      /VITE_SUPABASE_URL is required/
    );
  });

  it("rejects a missing base URL", () => {
    expect(() => buildEdgeFunctionUrl(undefined, "create-checkout")).toThrow(
      /VITE_SUPABASE_URL is required/
    );
    expect(() => buildEdgeFunctionUrl(null, "create-checkout")).toThrow(
      /VITE_SUPABASE_URL is required/
    );
  });

  it("rejects a malformed base URL", () => {
    expect(() => buildEdgeFunctionUrl("not-a-url", "create-checkout")).toThrow(
      /VITE_SUPABASE_URL is malformed/
    );
  });

  it("rejects a non-http(s) protocol base URL", () => {
    expect(() =>
      buildEdgeFunctionUrl("ftp://vpcxzbaxhpucvevnkalo.supabase.co", "create-checkout")
    ).toThrow(/must use http or https/);
  });

  it("never requires or exposes service-role credentials in its signature", () => {
    // Purely a type/shape assertion: the helper takes only a base URL and a
    // function name — no key/secret parameter exists to misuse.
    const result = buildEdgeFunctionUrl("https://example.supabase.co", "stripe-webhook");
    expect(result).not.toMatch(/service[-_]?role/i);
    expect(result).not.toMatch(/secret/i);
  });
});
