import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SITE_TITLE = 'IYDP | International Youth Dialogue Platform'

// The server writes the same titles for a first visit: see services/seo.py.
const TITLES = {
  '/projects': 'Projects',
  '/projects/finished': 'Finished projects',
  '/events': 'Events',
  '/news': 'News',
  '/stories': 'Stories',
  '/faq': 'Frequently asked questions',
  '/contact': 'Contact',
  '/erasmus': 'Erasmus+ & European Solidarity Corps',
  '/login': 'Daxil ol',
  '/register': 'Qeydiyyat',
  '/forgot-password': 'Şifrəni unutmusunuz?',
  '/reset-password': 'Yeni şifrə',
  '/verify-email': 'Email təsdiqi',
  '/account': 'Hesabım',
  '/account/profile': 'Profil',
}

const DETAIL_PAGE = /^\/(news|projects|events|stories)\/[^/]+$/

const setPageTitle = (title) => {
  document.title = title ? `${title} | IYDP` : SITE_TITLE
}

/** For pages about one item, once the item has loaded. */
const usePageTitle = (title) => {
  useEffect(() => {
    if (title) setPageTitle(title)
  }, [title])
}

const PageTitle = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    const path = pathname.replace(/\/+$/, '') || '/'
    if (path === '/' || DETAIL_PAGE.test(path) && !TITLES[path]) setPageTitle(null)
    else setPageTitle(TITLES[path] || 'Page not found')
  }, [pathname])

  return null
}

export { PageTitle, usePageTitle }
