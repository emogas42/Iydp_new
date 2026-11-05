import { useCallback, useEffect, useRef } from 'react'

// Matches services/bot_check.py, with a little spare for clocks and slow connections.
const MIN_WAIT_MS = 2300

const fetchToken = () =>
  fetch('/api/form-token')
    .then((res) => res.json())
    .then((data) => ({ token: data.token, at: Date.now() }))
    .catch(() => ({ token: '', at: 0 }))

/**
 * Bot protection for a public form. People never notice it: if they submit very quickly
 * (a password manager, say), sending just waits the rest of the two seconds.
 */
const useBotCheck = () => {
  const pending = useRef(null)
  const hiddenInput = useRef(null)

  const renew = useCallback(() => {
    pending.current = fetchToken()
  }, [])

  useEffect(() => {
    if (!pending.current) renew()
  }, [renew])

  const fields = async () => {
    if (!pending.current) renew()
    const { token, at } = await pending.current
    const wait = MIN_WAIT_MS - (Date.now() - at)
    if (at && wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    return { form_token: token, homepage_url: hiddenInput.current?.value || '' }
  }

  const trap = (
    <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
      <label>
        Leave this empty
        <input ref={hiddenInput} type="text" name="homepage_url" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  )

  return { fields, renew, trap }
}

export { useBotCheck }
