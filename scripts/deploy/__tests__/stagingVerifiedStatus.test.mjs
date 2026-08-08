import { describe, expect, it } from "vitest";
import { isTrustedStagingVerifiedSuccess } from "../stagingVerifiedStatus.mjs";

describe("isTrustedStagingVerifiedSuccess", () => {
  it("accepts GitHub Actions success with Actions run URL", () => {
    expect(
      isTrustedStagingVerifiedSuccess({
        context: "staging-verified",
        state: "success",
        creator: { login: "github-actions[bot]" },
        target_url:
          "https://github.com/Carpenter-Create/settlerateapp/actions/runs/31278937225",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects forged human or missing-run statuses", () => {
    expect(
      isTrustedStagingVerifiedSuccess({
        context: "staging-verified",
        state: "success",
        creator: { login: "acarpcreate" },
        target_url:
          "https://github.com/Carpenter-Create/settlerateapp/actions/runs/1",
      }).ok,
    ).toBe(false);

    expect(
      isTrustedStagingVerifiedSuccess({
        context: "staging-verified",
        state: "success",
        creator: { login: "github-actions[bot]" },
        target_url: "https://example.com",
      }).reason,
    ).toBe("missing_actions_run_url");
  });

  it("rejects non-success latest state", () => {
    expect(
      isTrustedStagingVerifiedSuccess({
        context: "staging-verified",
        state: "failure",
        creator: { login: "github-actions[bot]" },
        target_url:
          "https://github.com/Carpenter-Create/settlerateapp/actions/runs/1",
      }).ok,
    ).toBe(false);
  });
});
