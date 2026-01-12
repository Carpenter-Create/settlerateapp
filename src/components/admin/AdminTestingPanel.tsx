/**
 * Admin Testing Panel
 * 
 * Allows administrators to simulate standard user experiences.
 * UI-only simulation - no database or Stripe mutations.
 */

import { useEffectiveAccess, EffectiveRole, EffectiveTier } from "@/hooks/useEffectiveAccess";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw } from "lucide-react";

/**
 * Testing mode panel - only renders for admin users.
 * Positioned at bottom of Settings page.
 */
export function AdminTestingPanel() {
  const {
    effectiveRole,
    effectiveTier,
    isSimulating,
    setEffectiveRole,
    setEffectiveTier,
    resetToAdmin,
    canSimulate,
  } = useEffectiveAccess();

  // Only render for actual admins
  if (!canSimulate) {
    return null;
  }

  return (
    <div className="border border-border rounded-sm p-6">
      <div className="space-y-4">
        <div>
          <h3 className="font-medium">Testing Mode</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Simulate user experiences without affecting real data.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Effective role selector */}
          <div className="space-y-2">
            <Label htmlFor="effective-role">Effective role</Label>
            <Select
              value={effectiveRole}
              onValueChange={(value) => setEffectiveRole(value as EffectiveRole)}
            >
              <SelectTrigger id="effective-role" className="rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="user">Standard user</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Effective tier selector - only when simulating user */}
          <div className="space-y-2">
            <Label htmlFor="effective-tier">Effective tier</Label>
            <Select
              value={effectiveTier}
              onValueChange={(value) => setEffectiveTier(value as EffectiveTier)}
              disabled={effectiveRole === "admin"}
            >
              <SelectTrigger id="effective-tier" className="rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free (Analytical)</SelectItem>
                <SelectItem value="pro">Professional</SelectItem>
                <SelectItem value="advisor">Advisor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status and reset */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {isSimulating
              ? `Viewing as: Standard user (${effectiveTier})`
              : "Viewing as: Administrator (full access)"}
          </p>
          {isSimulating && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-sm"
              onClick={resetToAdmin}
            >
              <RotateCcw className="mr-2 h-3 w-3" />
              Reset to administrator
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground border-t border-border pt-3 mt-3">
          Testing mode only affects this browser session. No data is modified.
        </p>
      </div>
    </div>
  );
}
