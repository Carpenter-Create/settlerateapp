import { describe, expect, it } from "vitest";
import {
  accountAccessConditionLabel,
  accountPlanBadgeVariant,
  accountPlanDescription,
  planLabelFromCode,
} from "@/lib/accountPlanDisplay";

describe("accountPlanDisplay", () => {
  it("professional + entitled shows Professional with full-access copy", () => {
    expect(planLabelFromCode("professional")).toBe("Professional");
    expect(accountAccessConditionLabel("entitled")).toBeNull();
    expect(accountPlanBadgeVariant("professional")).toBe("default");
    expect(accountPlanDescription("professional", "entitled")).toMatch(/Full access/);
    expect(accountPlanDescription("professional", "entitled")).not.toMatch(/Analytical/);
  });

  it("professional + trial_entitled keeps Professional identity", () => {
    expect(planLabelFromCode("professional")).toBe("Professional");
    expect(accountAccessConditionLabel("trial_entitled")).toBeNull();
    expect(accountPlanDescription("professional", "trial_entitled")).toMatch(/trial/i);
    expect(accountPlanDescription("professional", "trial_entitled")).not.toMatch(
      /Analytical/
    );
  });

  it("professional + read_only keeps Professional and surfaces Read-only", () => {
    expect(planLabelFromCode("professional")).toBe("Professional");
    expect(accountAccessConditionLabel("read_only")).toBe("Read-only");
    expect(accountPlanDescription("professional", "read_only")).toMatch(/restricted/i);
    expect(accountPlanDescription("professional", "read_only")).not.toMatch(/Analytical/);
    expect(accountPlanDescription("professional", "read_only")).not.toMatch(
      /downgraded/i
    );
  });

  it("analytical + free shows Analytical free-tier copy", () => {
    expect(planLabelFromCode("analytical")).toBe("Analytical");
    expect(accountAccessConditionLabel("free")).toBeNull();
    expect(accountPlanBadgeVariant("analytical")).toBe("secondary");
    expect(accountPlanDescription("analytical", "free")).toMatch(/3 saved scenarios/);
  });
});
