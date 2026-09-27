import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Eye, Calendar } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { api } from '@/utils/api'

const NewsDetail = () => {
  const { id } = useParams()
  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getNewsDetail(id)
      .then(setNews)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen pt-[72px] flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  if (!news) {
    return (
      <div className="min-h-screen pt-[72px] flex items-center justify-center">
        <p className="text-slate-400">News not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-[72px]">
      {/* Header */}
      <section className="bg-gradient-to-br from-white via-slate-50 to-primary-50 py-14 lg:py-20">
        <Container>
          <Link to="/news" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 transition text-sm mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to News
          </Link>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            {news.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {news.created_at
                ? new Date(news.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
                : ''}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {news.view_count} views
            </span>
          </div>
        </Container>
      </section>

      <section className="py-10 lg:py-14">
        <Container>
          <div className="max-w-3xl mx-auto">
            {/* Cover image */}
            {news.cover_image && (
              <img
                src={news.cover_image}
                alt={news.title}
                className="w-full rounded-xl mb-8"
              />
            )}

            {/* Album images */}
            {news.album_images && news.album_images.length > 1 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {news.album_images.map((img, i) => (
                  <img key={i} src={img} alt="" className="rounded-lg w-full h-40 object-cover" loading="lazy" />
                ))}
              </div>
            )}

            {/* Content */}
            <div
              className="prose prose-slate max-w-none text-slate-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: news.content }}
            />
          </div>

          {/* Related */}
          {news.related && news.related.length > 0 && (
            <div className="max-w-3xl mx-auto mt-16 pt-10 border-t border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Related News</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                {news.related.map((item) => (
                  <Link
                    key={item.id}
                    to={`/news/${item.id}`}
                    className="group block rounded-xl border border-slate-100 overflow-hidden hover:shadow-sm transition"
                  >
                    {item.cover_image ? (
                      <img src={item.cover_image} alt={item.title} className="w-full h-32 object-cover" loading="lazy" />
                    ) : (
                      <div className="h-32 bg-slate-50 flex items-center justify-center text-slate-300">📰</div>
                    )}
                    <div className="p-4">
                      <p className="text-xs text-slate-400 mb-1">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                      </p>
                      <h4 className="font-semibold text-sm text-slate-900 group-hover:text-[#00aef6] transition line-clamp-2">
                        {item.title}
                      </h4>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Container>
      </section>
    </div>
  )
}

export { NewsDetail }
