import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, MapPin, Eye } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { api } from '@/utils/api'

const formatDeadline = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Open'

const OpportunityDetail = () => {
  const { id } = useParams()
  const [opportunity, setOpportunity] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getOpportunity(id)
      .then(setOpportunity)
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

  if (!opportunity) {
    return (
      <div className="min-h-screen pt-[72px] flex items-center justify-center">
        <p className="text-slate-400">Opportunity not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-[72px]">
      <section className="bg-gradient-to-br from-white via-slate-50 to-primary-50 py-14 lg:py-20">
        <Container>
          <Link to="/opportunities" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 transition text-sm mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Opportunities
          </Link>
          <span className={`inline-block mb-4 px-3 py-1 rounded-full text-xs font-semibold ${
            !opportunity.is_closed ? 'bg-accent-green text-white' : 'bg-amber-500 text-white'
          }`}>
            {opportunity.is_closed ? 'Closed' : 'Active'}
          </span>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            {opportunity.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {opportunity.location}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Deadline: {formatDeadline(opportunity.deadline)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {opportunity.view_count} views
            </span>
          </div>
        </Container>
      </section>

      <section className="py-10 lg:py-14">
        <Container>
          <div className="max-w-3xl mx-auto">
            {opportunity.keyword_image && (
              <img
                src={`/static/esc/${opportunity.keyword_image}`}
                alt={opportunity.title}
                className="w-full rounded-xl mb-8 object-cover"
              />
            )}

            {opportunity.tags && opportunity.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {opportunity.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-xs font-semibold uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div
              className="prose prose-slate max-w-none text-slate-600 leading-relaxed mb-8"
              dangerouslySetInnerHTML={{ __html: opportunity.description }}
            />

            {opportunity.requirements && (
              <div className="mt-8 pt-8 border-t border-slate-100">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Requirements</h3>
                <div
                  className="prose prose-slate max-w-none text-slate-600 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: opportunity.requirements }}
                />
              </div>
            )}
          </div>
        </Container>
      </section>
    </div>
  )
}

export { OpportunityDetail }
