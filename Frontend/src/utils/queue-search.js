export function filterQueue(queue, search, awaitingCheckIn) {
  const query = search.trim().toLowerCase();
  const phoneDigits = /^[+\d\s().-]+$/.test(query)
    ? query.replace(/\D/g, "")
    : "";
  const token = /^a?0*(\d+)$/.exec(query)?.[1];

  return queue.filter((row) => {
    if (awaitingCheckIn && row.queue_status !== "registered") return false;
    if (!query) return true;
    return (
      row.patient_name?.toLowerCase().includes(query) ||
      row.reference?.toLowerCase().includes(query) ||
      (token && String(row.token_number) === token) ||
      (phoneDigits && row.patient_mobile?.replace(/\D/g, "").includes(phoneDigits))
    );
  });
}
