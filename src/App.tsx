import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'
import { useSupabaseSync } from './hooks/useSupabaseSync'
import { fetchMe } from './api/auth'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import SettingsPage from './pages/SettingsPage'
import CalendarPage from './pages/CalendarPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const setStravaConnected = useAppStore((s) => s.setStravaConnected)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    fetchMe().then((me) => {
      if (me) {
        setUser({ id: me.id, username: me.username })
        setStravaConnected(me.stravaConnected)
      } else {
        setUser(null)
      }
      setChecked(true)
    })
  }, [])

  if (!checked) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppInner() {
  useSupabaseSync()
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        }
      />
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
