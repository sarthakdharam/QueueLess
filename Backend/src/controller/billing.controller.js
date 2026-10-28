import { randomUUID } from "node:crypto";
import { AppDataSource } from "../config/data-source.js";
import { Payment } from "../entities/Payment.js";
import { Subscription } from "../entities/Subscription.js";
import { Clinic } from "../entities/Clinic.js";
import { createPaymentOrder } from "../services/billing/payment-provider.js";
import { hasSubscriptionAccess } from "../services/subscriptions/access-policy.js";
import { hasValidWebhookSignature } from "../utils/webhook-signature.js";

async function recordPaymentOutcome(criteria, outcome) {
  return AppDataSource.transaction(async (manager) => {
    const payment = await manager.getRepository(Payment).createQueryBuilder("p")
      .where(criteria.where, criteria.parameters).setLock("pessimistic_write").getOne();
    if (!payment || payment.status === "captured" || (criteria.requirePending && payment.status !== "pending")) return null;
    payment.status = outcome;
    await manager.getRepository(Payment).save(payment);
    if (outcome === "captured") {
      const subscription = await manager.getRepository(Subscription).createQueryBuilder("s")
        .where("s.id = :subscriptionId AND s.clinic_id = :clinicId", { subscriptionId: payment.subscriptionId, clinicId: payment.clinicId })
        .setLock("pessimistic_write").getOne();
      if (!subscription) throw new Error("Subscription for this payment was not found.");
      const renewal = new Date(Math.max(Date.now(), new Date(subscription.renewalDate || subscription.trialEnd).getTime()));
      renewal.setMonth(renewal.getMonth() + 1);
      subscription.status = "active";
      subscription.renewalDate = renewal;
      await manager.getRepository(Subscription).save(subscription);
    }
    return payment;
  });
}

export async function getBilling(req, res, next) {
  try {
    const subscription = await AppDataSource.getRepository(Subscription).findOneBy({ clinicId: req.auth.clinicId });
    if (!subscription) return res.status(404).json({ error: "Subscription not found." });
    const payments = await AppDataSource.getRepository(Payment).find({ where: { clinicId: req.auth.clinicId }, order: { createdAt: "DESC" }, take: 30 });
    const now = Date.now();
    const end = subscription.status === "active" ? subscription.renewalDate : subscription.trialEnd;
    const accessStatus = hasSubscriptionAccess(subscription) ? "available" : "expired";
    return res.json({ subscription: { ...subscription, accessStatus, daysRemaining: Math.max(0, Math.ceil((new Date(end).getTime() - now) / 86400000)) }, plan: { name: "QueueLess Base", price: 500, currency: "INR", period: "month" }, payments });
  } catch (error) { return next(error); }
}

export async function startCheckout(req, res, next) {
  try {
    const [subscription, clinic] = await Promise.all([
      AppDataSource.getRepository(Subscription).findOneBy({ clinicId: req.auth.clinicId }),
      AppDataSource.getRepository(Clinic).findOneBy({ id: req.auth.clinicId }),
    ]);
    if (!subscription || !clinic) return res.status(404).json({ error: "Clinic subscription not found." });
    const order = await createPaymentOrder({ amount: 50000, receipt: `ql_${randomUUID().replaceAll("-", "").slice(0, 24)}`, notes: { clinicId: clinic.id, subscriptionId: subscription.id } });
    const payment = await AppDataSource.getRepository(Payment).save(AppDataSource.getRepository(Payment).create({ clinicId: clinic.id, subscriptionId: subscription.id, amount: 50000, status: "pending", provider: order.provider, providerReference: order.orderId }));
    return res.status(201).json({ paymentId: payment.id, ...order, description: "QueueLess Base monthly subscription" });
  } catch (error) { return next(error); }
}

export async function simulatePayment(req, res, next) {
  if (process.env.NODE_ENV === "production" || process.env.PAYMENT_PROVIDER === "razorpay") return res.status(404).json({ error: "Payment simulation is unavailable." });
  try {
    const payment = await recordPaymentOutcome({ where: "p.id = :id AND p.clinic_id = :clinicId AND p.provider = 'simulator'", parameters: { id: req.body.paymentId, clinicId: req.auth.clinicId }, requirePending: true }, req.body.outcome === "success" ? "captured" : "failed");
    if (!payment) return res.status(404).json({ error: "Pending simulated payment not found." });
    return res.json({ payment, message: payment.status === "captured" ? "Simulated payment succeeded. Subscription is active for one month." : "Simulated payment failed. No charge was made." });
  } catch (error) { return next(error); }
}

export async function razorpayWebhook(req, res) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.get("x-razorpay-signature") || "";
  if (!secret || !Buffer.isBuffer(req.body)) return res.status(400).json({ error: "Payment webhook is not configured." });
  if (!hasValidWebhookSignature(req.body, signature, secret)) return res.status(401).json({ error: "Invalid payment signature." });
  try {
    const event = JSON.parse(req.body.toString("utf8"));
    const orderId = event.payload?.payment?.entity?.order_id;
    if (!orderId || !["payment.captured", "payment.failed"].includes(event.event)) return res.json({ received: true });
    const captured = event.event === "payment.captured";
    await recordPaymentOutcome({ where: "p.provider_reference = :orderId AND p.provider = 'razorpay'", parameters: { orderId }, requirePending: false }, captured ? "captured" : "failed");
    return res.json({ received: true });
  } catch (error) {
    console.error("Payment webhook processing failed:", error.message);
    return res.status(500).json({ error: "Payment webhook processing failed." });
  }
}

export async function verifyWhatsAppWebhook(req, res) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
}

export async function receiveWhatsAppWebhook(req, res) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const signature = req.get("x-hub-signature-256") || "";
  if (!appSecret || !Buffer.isBuffer(req.body)) return res.status(400).json({ error: "WhatsApp webhook is not configured." });
  if (!hasValidWebhookSignature(req.body, signature, appSecret, "sha256=")) return res.status(401).json({ error: "Invalid signature." });
  try {
    const payload = JSON.parse(req.body.toString("utf8"));
    const statuses = (payload.entry || []).flatMap((entry) => entry.changes || []).flatMap((change) => change.value?.statuses || []);
    for (const status of statuses) {
      const deliveryStatus = status.status === "failed" ? "failed" : status.status;
      if (!["sent", "delivered", "read", "failed"].includes(deliveryStatus)) continue;
      await AppDataSource.query(
        `UPDATE notifications SET delivery_status = $1, delivered_at = CASE WHEN $1 IN ('delivered','read') THEN now() ELSE delivered_at END, failure_reason = $2 WHERE provider_reference = $3`,
        [deliveryStatus, status.errors?.[0]?.title || status.errors?.[0]?.message || null, status.id],
      );
    }
    return res.json({ received: true });
  } catch (error) {
    console.error("WhatsApp webhook processing failed:", error.message);
    return res.status(500).json({ error: "WhatsApp webhook processing failed." });
  }
}
