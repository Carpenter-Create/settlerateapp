import { describe, expect, it } from "vitest";
import { resolveNewScenarioControl } from "@/lib/newScenarioControl";

describe("resolveNewScenarioControl", () => {
  it("exposes a calculator link when creation is allowed", () => {
    expect(resolveNewScenarioControl(true)).toEqual({
      mode: "link",
      to: "/app/calculator",
    });
  });

  it("blocks navigation with a disabled control when creation is not allowed", () => {
    const control = resolveNewScenarioControl(
      false,
      "Free plan limit reached (3 saved scenarios)."
    );
    expect(control).toEqual({
      mode: "disabled",
      title: "Free plan limit reached (3 saved scenarios).",
    });
    expect(control.mode).toBe("disabled");
    if (control.mode === "disabled") {
      expect("to" in control).toBe(false);
      expect("href" in control).toBe(false);
    }
  });

  it("never returns a link target when canSave is false", () => {
    const control = resolveNewScenarioControl(false);
    expect(control.mode).not.toBe("link");
    expect(JSON.stringify(control)).not.toContain("/app/calculator");
  });
});
