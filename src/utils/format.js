// Dates are shown exactly as stored, so a visitor's time zone can't shift them.

const formatDate = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('.') : '')

const formatTime = (iso) => (iso && iso.length > 10 ? iso.slice(11, 16) : '')

const formatRange = (start, end) => {
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`
  return formatDate(start || end)
}

export { formatDate, formatTime, formatRange }
