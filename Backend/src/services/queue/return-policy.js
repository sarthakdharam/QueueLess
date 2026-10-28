export function calculateReturnPlacement(waiting, policy, configuredAhead, override = null) {
  const patientsAhead = override?.patientsAhead ?? (policy === "at_end" ? waiting.length : Math.min(configuredAhead, waiting.length));
  const queueOrder = patientsAhead === 0
    ? Number(waiting[0]?.queue_order || 1000) - 1000
    : Number(waiting[patientsAhead - 1].queue_order) + 1;
  const shifted = waiting.slice(patientsAhead).reverse().map((entry) => ({ id: entry.id, queueOrder: Number(entry.queue_order) + 1000 }));
  return { patientsAhead, queueOrder, shifted };
}
