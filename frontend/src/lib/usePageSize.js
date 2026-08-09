import { useEffect, useState } from 'react'

// 6 cards per page on phones, 12 on larger screens. Shared by the recipe grid
// and the pantry grid so both paginate the same way.
export function usePageSize() {
  const [small, setSmall] = useState(() => window.matchMedia('(max-width: 600px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 600px)')
    const onChange = (e) => setSmall(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return small ? 6 : 12
}
