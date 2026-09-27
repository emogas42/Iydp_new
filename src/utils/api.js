const API = '/api'

async function request(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  // Homepage combined data
  getHome: () => request(`${API}/home`),

  // Opportunities
  getOpportunities: (params = '') => request(`${API}/opportunities?${params}`),
  getOpportunity: (id) => request(`${API}/opportunity/${id}`),

  // News
  getNews: (params = '') => request(`${API}/news?${params}`),
  getNewsDetail: (id) => request(`${API}/news/${id}`),

  // Blog / Stories
  getBlog: (params = '') => request(`${API}/blog?${params}`),
  getBlogPost: (slug) => request(`${API}/blog/${slug}`),

  // Contact
  submitContact: (formData) =>
    fetch(`${API}/contact`, { method: 'POST', body: formData }).then((r) =>
      r.json()
    ),
}
