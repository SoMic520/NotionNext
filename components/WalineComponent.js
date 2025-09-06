// components/WalineComponent.js
import { useEffect, createRef } from 'react'
import { init } from '@waline/client'
import '@waline/client/style'
import { useRouter } from 'next/router'
import { siteConfig } from '@/lib/config'

// 兼容两种 Clerk 包：优先 @clerk/nextjs，其次 @clerk/clerk-react
let useClerkUser = null
try {
  useClerkUser = require('@clerk/nextjs').useUser
} catch {}
if (!useClerkUser) {
  try {
    useClerkUser = require('@clerk/clerk-react').useUser
  } catch {}
}

let waline = null
let lastPath = ''

/**
 * Waline 前端组件：将 Clerk 登录用户写入 waline-user，并禁用 Waline 自带登录
 * 使用前确保已配置环境变量：NEXT_PUBLIC_WALINE_SERVER_URL
 */
const WalineComponent = (props) => {
  const containerRef = createRef()
  const router = useRouter()
  const clerk = useClerkUser ? useClerkUser() : { user: null }
  const user = clerk?.user || null

  // 1) 将 Clerk 用户信息写入 localStorage，供 Waline 自动读取
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!user) return

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
      localStorage.setItem(
        'waline-user',
        JSON.stringify({ nick, mail, link })
      )
    } catch {
      // 忽略本地存储失败
    }
  }, [user])

  // 2) 初始化 Waline，并保持与路由/锚点的联动
  useEffect(() => {
    if (waline) return
    const serverURL = siteConfig('COMMENT_WALINE_SERVER_URL')
    if (!serverURL) return

    waline = init({
      el: containerRef.current,
      serverURL,
      lang: siteConfig('LANG'),
      dark: 'html.dark',
      reaction: true,
      login: 'disable', // 关键：禁用 Waline 自带登录，使用我们预写的 waline-user
      emoji: [
        '//npm.elemecdn.com/@waline/emojis@1.1.0/tieba',
        '//npm.elemecdn.com/@waline/emojis@1.1.0/weibo',
        '//npm.elemecdn.com/@waline/emojis@1.1.0/bilibili'
      ],
      ...props
    })

    const updateWaline = (url) => {
      if (url !== lastPath && waline) {
        lastPath = url
        try {
          waline.update(props)
        } catch {}
      }
    }

    router.events.on('routeChangeComplete', updateWaline)

    // 地址带锚点时，滚到对应评论并高亮
    const anchor = typeof window !== 'undefined' ? window.location.hash : ''
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

    return () => {
      try {
        router.events.off('routeChangeComplete', updateWaline)
        waline?.destroy()
      } catch {}
      waline = null
    }
    // 仅在首渲染初始化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div id='waline' ref={containerRef} />
}

export default WalineComponent
