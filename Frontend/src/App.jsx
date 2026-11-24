import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import "./patient.css";
import "./experience.css";
import "./theme.css";
import { LanguageProvider, LanguageSwitcher } from "./i18n.jsx";
import Landing from "./pages/landing.jsx";
import ClinicLoading from "./components/ClinicLoading.jsx";
import ToastViewport from "./components/ToastViewport.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";

const AuthPage = lazy(() => import("./pages/auth-page.jsx"));
const ClinicHome = lazy(() => import("./pages/clinic-home.jsx"));
const ClinicSetup = lazy(() => import("./pages/clinic-setup.jsx"));
const ClinicDashboard = lazy(() => import("./pages/clinic-dashboard.jsx"));
const ClinicFinder = lazy(() => import("./pages/clinic-finder.jsx"));
const ClinicBooking = lazy(() => import("./pages/clinic-booking.jsx"));
const PatientRegistration = lazy(() => import("./pages/patient-registration.jsx"));
const PatientRecovery = lazy(() => import("./pages/patient-recovery.jsx"));
const ClinicBilling = lazy(() => import("./pages/clinic-billing.jsx"));
const ClinicNotifications = lazy(() => import("./pages/clinic-notifications.jsx"));
const ClinicPatients = lazy(() => import("./pages/clinic-patients.jsx"));
const ClinicDoctorAvailability = lazy(() => import("./pages/clinic-doctor-availability.jsx"));
const ClinicAnalytics = lazy(() => import("./pages/clinic-analytics.jsx"));
const MockNotifications = lazy(() => import("./pages/mock-notifications.jsx"));

export default function App() {
  return (
    <LanguageProvider>
      <LanguageSwitcher />
      <ThemeToggle />
      <ToastViewport />
      <Suspense fallback={<ClinicLoading>Loading…</ClinicLoading>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/clinics" element={<ClinicFinder />} />
          <Route path="/clinic/:clinicId/book" element={<ClinicBooking />} />
          <Route path="/patient/registration" element={<PatientRegistration />} />
          <Route path="/patient/recover" element={<PatientRecovery />} />
          <Route path="/clinic" element={<ClinicHome />} />
          <Route path="/clinic/setup" element={<ClinicSetup />} />
          <Route path="/clinic/queue" element={<ClinicDashboard />} />
          <Route
            path="/clinic/patients/today"
            element={<ClinicPatients mode="today" />}
          />
          <Route
            path="/clinic/patients/history"
            element={<ClinicPatients mode="history" />}
          />
          <Route
            path="/clinic/doctor-availability"
            element={<ClinicDoctorAvailability />}
          />
          <Route path="/clinic/analytics" element={<ClinicAnalytics />} />
          <Route path="/clinic/billing" element={<ClinicBilling />} />
          <Route path="/clinic/notifications" element={<ClinicNotifications />} />
          {import.meta.env.DEV && (
            <Route path="/dev/notifications" element={<MockNotifications />} />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </LanguageProvider>
  );
}
