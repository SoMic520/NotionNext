// components/WalineComponent.js
import { useEffect, useRef } from 'react'
import { init } from '@waline/client'
import '@waline/client/style'
import { useRouter } from 'next/router'
import { siteConfig } from '@/lib/config'
import { useUser } from '@clerk/nextjs' // 若你用的是 @clerk/clerk-react，就改成它

let waline = null
let lastPath = ''

export default function WalineComponent(props) {
  const containerRef = useRef(null)
  const router = useRouter()
  const { user, isLoaded } = useUser()

  // 1) Clerk -> localStorage('waline-user')
  useEffect(() => {
    if (typeof window === 'undefined' || !isLoaded) return
    if (user) {
      const nick =
        user.username ||
        [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        user.primaryEmailAddress?.emailAddress?.split('@')?.[0] ||
        'User'
      const mail =
        user.primaryEmailAddress?.emailAddress ||
        user.emailAddresses?.[0]?.emailAddress ||
        ''
      const link = user.imageUrl || ''
      try {
        localStorage.setItem('waline-user', JSON.stringify({ nick, mail, link }))
      } catch {}
    } else {
      try { localStorage.removeItem('waline-user') } catch {}
    }
  }, [user, isLoaded])

  // 2) 初始化 / 重建 Waline（确保先写好 waline-user，再 init）
  useEffect(() => {
    if (typeof window === 'undefined') return
    const serverURL = siteConfig('COMMENT_WALINE_SERVER_URL')
    // 条件：容器就绪 + serverURL 存在 + Clerk 已判定状态
    if (!containerRef.current || !serverURL || !isLoaded) return

    // 如果已存在实例，说明登录态变更时需要重建
    if (waline) {
      try { waline.destroy() } catch {}
      waline = null
    }

    try {
      waline = init({
        el: containerRef.current,
        serverURL,
        lang: siteConfig('LANG'),
        dark: 'html.dark',
        reaction: true,
        login: 'disable', // 关闭 Waline 自带登录，用我们写入的 waline-user
        // 若你希望强制要求昵称/邮箱，可加上 requiredMeta，如：['nick','mail']
        // meta/requiredMeta 参考官方文档
        // meta: ['nick','mail','link'],
        // requiredMeta: ['nick','mail'],
        emoji: [
          '//npm.elemecdn.com/@waline/emojis@1.1.0/tieba',
          '//npm.elemecdn.com/@waline/emojis@1.1.0/weibo',
          '//npm.elemecdn.com/@waline/emojis@1.1.0/bilibili'
        ],
        ...props
      })
    } catch (e) {
      console.error('Waline init error:', e)
    }

    const updateWaline = (url) => {
      if (!waline) return
      if (url !== lastPath) {
        lastPath = url
        try { waline.update(props) } catch (e) {}
      }
    }
    router.events.on('routeChangeComplete', updateWaline)

    // 带锚点时滚动并高亮（尽量包裹 try）
    try {
      const anchor = window.location.hash
      if (anchor) {
        const targetNode = document.getElementsByClassName('wl-cards')[0]
        if (targetNode) {
          const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
              if (m.type === 'childList') {
                const el = document.getElementById(anchor.substring(1))
                if (el && el.className === 'wl-item') {
                  el.scrollIntoView({ block: 'end', behavior: 'smooth' })
                  setTimeout(() => {
                    el.classList.add('animate__animated', 'animate__bounceInRight')
                    observer.disconnect()
                  }, 300)
                }
              }
            }
          })
          observer.observe(targetNode, { childList: true })
        }
      }
    } catch {}

    return () => {
      try { router.events.off('routeChangeComplete', updateWaline) } catch {}
      try { waline?.destroy() } catch {}
      waline = null
    }
  }, [containerRef.current, isLoaded, user]) // ← 登录态变化会触发重建

  const hasServer = typeof window !== 'undefined' && siteConfig('COMMENT_WALINE_SERVER_URL')
  if (!hasServer) return null

  return <div id="waline" ref={containerRef} />
}
