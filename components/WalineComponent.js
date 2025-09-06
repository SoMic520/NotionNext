// components/WalineComponent.js
import { useEffect, useRef } from 'react'
import { init } from '@waline/client'
import '@waline/client/style'
import { useRouter } from 'next/router'
import { siteConfig } from '@/lib/config'
import { useUser } from '@clerk/nextjs' // ✅ 正常使用 Hook（不要 require 动态引）

let waline = null
let lastPath = ''

const WalineComponent = (props) => {
  const containerRef = useRef(null)
  const router = useRouter()
  const { user, isLoaded } = useUser() // ✅ Clerk 登录态

  // 1) 把 Clerk 用户写入 waline-user（Waline 会自动读取 nick/mail/link）
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isLoaded) return

    try {
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

        localStorage.setItem('waline-user', JSON.stringify({ nick, mail, link }))
      } else {
        // 未登录时清理，避免“粘住旧账号”
        localStorage.removeItem('waline-user')
      }
    } catch {}
  }, [user, isLoaded])

  // 2) 初始化 Waline（serverURL 缺失时不初始化，避免整页白屏）
  useEffect(() => {
    if (typeof window === 'undefined') return
    const serverURL = siteConfig('COMMENT_WALINE_SERVER_URL')
    if (!containerRef.current || !serverURL) return
    if (waline) return

    waline = init({
      el: containerRef.current,
      serverURL,
      lang: siteConfig('LANG'),
      dark: 'html.dark',
      reaction: true,
      login: 'disable', // ✅ 关闭 Waline 自带登录，用我们写入的 waline-user
      emoji: [
        '//npm.elemecdn.com/@waline/emojis@1.1.0/tieba',
        '//npm.elemecdn.com/@waline/emojis@1.1.0/weibo',
        '//npm.elemecdn.com/@waline/emojis@1.1.0/bilibili'
      ],
      ...props
    })

    const updateWaline = (url) => {
      if (!waline) return
      if (url !== lastPath) {
        lastPath = url
        try {
          waline.update(props)
        } catch (e) {
          console.error('Waline update error:', e)
        }
      }
    }

    router.events.on('routeChangeComplete', updateWaline)

    // 带锚点时滚动并高亮
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef.current])

  const hasServer = typeof window !== 'undefined' && siteConfig('COMMENT_WALINE_SERVER_URL')
  if (!hasServer) return null

  return <div id="waline" ref={containerRef} />
}

export default WalineComponent
