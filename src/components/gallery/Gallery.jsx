import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react'
import { Lightbox } from './Lightbox'

const DRAG_THRESHOLD = 6

const GalleryImage = ({ src, index, onOpen, suppressClick }) => {
  const [loaded, setLoaded] = useState(false)

  return (
    <motion.button
      type="button"
      onClick={() => { if (!suppressClick.current) onOpen(index) }}
      aria-label={`Open image ${index + 1} in full screen`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 6) * 0.06 }}
      className="group relative aspect-[4/3] w-[calc((100%-6px)/1.25)] shrink-0 snap-start overflow-hidden rounded-[6px] bg-slate-100 focus-visible:ring-offset-0 sm:w-[calc((100%-6px)/1.9)] lg:w-[calc((100%-12px)/2.6)]"
    >
      {!loaded && <div className="absolute inset-0 animate-pulse bg-slate-200/70" />}
      <img
        src={src}
        alt=""
        loading={index < 4 ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        className={`h-full w-full select-none object-cover transition-[transform,opacity] duration-700 ease-smooth group-hover:scale-[1.03] ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <span className="pointer-events-none absolute inset-0 bg-slate-900/0 transition-colors duration-300 group-hover:bg-slate-900/15" />
      <span className="pointer-events-none absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 opacity-0 shadow-sm transition-all duration-300 group-hover:opacity-100">
        <Expand className="h-4 w-4" />
      </span>
    </motion.button>
  )
}

const Gallery = ({ images }) => {
  const trackRef = useRef(null)
  const drag = useRef({ active: false, startX: 0, startScroll: 0 })
  const suppressClick = useRef(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  const updateEdges = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setEdges({
      start: el.scrollLeft <= 2,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    })
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    updateEdges()
    const ro = new ResizeObserver(updateEdges)
    ro.observe(el)
    Array.from(el.children).forEach((c) => ro.observe(c))
    return () => ro.disconnect()
  }, [images, updateEdges])

  const scrollByPage = (dir) => {
    const el = trackRef.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  // Mouse drag-to-scroll; touch devices use native scrolling.
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    const el = trackRef.current
    drag.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft }
    suppressClick.current = false
  }

  const onPointerMove = (e) => {
    const d = drag.current
    if (!d.active) return
    const el = trackRef.current
    const dx = e.clientX - d.startX
    if (!suppressClick.current && Math.abs(dx) > DRAG_THRESHOLD) {
      suppressClick.current = true
      el.style.scrollSnapType = 'none'
      el.style.cursor = 'grabbing'
    }
    if (suppressClick.current) el.scrollLeft = d.startScroll - dx
  }

  const endDrag = () => {
    if (!drag.current.active) return
    drag.current.active = false
    const el = trackRef.current
    el.style.cursor = ''
    el.style.scrollSnapType = ''
    // Let the click that follows a drag be swallowed, then re-arm.
    setTimeout(() => { suppressClick.current = false }, 0)
  }

  if (!images.length) return null
  const scrollable = !(edges.start && edges.end)

  return (
    <div>
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={updateEdges}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          className={`flex gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            scrollable ? 'cursor-grab' : 'justify-center'
          }`}
        >
          {images.map((src, i) => (
            <GalleryImage key={src} src={src} index={i} onOpen={setLightboxIndex} suppressClick={suppressClick} />
          ))}
        </div>

        {/* Edge fades hint that more images are off-screen */}
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white to-transparent transition-opacity duration-300 ${
            edges.start ? 'opacity-0' : 'opacity-100'
          }`}
        />
        <div
          className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent transition-opacity duration-300 ${
            edges.end ? 'opacity-0' : 'opacity-100'
          }`}
        />
      </div>

      {scrollable && (
        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm tabular-nums text-slate-500">
            {images.length} photos
          </span>
          <div className="flex gap-2">
            {[
              { dir: -1, Icon: ChevronLeft, label: 'Scroll left', disabled: edges.start },
              { dir: 1, Icon: ChevronRight, label: 'Scroll right', disabled: edges.end },
            ].map(({ dir, Icon, label, disabled }) => (
              <button
                key={dir}
                type="button"
                aria-label={label}
                disabled={disabled}
                onClick={() => scrollByPage(dir)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-all hover:border-primary-500 hover:bg-primary-500 hover:text-white disabled:pointer-events-none disabled:opacity-35"
              >
                <Icon className="h-5 w-5" />
              </button>
            ))}
          </div>
        </div>
      )}

      <Lightbox
        images={images}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  )
}

export { Gallery }
