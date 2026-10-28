import { io } from 'socket.io-client'

function queueSocket(auth) {
  return io(window.location.origin, { path: '/socket.io', auth, reconnection: true, reconnectionAttempts: Infinity, timeout: 8000 })
}

export const connectClinicQueue = (token) => queueSocket({ token })
export const connectPatientQueue = (accessToken) => queueSocket({ accessToken })
