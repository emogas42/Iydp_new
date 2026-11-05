import { csrfFetch } from '@/utils/csrf'

const API = '/api'

async function request(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

async function post(url, body) {
  const res = await csrfFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error(data.error || 'Something went wrong. Please try again.')
    error.status = res.status
    error.code = data.code
    error.errors = data.errors
    throw error
  }
  return data
}

export const api = {
  // Forgotten password
  forgotPassword: (email) => post(`${API}/auth/forgot-password`, { email }),
  resetPassword: (form) => post(`${API}/auth/reset-password`, form),

  // Email confirmation
  verifyEmail: (token) => post(`${API}/auth/verify-email`, { token }),
  resendVerification: () => post(`${API}/account/verify-email/resend`),
  changeEmail: (form) => post(`${API}/account/email`, form),
  deleteAccount: (password) => post(`${API}/account/delete`, { password }),

  // Notifications
  markNotificationsRead: () => post(`${API}/account/notifications/read`),

  // Member profile
  getProfile: () => request(`${API}/account/profile`),
  saveProfile: (form) => post(`${API}/account/profile`, form),

  // Homepage combined data
  getHome: () => request(`${API}/home`),

  // Projects
  getProjects: (params = '') => request(`${API}/projects?${params}`),
  getProject: (id) => request(`${API}/projects/${id}`),
  applyToProject: (id, form) => post(`${API}/projects/${id}/apply`, form),

  // Events
  getEvents: (params = '') => request(`${API}/events?${params}`),
  getEvent: (id) => request(`${API}/events/${id}`),
  registerForEvent: (id, answers) => post(`${API}/events/${id}/register`, { answers }),
  unregisterFromEvent: (id) => post(`${API}/events/${id}/unregister`),

  // News
  getNews: (params = '') => request(`${API}/news?${params}`),
  getNewsDetail: (id) => request(`${API}/news/${id}`),

  // Participant stories
  getStories: (params = '') => request(`${API}/stories?${params}`),
  getStory: (slug) => request(`${API}/stories/${encodeURIComponent(slug)}`),

  // Contact
  submitContact: (formData) =>
    csrfFetch(`${API}/contact`, { method: 'POST', body: formData }).then((r) =>
      r.json()
    ),
}
