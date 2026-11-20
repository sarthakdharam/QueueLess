import { io } from "socket.io-client";

function queueSocket(getAuth) {
  return io(window.location.origin, {
    path: "/socket.io",
    auth: (callback) => callback(getAuth()),
    reconnection: true,
    reconnectionAttempts: Infinity,
    timeout: 8000,
  });
}

export const connectClinicQueue = () =>
  queueSocket(() => ({ token: localStorage.getItem("queueless.session") }));
export const connectPatientQueue = (accessToken) =>
  queueSocket(() => ({ accessToken }));
