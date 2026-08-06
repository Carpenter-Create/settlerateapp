import { describe, expect, it } from "vitest";
import { validateClientEnv } from "@/lib/clientEnv";

const VALID_URL = "https://vpcxzbaxhpucvevnkalo.supabase.co";
const VALID_KEY = "public-anon-key";

describe("validateClientEnv", () => {
  it("returns typed values for a valid configuration", () => {
    expect(
      validateClientEnv({
        VITE_SUPABASE_URL: VALID_URL,
        VITE_SUPABASE_PUBLISHABLE_KEY: VALID_KEY,
      })
    ).toEqual({
      supabaseUrl: VALID_URL,
      supabasePublishableKey: VALID_KEY,
    });
  });

  it("accepts a local development URL", () => {
    expect(
      validateClientEnv({
        VITE_SUPABASE_URL: "http://localhost:54321",
        VITE_SUPABASE_PUBLISHABLE_KEY: VALID_KEY,
      })
    ).toEqual({
      supabaseUrl: "http://localhost:54321",
      supabasePublishableKey: VALID_KEY,
    });
  });

  it("rejects a missing VITE_SUPABASE_URL", () => {
    expect(() =>
      validateClientEnv({ VITE_SUPABASE_PUBLISHABLE_KEY: VALID_KEY })
    ).toThrow(/VITE_SUPABASE_URL is missing or empty/);
  });

  it("rejects a blank VITE_SUPABASE_URL", () => {
    expect(() =>
      validateClientEnv({
        VITE_SUPABASE_URL: "   ",
        VITE_SUPABASE_PUBLISHABLE_KEY: VALID_KEY,
      })
    ).toThrow(/VITE_SUPABASE_URL is missing or empty/);
  });

  it("rejects a malformed VITE_SUPABASE_URL", () => {
    expect(() =>
      validateClientEnv({
        VITE_SUPABASE_URL: "not-a-url",
        VITE_SUPABASE_PUBLISHABLE_KEY: VALID_KEY,
      })
    ).toThrow(/VITE_SUPABASE_URL is malformed/);
  });

  it("rejects a non-http(s) protocol VITE_SUPABASE_URL", () => {
    expect(() =>
      validateClientEnv({
        VITE_SUPABASE_URL: "ftp://vpcxzbaxhpucvevnkalo.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: VALID_KEY,
      })
    ).toThrow(/VITE_SUPABASE_URL is malformed/);
  });

  it("rejects a missing VITE_SUPABASE_PUBLISHABLE_KEY", () => {
    expect(() => validateClientEnv({ VITE_SUPABASE_URL: VALID_URL })).toThrow(
      /VITE_SUPABASE_PUBLISHABLE_KEY is missing or empty/
    );
  });

  it("rejects a blank VITE_SUPABASE_PUBLISHABLE_KEY", () => {
    expect(() =>
      validateClientEnv({
        VITE_SUPABASE_URL: VALID_URL,
        VITE_SUPABASE_PUBLISHABLE_KEY: "  ",
      })
    ).toThrow(/VITE_SUPABASE_PUBLISHABLE_KEY is missing or empty/);
  });

  it("reports every problem when both variables are invalid", () => {
    expect(() => validateClientEnv({})).toThrow(
      /VITE_SUPABASE_URL is missing or empty[\s\S]*VITE_SUPABASE_PUBLISHABLE_KEY is missing or empty/
    );
  });

  it("never accepts or exposes a service-role or Stripe secret shape", () => {
    // Purely a type/shape assertion: the helper's signature only accepts the
    // two public client vars — there is no secret-key parameter to misuse.
    const result = validateClientEnv({
      VITE_SUPABASE_URL: VALID_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: VALID_KEY,
    });
    expect(Object.keys(result).sort()).toEqual(["supabasePublishableKey", "supabaseUrl"]);
  });
});
