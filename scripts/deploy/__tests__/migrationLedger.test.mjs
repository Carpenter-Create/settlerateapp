import { describe, expect, it } from "vitest";
import {
  compareMigrationLedgers,
  listRepositoryMigrationVersions,
  parseVersionListText,
  defaultMigrationsDir,
} from "../migrationLedger.mjs";

describe("compareMigrationLedgers", () => {
  const repo = ["20260101000000", "20260201000000", "20260301000000"];

  it("reports aligned when tips match", () => {
    const r = compareMigrationLedgers(repo, repo);
    expect(r.status).toBe("aligned");
    expect(r.pending).toEqual([]);
    expect(r.repoTip).toBe("20260301000000");
  });

  it("reports pending when target is a proper prefix", () => {
    const r = compareMigrationLedgers(repo, ["20260101000000", "20260201000000"]);
    expect(r.status).toBe("pending");
    expect(r.pending).toEqual(["20260301000000"]);
    expect(r.targetTip).toBe("20260201000000");
  });

  it("fails closed on target-only versions", () => {
    const r = compareMigrationLedgers(repo, ["20260101000000", "20991231000000"]);
    expect(r.status).toBe("diverged");
    expect(r.pending).toEqual([]);
    expect(r.targetOnly).toContain("20991231000000");
  });

  it("fails closed on ordering divergence inside common set", () => {
    // Target skipped middle version — not a prefix of repo
    const r = compareMigrationLedgers(repo, ["20260101000000", "20260301000000"]);
    expect(r.status).toBe("diverged");
    expect(r.reasons.some((x) => x.startsWith("ordering_divergence"))).toBe(true);
  });

  it("enumerates Epic-8-style pending without applying (strict prefix)", () => {
    const prodTip = ["20260808040000"];
    const git = ["20260808040000", "20260808143109", "20260808200000"];
    const r = compareMigrationLedgers(git, prodTip);
    expect(r.status).toBe("pending");
    expect(r.pending).toEqual(["20260808143109", "20260808200000"]);
  });
});

describe("compareMigrationLedgers tip_anchored (production)", () => {
  it("enumerates post-tip pending despite historical target-only skew", () => {
    const repo = [
      "20260111225012",
      "20260808040000",
      "20260808143109",
      "20260808200000",
    ];
    const target = [
      "20260111225011", // historical skew (not in repo)
      "20260808040000",
    ];
    const r = compareMigrationLedgers(repo, target, { mode: "tip_anchored" });
    expect(r.status).toBe("pending");
    expect(r.pending).toEqual(["20260808143109", "20260808200000"]);
    expect(r.historicalTargetOnly).toContain("20260111225011");
    expect(r.targetOnly).toEqual([]);
  });

  it("fails closed on unknown target tip", () => {
    const r = compareMigrationLedgers(
      ["20260808040000"],
      ["20991231000000"],
      { mode: "tip_anchored" },
    );
    expect(r.status).toBe("diverged");
    expect(r.reasons[0]).toContain("unknown_target_tip");
  });

  it("fails closed when target is ahead of repo", () => {
    const r = compareMigrationLedgers(
      ["20260808040000"],
      ["20260808040000", "20260809999999"],
      { mode: "tip_anchored" },
    );
    expect(r.status).toBe("diverged");
  });
});

describe("parseVersionListText", () => {
  it("parses JSON and free text", () => {
    expect(parseVersionListText('["20260808040000","20260808200000"]')).toEqual([
      "20260808040000",
      "20260808200000",
    ]);
    expect(parseVersionListText("Local 20260808040000 Remote 20260808040000")).toEqual([
      "20260808040000",
    ]);
  });
});

describe("listRepositoryMigrationVersions", () => {
  it("reads ordered versions from supabase/migrations", () => {
    const versions = listRepositoryMigrationVersions(defaultMigrationsDir());
    expect(versions.length).toBeGreaterThan(10);
    expect(versions[versions.length - 1]).toBe("20260808200000");
    // Sorted ascending
    for (let i = 1; i < versions.length; i++) {
      expect(versions[i] > versions[i - 1]).toBe(true);
    }
  });
});
