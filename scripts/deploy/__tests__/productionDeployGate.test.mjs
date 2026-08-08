import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PRODUCTION_SUPABASE_REF, STAGING_SUPABASE_REF } from "../projectRefs.mjs";

const ROOT = join(import.meta.dirname, "../../..");
const GATE = join(ROOT, "scripts/deploy/productionDeployGate.mjs");

function runGate(args, env = {}) {
  return spawnSync(process.execPath, [GATE, ...args], {
    encoding: "utf8",
    cwd: ROOT,
    env: { ...process.env, ...env, SUPABASE_ACCESS_TOKEN: env.SUPABASE_ACCESS_TOKEN ?? "" },
  });
}

describe("productionDeployGate fail-closed", () => {
  it("refuses staging project ref", () => {
    const r = runGate(["--mode", "plan", "--project-ref", STAGING_SUPABASE_REF, "--allow-unverified-sha"], {
      SUPABASE_ACCESS_TOKEN: "dummy",
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/production_tool_targeted_staging|production_gate_got_staging/);
  });

  it("refuses unverified SHA promotion", () => {
    const r = runGate(
      ["--mode", "plan", "--project-ref", PRODUCTION_SUPABASE_REF, "--git-sha", "abc123"],
      { SUPABASE_ACCESS_TOKEN: "dummy", STAGING_VERIFIED_SHA: "different" },
    );
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toContain("unverified_sha_cannot_be_promoted");
  });

  it("blocks apply even when allow flag unset", () => {
    const r = runGate(
      [
        "--mode",
        "apply",
        "--project-ref",
        PRODUCTION_SUPABASE_REF,
        "--git-sha",
        "abc123",
        "--allow-unverified-sha",
      ],
      { SUPABASE_ACCESS_TOKEN: "dummy" },
    );
    expect(r.status).not.toBe(0);
    // May fail earlier on missing remote fetch — still must not mutate.
    const out = r.stderr + r.stdout;
    expect(out).not.toContain('"mutation": "applied"');
  });
});

describe("inspectMigrationLedger adversarial refs", () => {
  const INSPECT = join(ROOT, "scripts/deploy/inspectMigrationLedger.mjs");

  it("staging role refuses production ref", () => {
    const dir = mkdtempSync(join(tmpdir(), "epic9-"));
    const versions = join(dir, "v.json");
    writeFileSync(versions, '["20260808040000"]\n');
    const r = spawnSync(
      process.execPath,
      [
        INSPECT,
        "--role",
        "staging",
        "--project-ref",
        PRODUCTION_SUPABASE_REF,
        "--target-versions-file",
        versions,
      ],
      { encoding: "utf8", cwd: ROOT },
    );
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toContain("staging_tool_targeted_production");
  });
});
