import { partners } from '@/data'

const PartnersSection = () => {
  return (
    <section className="py-16 bg-gradient-to-r from-primary-100/40 via-slate-100/70 to-secondary-100/40 border-y border-slate-200/80 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 mb-10">
        <p className="text-center text-slate-500 text-sm font-semibold uppercase tracking-wider">
          Our partner organizations
        </p>
      </div>

      <div className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-slate-100/90 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-slate-100/90 to-transparent z-10 pointer-events-none" />

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
