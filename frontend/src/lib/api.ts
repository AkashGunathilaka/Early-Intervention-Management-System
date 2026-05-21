// Shared axios client for the app 
// it adds the saved auth token to requests and handles expired sessions

import axios from 'axios'
import { clearToken, getToken } from './auth'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

export function setAuthToken(token: string | null) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`
  else delete api.defaults.headers.common.Authorization
}

// add the token when the file is loaded
setAuthToken(getToken())

// If the API rejects the token, clear it and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status
    const url: string | undefined = err?.config?.url
    const isPublicAuthRequest =
      typeof url === 'string' &&
      (url.includes('/auth/login') ||
        url.includes('/auth/request-password-reset') ||
        url.includes('/auth/reset-password'))

    if (status === 401 && !isPublicAuthRequest) {
      clearToken()
      setAuthToken(null)
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(err)
  },
)
