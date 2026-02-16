import busuanzi from '@/lib/plugins/busuanzi'
import { useRouter } from 'next/router'
import { useGlobal } from '@/lib/global'
import { useEffect, useCallback } from 'react'

export default function Busuanzi () {
  const { theme } = useGlobal()
  const router = useRouter()

  // 使用 useEffect 注册路由事件，避免每次渲染都重复注册
  useEffect(() => {
    let lastPath = ''
    const handleRouteChange = (url) => {
      if (url !== lastPath) {
        lastPath = url
        busuanzi.fetch()
      }
    }
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  // 更换主题时更新
  useEffect(() => {
    if (theme) {
      busuanzi.fetch()
    }
  }, [theme])

  return null
}
