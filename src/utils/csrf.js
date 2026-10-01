let cachedToken = null
let pending = null

/**
 * Fetches (and caches) the CSRF token issued by Flask-WTF for this session.
 * Used to set the X-CSRFToken header on state-changing fetch() calls.
 */
async function getCsrfToken() {
  if (cachedToken) return cachedToken
  if (!pending) {
    pending = fetch('/api/csrf-token')
      .then((res) => res.json())
      .then((data) => {
        cachedToken = data.csrf_token
        return cachedToken
      })
      .finally(() => {
        pending = null
      })
  }
  return pending
}

/**
 * fetch() wrapper that attaches the CSRF token header for POST/PUT/PATCH/DELETE.
 */
async function csrfFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = await getCsrfToken()
    options.headers = { ...(options.headers || {}), 'X-CSRFToken': token }
  }
  return fetch(url, options)
}

export { getCsrfToken, csrfFetch }
