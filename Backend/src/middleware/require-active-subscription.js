import { AppDataSource } from "../config/data-source.js";
import { Subscription } from "../entities/Subscription.js";
import { hasSubscriptionAccess } from "../services/subscriptions/access-policy.js";

export async function requireActiveSubscription(req, res, next) {
  try {
    const subscription = await AppDataSource.getRepository(Subscription).findOneBy({ clinicId: req.auth.clinicId });
    if (!hasSubscriptionAccess(subscription)) {
      return res.status(402).json({ error: "The free trial has ended. Renew the clinic subscription to accept new registrations.", code: "SUBSCRIPTION_REQUIRED" });
    }
    return next();
  } catch (error) { return next(error); }
}
