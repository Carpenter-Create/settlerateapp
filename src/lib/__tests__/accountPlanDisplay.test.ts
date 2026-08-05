import { describe, expect, it } from "vitest";
import {
  PLAN_LABEL_FREE,
  PLAN_LABEL_PROFESSIONAL,
  accountAccessConditionLabel,
  accountPlanBadgeVariant,
  accountPlanDescription,
  planLabelFromCode,
} from "@/lib/accountPlanDisplay";

describe("accountPlanDisplay", () => {
  it("professional + entitled shows SettleRate Professional with full-access copy", () => {
    expect(planLabelFromCode("professional")).toBe(PLAN_LABEL_PROFESSIONAL);
    expect(planLabelFromCode("professional")).toBe("SettleRate Professional");
    expect(accountAccessConditionLabel("entitled")).toBeNull();
    expect(accountPlanBadgeVariant("professional")).toBe("default");
    expect(accountPlanDescription("professional", "entitled")).toMatch(/Full access/);
    expect(accountPlanDescription("professional", "entitled")).not.toMatch(/SettleRate Free/);
  });

  it("professional + trial_entitled keeps SettleRate Professional identity", () => {
    expect(planLabelFromCode("professional")).toBe(PLAN_LABEL_PROFESSIONAL);
    expect(accountAccessConditionLabel("trial_entitled")).toBeNull();
    expect(accountPlanDescription("professional", "trial_entitled")).toMatch(/trial/i);
    expect(accountPlanDescription("professional", "trial_entitled")).not.toMatch(
      /SettleRate Free/
    );
  });

  it("professional + read_only keeps SettleRate Professional and surfaces Read-only", () => {
    expect(planLabelFromCode("professional")).toBe(PLAN_LABEL_PROFESSIONAL);
    expect(accountAccessConditionLabel("read_only")).toBe("Read-only");
    expect(accountPlanDescription("professional", "read_only")).toMatch(/restricted/i);
    expect(accountPlanDescription("professional", "read_only")).not.toMatch(/SettleRate Free/);
    expect(accountPlanDescription("professional", "read_only")).not.toMatch(
      /downgraded/i
    );
  });

  it("analytical + free shows SettleRate Free free-tier copy", () => {
    expect(planLabelFromCode("analytical")).toBe(PLAN_LABEL_FREE);
    expect(planLabelFromCode("analytical")).toBe("SettleRate Free");
    expect(accountAccessConditionLabel("free")).toBeNull();
    expect(accountPlanBadgeVariant("analytical")).toBe("secondary");
    expect(accountPlanDescription("analytical", "free")).toMatch(/2 saved scenarios/);
  });
});
