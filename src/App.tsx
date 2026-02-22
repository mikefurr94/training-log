import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'
import { useSupabaseSync } from './hooks/useSupabaseSync'
import LoginPage from './pages/LoginPage'
import CallbackPage from './pages/CallbackPage'
import CalendarPage from './pages/CalendarPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const accessToken = useAppStore((s) => s.accessToken)
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppInner() {
  useSupabaseSync()
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <CalendarPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
