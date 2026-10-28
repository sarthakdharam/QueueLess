import { randomUUID } from "node:crypto";

export async function sendSimulatedMessage({ templateName, variables, simulateFailure = process.env.SIMULATOR_FORCE_FAILURE === "true" }) {
  if (simulateFailure) throw new Error("Notification simulator forced a delivery failure.");
  return { providerReference: `sim_${randomUUID()}`, preview: { templateName, variables } };
}
