const listeners = new Set();

export function showToast(message, variant = "success") {
  if (!message) return;
  for (const listener of listeners)
    listener({ id: crypto.randomUUID(), message, variant });
}

export function subscribeToToasts(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
