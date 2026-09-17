import React, { useState, useEffect, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { CSpinner } from '@coreui/react'
import { ToastContainer } from 'react-toastify'
import './scss/style.scss'
import './scss/examples.scss'
import 'react-toastify/dist/ReactToastify.css'

const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))
const Login = React.lazy(() => import('./views/pages/login/Login'))




function App() {
  const [user, setUser] = useState(
    JSON.parse(sessionStorage.getItem('user') || 'null')
  )

  useEffect(() => {
    const syncUser = () => {
      setUser(JSON.parse(sessionStorage.getItem('user') || 'null'))
    }

    window.addEventListener('storage', syncUser)

    return () => window.removeEventListener('storage', syncUser)
  }, [])

  const isAuth = !!user
  const isMasterUser = user?.mobilityWithoutCheck === true

  // 🔒 Assessment link ki login guard — link ippudu COMMON (employeeCode undadu).

  const ExamLinkGuard = () => {
    const location = useLocation()

    // 👇 employeeCode ippudu logged-in user nunchi vastundi, link nunchi kaadu
    return <AssessmentLanding employeeCode={user.employeeId} />
  }

  return (
    <HashRouter>
      <ToastContainer position="top-right" autoClose={3000} />
      <Suspense
        fallback={
          <div className="pt-3 text-center">
            <CSpinner color="primary" variant="grow" />
          </div>
        }
      >
        <Routes>
          {/* Default */}
          <Route
            path="/"
            element={
              !isAuth ? (
                <Navigate to="/login" replace />
              ) : isMasterUser ? (
                <Navigate to="/masters/users" replace />
              ) : (
             <Navigate to="/dashboard/dashboard" replace />
              )
            }
          />
          <Route path="/login" element={<Login />} />



          <Route
            path="/*"
            element={
              isAuth ? (
                <DefaultLayout />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App