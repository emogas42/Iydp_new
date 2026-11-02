import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

const SWIPE_THRESHOLD = 80

const slide = {
  enter: (dir) => ({ x: dir > 0 ? 120 : -120, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -120 : 120, opacity: 0 }),
}

const Lightbox = ({ images, index, onClose, onIndexChange }) => {
  const [direction, setDirection] = useState(0)
  const thumbsRef = useRef(null)
  const open = index !== null
  const count = images.length

  const go = useCallback(
    (step) => {
      if (count < 2) return
      setDirection(step)
      onIndexChange((index + step + count) % count)
    },
    [index, count, onIndexChange]
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, go, onClose])

  // Lock page scroll while the viewer is open.
  useEffect(() => {
    if (!open) return
    const { overflow, paddingRight } = document.body.style
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollbar}px`
    return () => {
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
    }
  }, [open])

  // Keep the active thumbnail in view and warm up neighbouring images.
  useEffect(() => {
    if (!open) return
    thumbsRef.current
      ?.querySelector(`[data-thumb="${index}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    ;[index + 1, index - 1].forEach((i) => {
      const src = images[(i + count) % count]
      if (src) new Image().src = src
    })
  }, [open, index, images, count])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex items-center justify-between px-4 py-4 text-sm text-white/70 sm:px-6">
            <span className="tabular-nums">
              {index + 1} / {count}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-20" onClick={onClose}>
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.img
                key={images[index]}
                src={images[index]}
                alt=""
                custom={direction}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                drag={count > 1 ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -SWIPE_THRESHOLD) go(1)
                  else if (info.offset.x > SWIPE_THRESHOLD) go(-1)
                }}
                onClick={(e) => e.stopPropagation()}
                className="max-h-full max-w-full select-none rounded-sm object-contain shadow-2xl"
                draggable={false}
              />
            </AnimatePresence>

            {count > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={(e) => { e.stopPropagation(); go(-1) }}
                  className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:flex"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={(e) => { e.stopPropagation(); go(1) }}
                  className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:flex"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          {count > 1 && (
            <div
              ref={thumbsRef}
              className="flex justify-start gap-1.5 overflow-x-auto px-4 py-4 [scrollbar-width:none] sm:justify-center [&::-webkit-scrollbar]:hidden"
            >
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  data-thumb={i}
                  aria-label={`Show image ${i + 1}`}
                  onClick={() => { setDirection(i > index ? 1 : -1); onIndexChange(i) }}
                  className={`h-14 w-20 shrink-0 overflow-hidden rounded-sm transition-all duration-300 ${
                    i === index ? 'opacity-100 ring-2 ring-white' : 'opacity-40 hover:opacity-80'
                  }`}
                >
                  <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export { Lightbox }
