import { randomUUID } from "node:crypto";

export async function createPaymentOrder({ amount, receipt, notes }) {
  if (process.env.PAYMENT_PROVIDER !== "razorpay") return { provider: "simulator", orderId: `sim_${randomUUID()}`, amount, currency: "INR" };
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay credentials are not configured.");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount, currency: "INR", receipt, notes }),
  });
  const order = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(order.error?.description || "Payment provider could not create an order.");
  return { provider: "razorpay", orderId: order.id, amount: order.amount, currency: order.currency, keyId };
}
