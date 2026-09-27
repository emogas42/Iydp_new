import { partners } from '@/data'

const PartnersSection = () => {
  return (
    <section className="py-16 bg-slate-50 border-y border-slate-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 mb-10">
        <p className="text-center text-slate-400 text-sm font-semibold uppercase tracking-wider">
          Our partner organizations
        </p>
      </div>

      <div className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-slate-50 z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-slate-50 z-10" />

        <div className="marquee flex gap-16 items-center whitespace-nowrap">
          {[...partners, ...partners].map((name, i) => (
            <span
              key={i}
              className="text-slate-400 hover:text-slate-600 font-semibold text-lg shrink-0 transition-colors cursor-default"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

export { PartnersSection }
