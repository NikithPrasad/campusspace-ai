import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import { Loader2 } from 'lucide-react'
import Login from './pages/Login'
import Register from './pages/Register'
import Resources from './pages/Resources'
import ResourceDetail from './pages/ResourceDetail'
import MyBookings from './pages/MyBookings'
import Dashboard from './pages/admin/Dashboard'
import AdminBookings from './pages/admin/AdminBookings'
import AdminResources from './pages/admin/AdminResources'

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
    </div>
  )
}

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  return user ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/'} replace /> : children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Resources />} />
        <Route path="resources/:id" element={<ResourceDetail />} />
        <Route path="my-bookings" element={<MyBookings />} />
        <Route path="admin" element={<RequireAuth role="ADMIN"><Dashboard /></RequireAuth>} />
        <Route path="admin/bookings" element={<RequireAuth role="ADMIN"><AdminBookings /></RequireAuth>} />
        <Route path="admin/resources" element={<RequireAuth role="ADMIN"><AdminResources /></RequireAuth>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
