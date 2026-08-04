/**
 * Admin-only locked-rate editing capability.
 * Not derived from planCode, advisor billing, or client simulation flags.
 */
export function canEditLockedRatesCapability(options: {
  realIsAdmin: boolean;
  adminLoading: boolean;
  isEntitlementPending: boolean;
}): boolean {
  if (options.isEntitlementPending || options.adminLoading) return false;
  return options.realIsAdmin;
}
