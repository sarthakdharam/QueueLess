export function hasSubscriptionAccess(subscription, now = new Date()) {
  if (!subscription) return false;
  if (subscription.status === "active") return Boolean(subscription.renewalDate && new Date(subscription.renewalDate) > now);
  if (subscription.status === "trial") return Boolean(subscription.trialEnd && new Date(subscription.trialEnd) > now);
  return false;
}
