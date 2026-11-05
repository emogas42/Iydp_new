import { useState } from 'react'

// 16px on phones: iOS Safari zooms the page when a smaller input gets focus.
const inputClass =
  'block w-full rounded-md border border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 placeholder:text-slate-500 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 sm:text-[15px]'
const choiceClass = 'flex min-h-11 items-center gap-3 text-[15px] text-slate-800'
const markClass = 'h-5 w-5 shrink-0 border-slate-300 text-primary-600 focus:ring-primary-500'

const Control = ({ question, value, onChange, labelId, invalid }) => {
  const name = `question-${question.id}`
  const shared = { 'aria-invalid': invalid || undefined }

  switch (question.kind) {
    case 'long':
      return <textarea id={name} rows={5} maxLength={5000} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} resize-y leading-relaxed`} {...shared} />
    case 'date':
      return <input id={name} type="date" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} {...shared} />
    case 'number':
      return <input id={name} type="text" inputMode="decimal" maxLength={30} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} {...shared} />
    case 'dropdown':
      return (
        <select id={name} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} {...shared}>
          <option value="">Choose</option>
          {question.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      )
    case 'single':
      return (
        <div role="radiogroup" aria-labelledby={labelId} {...shared}>
          {question.options.map((option) => (
            <label key={option} className={choiceClass}>
              <input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} className={markClass} />
              {option}
            </label>
          ))}
        </div>
      )
    case 'multiple':
      return (
        <div role="group" aria-labelledby={labelId} {...shared}>
          {question.options.map((option) => (
            <label key={option} className={choiceClass}>
              <input
                type="checkbox"
                checked={value.includes(option)}
                onChange={() => onChange(value.includes(option) ? value.filter((o) => o !== option) : [...value, option])}
                className={`${markClass} rounded`}
              />
              {option}
            </label>
          ))}
        </div>
      )
    default:
      return <input id={name} type="text" maxLength={500} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} {...shared} />
  }
}

// The form an admin built for an event or a project.
const QuestionForm = ({ questions, submit, onSubmitted, note }) => {
  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(questions.map((q) => [q.id, q.kind === 'multiple' ? [] : '']))
  )
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setErrors({})
    setSubmitting(true)
    try {
      onSubmitted(await submit(answers))
    } catch (err) {
      setError(err.message)
      setErrors(err.errors || {})
      const first = Object.keys(err.errors || {})[0]
      if (first) document.getElementById(`field-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
      {questions.map((q) => {
        const labelId = `label-${q.id}`
        return (
          <div key={q.id} id={`field-${q.id}`} className="scroll-mt-24">
            <label id={labelId} htmlFor={`question-${q.id}`} className="block font-semibold text-slate-800">
              {q.label}
              {q.required && <span className="text-[#c7463a]"> *</span>}
            </label>
            {q.help_text && <p className="mt-1 text-sm text-slate-500">{q.help_text}</p>}
            <div className="mt-2">
              <Control
                question={q}
                labelId={labelId}
                invalid={Boolean(errors[q.id])}
                value={answers[q.id]}
                onChange={(value) => setAnswers((a) => ({ ...a, [q.id]: value }))}
              />
            </div>
            {errors[q.id] && <p role="alert" className="mt-1.5 text-sm text-[#c7463a]">{errors[q.id]}</p>}
          </div>
        )
      })}

      {error && <p role="alert" className="rounded-md border border-[#f06e60] bg-[#fdeeec] px-4 py-3 text-sm text-[#a33a2f]">{error}</p>}

      <div>
        <button type="submit" disabled={submitting} className="h-12 w-full rounded-md bg-primary-600 px-8 text-[15px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
          {submitting ? 'Sending…' : 'Send application'}
        </button>
        {note && <p className="mt-3 text-sm text-slate-500">{note}</p>}
      </div>
    </form>
  )
}

export { QuestionForm }
