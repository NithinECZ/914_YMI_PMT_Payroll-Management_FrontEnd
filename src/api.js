import axios from 'axios'

const API = axios.create({
  baseURL: window.APP_CONFIG.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Login request nunchi vachina 401/network error ni ignore cheyyi
    // (login fail ayithe ikkada redirect avvakudadu, Login.jsx catch block handle chestundi)
    const isLoginRequest = error.config?.url?.includes('/Auth/login')

    if (!isLoginRequest && (error.response?.status === 401 || !error.response)) {
      sessionStorage.clear()
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default API