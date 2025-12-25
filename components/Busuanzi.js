import busuanzi from '@/lib/plugins/busuanzi'
import { useRouter } from 'next/router'
import { useGlobal } from '@/lib/global'
// import { useRouter } from 'next/router'
import { useEffect } from 'react'

let path = ''

export default function Busuanzi () {
  const { theme } = useGlobal()
  const router = useRouter()

  useEffect(() => {
    const handleRouteChange = url => {
      if (url !== path) {
        path = url
        busuanzi.fetch()
      }
    }

    router.events.on('routeChangeComplete', handleRouteChange)
    // 初始化时主动刷新，避免首屏不更新
    busuanzi.fetch()

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router])

  // 更换主题时更新
  useEffect(() => {
    if (theme) {
      busuanzi.fetch()
    }
  }, [theme])
  return null
}
