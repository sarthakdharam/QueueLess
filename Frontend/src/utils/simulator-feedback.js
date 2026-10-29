export function simulatorSuccessMessage(notification) {
  if (notification?.deliveryStatus !== 'simulated' || notification.simulationMode !== true || notification.realMessageSent !== false) {
    throw new Error('The simulator did not confirm a simulated-only success.')
  }
  return 'Simulator succeeded. No real message was sent.'
}

export function simulatorFailureMessage(error) {
  return error?.response?.data?.error || error?.message || 'The simulator failed. No success was recorded.'
}
