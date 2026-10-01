import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { ScrollProgress } from '@/components/layout/ScrollProgress'
import { BackToTop } from '@/components/layout/BackToTop'

const Home = lazy(() => import('@/pages/Home').then((m) => ({ default: m.Home })))
const Opportunities = lazy(() => import('@/pages/Opportunities').then((m) => ({ default: m.Opportunities })))
const OpportunityDetail = lazy(() => import('@/pages/OpportunityDetail').then((m) => ({ default: m.OpportunityDetail })))
const News = lazy(() => import('@/pages/News').then((m) => ({ default: m.News })))
const NewsDetail = lazy(() => import('@/pages/NewsDetail').then((m) => ({ default: m.NewsDetail })))
const Stories = lazy(() => import('@/pages/Stories').then((m) => ({ default: m.Stories })))
const FAQ = lazy(() => import('@/pages/FAQ').then((m) => ({ default: m.FAQ })))
const Contact = lazy(() => import('@/pages/Contact').then((m) => ({ default: m.Contact })))
const Erasmus = lazy(() => import('@/pages/Erasmus').then((m) => ({ default: m.Erasmus })))
const Login = lazy(() => import('@/pages/Login').then((m) => ({ default: m.Login })))
const Register = lazy(() => import('@/pages/Register').then((m) => ({ default: m.Register })))
const Account = lazy(() => import('@/pages/Account').then((m) => ({ default: m.Account })))
const NotFound = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFound })))

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
  </div>
)

function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <ScrollProgress />
      <div className="min-h-screen flex flex-col antialiased">
        <Navbar />
        <main className="flex-1">
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/opportunities" element={<Opportunities />} />
              <Route path="/opportunity/:id" element={<OpportunityDetail />} />
              <Route path="/news" element={<News />} />
              <Route path="/news/:id" element={<NewsDetail />} />
              <Route path="/stories" element={<Stories />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/erasmus" element={<Erasmus />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/account" element={<Account />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        <BackToTop />
      </div>
    </AuthProvider>
  )
}

export default App

