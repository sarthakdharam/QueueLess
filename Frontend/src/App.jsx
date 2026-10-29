import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import './patient.css'
import './experience.css'
import './theme.css'
import { LanguageProvider, LanguageSwitcher } from './i18n.jsx'
import Landing from './pages/landing.jsx'
import AuthPage from './pages/auth-page.jsx'
import ClinicHome from './pages/clinic-home.jsx'
import ClinicSetup from './pages/clinic-setup.jsx'
import ClinicDashboard from './pages/clinic-dashboard.jsx'
import ClinicFinder from './pages/clinic-finder.jsx'
import ClinicBooking from './pages/clinic-booking.jsx'
import PatientRegistration from './pages/patient-registration.jsx'
import PatientRecovery from './pages/patient-recovery.jsx'
import ClinicBilling from './pages/clinic-billing.jsx'
import ClinicNotifications from './pages/clinic-notifications.jsx'
import ClinicPatients from './pages/clinic-patients.jsx'

export default function App() {
  return (
    <LanguageProvider>
    <LanguageSwitcher/>
    <Routes>
      <Route path="/" element={<Landing/>}/>
      <Route path="/register" element={<AuthPage mode="register"/>}/>
      <Route path="/login" element={<AuthPage mode="login"/>}/>
      <Route path="/clinics" element={<ClinicFinder/>}/>
      <Route path="/clinic/:clinicId/book" element={<ClinicBooking/>}/>
      <Route path="/patient/registration" element={<PatientRegistration/>}/>
      <Route path="/patient/recover" element={<PatientRecovery/>}/>
      <Route path="/clinic" element={<ClinicHome/>}/>
      <Route path="/clinic/setup" element={<ClinicSetup/>}/>
      <Route path="/clinic/queue" element={<ClinicDashboard/>}/>
      <Route path="/clinic/patients/today" element={<ClinicPatients mode="today"/>}/>
      <Route path="/clinic/patients/history" element={<ClinicPatients mode="history"/>}/>
      <Route path="/clinic/billing" element={<ClinicBilling/>}/>
      <Route path="/clinic/notifications" element={<ClinicNotifications/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </LanguageProvider>
  )
}
