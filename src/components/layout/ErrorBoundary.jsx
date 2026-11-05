import { Component } from 'react'

const RELOAD_KEY = 'iydp-reloaded-for-update'

// After a new version goes live, an open tab asks for page files that no longer exist.
const isOutdatedPageFile = (error) =>
  /dynamically imported module|importing a module script|module script failed|error loading dynamically/i.test(error?.message || '')

const reloadedRecently = () => {
  try {
    return Date.now() - Number(sessionStorage.getItem(RELOAD_KEY) || 0) < 30000
  } catch {
    return true
  }
}

/** Shows a way forward instead of a blank page when a page crashes. */
class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error(error)
    // Once only, so a page that keeps failing can't reload forever.
    if (isOutdatedPageFile(error) && !reloadedRecently()) {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
      window.location.reload()
    }
  }

  componentDidUpdate(previous) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false })
    }
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div role="alert" className="flex min-h-screen items-center justify-center bg-slate-50 px-5 pt-[72px]">
        <div className="max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Səhifə açılmadı</h1>
          <p className="mt-2 text-slate-600">Səhifəni yeniləyin. Problem qalsa, bir az sonra yenidən yoxlayın.</p>
          <p className="mt-1 text-sm text-slate-600">This page could not be opened. Please reload it.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="rounded-md bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700">
              Yenilə / Reload
            </button>
            <a href="/" className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100">
              Ana səhifə / Home
            </a>
          </div>
        </div>
      </div>
    )
  }
}

export { ErrorBoundary }
