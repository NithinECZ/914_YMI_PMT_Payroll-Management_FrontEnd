import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { CButton, CForm, CFormInput } from '@coreui/react'
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa'
import './Login.css'
import leftImg from '../../../assets/images/YMT_LOGIN.png'
import profileImg from '../../../assets/images/Profile.png'
import API from '../../../api.js'

const fieldIconStyle = {
  position: 'absolute',
  left: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#94a3b8',
  fontSize: '14px',
  pointerEvents: 'none',
}

const Login = () => {
  const navigate = useNavigate()

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    username: '',
    password: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target

    // Password should not contain spaces
    if (name === 'password' && /\s/.test(value)) {
      return
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (e && e.stopPropagation) e.stopPropagation()

    // Prevent double submit
    if (loading) return

    // Validate username and password
    if (!form.username.trim() || !form.password.trim()) {
      toast.error('Please enter username & password')
      return
    }

    // Password space validation
    if (/\s/.test(form.password)) {
      toast.error('Password cannot contain spaces')
      return
    }

    setLoading(true)

    try {
      const res = await API.post('/Auth/login', {
        username: form.username.trim(),
        password: form.password,
      })

      console.log('Login response:', res.data)

      // =========================================================
      // LOGIN SUCCESS
      // =========================================================
      if (res.data?.success) {
        const userData = {
          id: res.data.user?.id,
          userId: res.data.user?.userId,
          userName: res.data.user?.userName,
          departmentName: res.data.user?.departmentName,
          userType: res.data.user?.userType,
          status: res.data.user?.status,
        }

        // Store logged-in user
        sessionStorage.setItem('user', JSON.stringify(userData))

        // Notify other components
        window.dispatchEvent(new Event('storage'))

        // Success message
        toast.success(res.data.message || 'Login Successful')

        // ---------------------------------------------------------
        // Navigate to User Master after successful login
        // ---------------------------------------------------------
        setTimeout(() => {
          navigate('/masters/users')
        }, 500)
      } else {
        // =========================================================
        // LOGIN FAILED
        // =========================================================
        toast.error(res.data?.message || 'Login Failed')

        // 👈 NEW: Keep username visible, only clear password on failed login
        setForm((prev) => ({
          ...prev,
          password: '',
        }))
      }
    } catch (err) {
      console.error('Login error full:', err)
      console.error('Login error response:', err.response)

      const backendMessage = err.response?.data?.message

      if (backendMessage) {
        toast.error(backendMessage)
      } else if (err.response) {
        toast.error(`Login failed (Status: ${err.response.status})`)
      } else if (err.request) {
        toast.error('Unable to connect to server')
      } else {
        toast.error('Something went wrong: ' + err.message)
      }

      // 👈 NEW: Keep username visible, only clear password on failed login
      setForm((prev) => ({
        ...prev,
        password: '',
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      {/* ================================================ */}
      {/* FULL WIDTH BACKGROUND IMAGE */}
      {/* ================================================ */}
      <div className="left-panel">
        <img src={leftImg} alt="Background" />
      </div>

      {/* ================================================ */}
      {/* LOGIN CARD - CENTERED ON TOP OF BACKGROUND */}
      {/* ================================================ */}
      <div className="login-box">
        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p className="loading-text">Logging in...</p>
          </div>
        )}

        {/* Profile Logo */}
        <div className="profile-logo-wrap">
          <img src={profileImg} alt="Profile" className="profile-logo" />
        </div>

        <p className="subtitle">
          Sign in to continue to your account
        </p>

        <CForm onSubmit={handleLogin}>
          {/* =====================================================
              USERNAME
          ====================================================== */}
          <div className="form-group">
            <label className="form-label">
              Username
            </label>

            <div style={{ position: 'relative' }}>
              <FaUser style={fieldIconStyle} />

              <CFormInput
                name="username"
                placeholder="Enter your Username"
                value={form.username}
                onChange={handleChange}
                className="form-control"
                style={{
                  paddingLeft: '42px',
                }}
                autoComplete="username"
                disabled={loading}
              />
            </div>
          </div>

          {/* =====================================================
              PASSWORD
          ====================================================== */}
          <div className="form-group">
            <label className="form-label">
              Password
            </label>

            <div style={{ position: 'relative' }}>
              <FaLock style={fieldIconStyle} />

              <CFormInput
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                onKeyDown={(e) => {
                  if (e.key === ' ') {
                    e.preventDefault()
                  }
                }}
                placeholder="Enter your password"
                className="form-control"
                style={{
                  paddingLeft: '42px',
                  paddingRight: '36px',
                }}
                autoComplete="current-password"
                disabled={loading}
              />

              {/* Show / Hide Password */}
              <span
                onClick={() =>
                  setShowPassword((prev) => !prev)
                }
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  fontSize: '14px',
                }}
              >
                {showPassword ? (
                  <FaEyeSlash />
                ) : (
                  <FaEye />
                )}
              </span>
            </div>
          </div>

          {/* =====================================================
              LOGIN BUTTON
          ====================================================== */}
          <CButton
            type="submit"
            className="btn-login"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-btn"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </CButton>
        </CForm>

        {/* =====================================================
            BUILD INFORMATION
        ====================================================== */}
        <div className="build-info">
          <span>Version:1.0</span>
          <span>Build Date:16-09-2026</span>
        </div>
      </div>

      {/* ================================================ */}
      {/* POWERED BY */}
      {/* ================================================ */}
      <div className="powered-by">
        Powered By Ecosoft Zolutions
      </div>
    </div>
  )
}

export default Login