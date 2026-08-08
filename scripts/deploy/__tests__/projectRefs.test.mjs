import { describe, expect, it } from "vitest";
import {
  PRODUCTION_SUPABASE_REF,
  STAGING_SUPABASE_REF,
  assertProjectRef,
  assertRoleProjectRef,
} from "../projectRefs.mjs";

describe("assertProjectRef", () => {
  it("accepts exact match", () => {
    expect(assertProjectRef(STAGING_SUPABASE_REF, STAGING_SUPABASE_REF)).toEqual({ ok: true });
  });

  it("rejects missing and mismatch", () => {
    expect(assertProjectRef("", STAGING_SUPABASE_REF).ok).toBe(false);
    expect(assertProjectRef(PRODUCTION_SUPABASE_REF, STAGING_SUPABASE_REF).reason).toContain(
      "project_ref_mismatch",
    );
  });
});

describe("assertRoleProjectRef", () => {
  it("staging refuses production ref", () => {
    const r = assertRoleProjectRef("staging", PRODUCTION_SUPABASE_REF);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("staging_tool_targeted_production");
  });

  it("staging accepts staging ref", () => {
    expect(assertRoleProjectRef("staging", STAGING_SUPABASE_REF)).toEqual({ ok: true });
  });

  it("production refuses staging ref", () => {
    const r = assertRoleProjectRef("production", STAGING_SUPABASE_REF);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("production_tool_targeted_staging");
  });

  it("production accepts production ref", () => {
    expect(assertRoleProjectRef("production", PRODUCTION_SUPABASE_REF)).toEqual({ ok: true });
  });
});
