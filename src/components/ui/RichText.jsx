const hasMarkup = (text) => /<\/?[a-z][\s\S]*>/i.test(text || '')

const toParagraphs = (text) =>
  (text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

/** Admin-written text: plain paragraphs, or HTML in older entries. */
const RichText = ({ content }) => {
  const base = 'text-[17px] leading-[1.8] text-slate-700'

  if (hasMarkup(content)) {
    return (
      <div
        className={`${base} [&_a]:text-primary-600 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-slate-900 [&_li]:mb-2 [&_ol]:mb-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-6 [&_ul]:mb-6 [&_ul]:list-disc [&_ul]:pl-6 [&_blockquote]:border-l-2 [&_blockquote]:border-primary-500 [&_blockquote]:pl-5 [&_blockquote]:text-slate-600`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  return (
    <div className={base}>
      {toParagraphs(content).map((p, i) => (
        <p key={i} className="mb-6 whitespace-pre-line last:mb-0">
          {p}
        </p>
      ))}
    </div>
  )
}

export { RichText }
