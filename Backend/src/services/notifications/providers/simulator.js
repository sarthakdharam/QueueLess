import { randomUUID } from "node:crypto";

export async function sendSimulatedMessage({ templateName, variables, simulateFailure = false }) {
  if (process.env.NODE_ENV === "production") throw new Error("The development notification simulator is disabled in production.");
  if (simulateFailure || process.env.SIMULATOR_FORCE_FAILURE === "true") throw new Error("Notification simulator forced a delivery failure.");
  return { providerReference: `sim_${randomUUID()}`, simulated: true, preview: { templateName, variables } };
}
