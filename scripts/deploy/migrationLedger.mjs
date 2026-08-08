/**
 * Migration ledger comparison (ADR 0006 / ADR 0014).
 * Pure functions — no network. Adapters supply version lists.
 *
 * Modes:
 * - strict: target must be an exact ordered prefix of repo (staging).
 * - tip_anchored: compare by remote tip; pre-tip historical mismatches are
 *   reported but do not block pending enumeration (production after Epic 6
 *   history skew). Still fails closed when tip is unknown or remote is ahead.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * @param {string} migrationsDir
 * @returns {string[]} ordered version prefixes (14-digit)
 */
export function listRepositoryMigrationVersions(migrationsDir) {
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  const versions = [];
  for (const file of files) {
    const m = file.match(/^(\d{14})_/);
    if (!m) {
      throw new Error(`invalid_migration_filename:${file}`);
    }
    versions.push(m[1]);
  }
  versions.sort();
  for (let i = 1; i < versions.length; i++) {
    if (versions[i] === versions[i - 1]) {
      throw new Error(`duplicate_migration_version:${versions[i]}`);
    }
  }
  return versions;
}

/**
 * @typedef {'strict' | 'tip_anchored'} LedgerMode
 *
 * @param {string[]} repoVersions ascending
 * @param {string[]} targetVersions ascending (from schema_migrations)
 * @param {{ mode?: LedgerMode }} [options]
 * @returns {{
 *   status: "aligned" | "pending" | "diverged",
 *   mode: LedgerMode,
 *   repoTip: string | null,
 *   targetTip: string | null,
 *   pending: string[],
 *   targetOnly: string[],
 *   historicalTargetOnly: string[],
 *   reasons: string[],
 * }}
 */
export function compareMigrationLedgers(repoVersions, targetVersions, options = {}) {
  const mode = options.mode || "strict";
  const repo = [...repoVersions].sort();
  const target = [...targetVersions].sort();
  const repoSet = new Set(repo);
  const targetSet = new Set(target);
  const repoTip = repo[repo.length - 1] ?? null;
  const targetTip = target[target.length - 1] ?? null;
  const targetOnly = target.filter((v) => !repoSet.has(v));

  if (mode === "tip_anchored") {
    const reasons = [];
    if (!targetTip) {
      return {
        status: "diverged",
        mode,
        repoTip,
        targetTip: null,
        pending: [],
        targetOnly,
        historicalTargetOnly: targetOnly,
        reasons: ["target_tip_missing"],
      };
    }
    if (!repoSet.has(targetTip)) {
      reasons.push(`unknown_target_tip:${targetTip}`);
      return {
        status: "diverged",
        mode,
        repoTip,
        targetTip,
        pending: [],
        targetOnly,
        historicalTargetOnly: targetOnly,
        reasons,
      };
    }
    if (repoTip && targetTip > repoTip) {
      reasons.push(`target_ahead_of_repo:target=${targetTip}:repo=${repoTip}`);
      return {
        status: "diverged",
        mode,
        repoTip,
        targetTip,
        pending: [],
        targetOnly,
        historicalTargetOnly: targetOnly.filter((v) => v <= targetTip),
        reasons,
      };
    }
    // Versions on target after tip that are not in repo (should be empty if tip is max)
    const postTipTargetOnly = targetOnly.filter((v) => v > targetTip);
    if (postTipTargetOnly.length > 0) {
      reasons.push(`post_tip_target_only:${postTipTargetOnly.join(",")}`);
      return {
        status: "diverged",
        mode,
        repoTip,
        targetTip,
        pending: [],
        targetOnly,
        historicalTargetOnly: targetOnly.filter((v) => v <= targetTip),
        reasons,
      };
    }

    const pending = repo.filter((v) => v > targetTip);
    return {
      status: pending.length === 0 ? "aligned" : "pending",
      mode,
      repoTip,
      targetTip,
      pending,
      targetOnly: [],
      historicalTargetOnly: targetOnly,
      reasons: [],
    };
  }

  // strict
  const reasons = [];
  if (targetOnly.length > 0) {
    reasons.push(`target_only_versions:${targetOnly.join(",")}`);
  }

  let prefixOk = targetOnly.length === 0;
  if (prefixOk) {
    for (let i = 0; i < target.length; i++) {
      if (target[i] !== repo[i]) {
        prefixOk = false;
        reasons.push(
          `ordering_divergence:at=${i}:target=${target[i]}:repo=${repo[i]}`,
        );
        break;
      }
    }
  }

  const pending = prefixOk ? repo.filter((v) => !targetSet.has(v)) : [];
  if (!prefixOk) {
    return {
      status: "diverged",
      mode,
      repoTip,
      targetTip,
      pending: [],
      targetOnly,
      historicalTargetOnly: [],
      reasons,
    };
  }

  return {
    status: pending.length === 0 ? "aligned" : "pending",
    mode,
    repoTip,
    targetTip,
    pending,
    targetOnly: [],
    historicalTargetOnly: [],
    reasons: [],
  };
}

/**
 * Parse `supabase migration list` style lines or plain version lists.
 * @param {string} text
 * @returns {string[]}
 */
export function parseVersionListText(text) {
  const raw = (text ?? "").trim();
  if (!raw) return [];
  if (raw.startsWith("[")) {
    const arr = JSON.parse(raw);
    return arr
      .map(String)
      .map((v) => v.replace(/\D/g, "").slice(0, 14))
      .filter((v) => v.length === 14);
  }
  const found = raw.match(/\b\d{14}\b/g);
  return found ? [...new Set(found)].sort() : [];
}

export function defaultMigrationsDir(root = process.cwd()) {
  return join(root, "supabase/migrations");
}
