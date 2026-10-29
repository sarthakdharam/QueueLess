import test from 'node:test'
import assert from 'node:assert/strict'
import { simulatorFailureMessage, simulatorSuccessMessage } from '../src/utils/simulator-feedback.js'

test('simulated success is clearly distinguished from real phone delivery', () => {
  assert.equal(simulatorSuccessMessage({ deliveryStatus: 'simulated', simulationMode: true, realMessageSent: false }), 'Simulator succeeded. No real message was sent.')
  assert.throws(() => simulatorSuccessMessage({ deliveryStatus: 'delivered', simulationMode: true, realMessageSent: false }), /did not confirm/)
})

test('simulator API failure displays an error and never a success message', () => {
  assert.equal(simulatorFailureMessage({ response: { data: { error: 'The development simulator failed to deliver the test message.' } } }), 'The development simulator failed to deliver the test message.')
  assert.match(simulatorFailureMessage(new Error('The simulator failed. No success was recorded.')), /failed/)
})
