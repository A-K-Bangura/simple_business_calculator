import { useEffect, useState, type RefObject } from 'react'

/** True once the element has scrolled up out of view (not while it's still below the fold). */
export function useScrolledPast(ref: RefObject<Element | null>): boolean {
  const [past, setPast] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      setPast(!entry.isIntersecting && entry.boundingClientRect.bottom < 0)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return past
}
