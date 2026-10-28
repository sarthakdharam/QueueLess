import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeAppointmentCapacityInput, parseAppointmentCapacity } from '../src/components/validation.js'

test('appointment capacity accepts positive integer edits and normalizes leading zeroes after validation', () => {
  assert.equal(parseAppointmentCapacity('8'), 8)
  assert.equal(parseAppointmentCapacity('12'), 12)
  assert.equal(parseAppointmentCapacity('06'), 6)
  assert.equal(parseAppointmentCapacity('100'), 100)
  assert.equal(normalizeAppointmentCapacityInput('006'), '6')
  assert.equal(normalizeAppointmentCapacityInput(''), '')
})

test('appointment capacity rejects empty, zero, negative, decimal and out-of-range values', () => {
  for (const input of ['', '0', '-1', '2.5', '101', 'abc']) assert.equal(parseAppointmentCapacity(input), null, `expected ${JSON.stringify(input)} to be invalid`)
})
