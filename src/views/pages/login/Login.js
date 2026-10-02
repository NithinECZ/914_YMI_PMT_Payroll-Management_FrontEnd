import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { CButton, CForm, CFormInput } from '@coreui/react'
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa'
import './Login.css'
import leftImg from '../../../assets/images/YMT_LOGIN.png'
import profileImg from '../../../assets/images/Vector 5.png'
import API from '../../../api.js'
const buildDate = new Date().toLocaleDateString('en-GB')
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
    userId: '',
    password: '',
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const userIdFromLink = params.get('userId')

    if (userIdFromLink) {
      const cleanUserId = userIdFromLink.toUpperCase().replace(/[^A-Z0-9]/g, '')
      setForm((prev) => ({
        ...prev,
        userId: cleanUserId,
      }))
    }
  }, []) 

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === 'password' && /\s/.test(value)) {
      return
    }

    // UserId → uppercase + only letters & numbers
    if (name === 'userId') {
      setForm((prev) => ({
        ...prev,
        [name]: value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      }))
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

    if (loading) return

    if (!form.userId.trim() || !form.password.trim()) {
      toast.error('Please enter User Id & Password')
      return
    }

    if (/\s/.test(form.password)) {
      toast.error('Password cannot contain spaces')
      return
    }

    setLoading(true)

    try {
      const res = await API.post('/Auth/login', {
        userId: form.userId.trim(),
        password: form.password,
      })

      console.log('Login response:', res.data)

      if (res.data?.success) {
        const userData = {
          id: res.data.user?.id,
          userId: res.data.user?.userId,
          userName: res.data.user?.userName,
          departmentName: res.data.user?.departmentName,
          userType: res.data.user?.userType,
          status: res.data.user?.status,
        }

        sessionStorage.setItem('user', JSON.stringify(userData))
        window.dispatchEvent(new Event('storage'))

        toast.success(res.data.message || 'Login Successful')

        setTimeout(() => {
          navigate('/masters/users')
        }, 500)
      } else {
        toast.error(res.data?.message || 'Login Failed')

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
      <div className="left-panel">
        <img src={leftImg} alt="Background" />
      </div>

      <div className="login-box">
        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p className="loading-text">Logging in...</p>
          </div>
        )}

        <div className="profile-logo-wrap">
          <img src={profileImg} alt="Profile" className="profile-logo" />
        </div>

        <p className="subtitle">
        Login to continue to your account
        </p>

        <CForm onSubmit={handleLogin}>
          {/* =====================================================
              USER ID
          ====================================================== */}
          <div className="form-group">
            <label className="form-label">
              User Id
            </label>

            <div style={{ position: 'relative' }}>
              <FaUser style={fieldIconStyle} />

              <CFormInput
                name="userId"
                placeholder="Enter your User Id"
                value={form.userId}
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

              <span
                onClick={() => setShowPassword((prev) => !prev)}
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
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

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

<div className="build-info">
  <span>Version: 1.0</span>
  <span>Build Date: {buildDate}</span>
</div>
      </div>

      <div className="powered-by">
        Powered By Ecosoft Zolutions
      </div>
    </div>
  )
}

export default Login