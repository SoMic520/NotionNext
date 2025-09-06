// components/WalineComponent.js
import { useEffect, useRef } from 'react'
import { init } from '@waline/client'
import '@waline/client/style'
import { useRouter } from 'next/router'
import { siteConfig } from '@/lib/config'

let waline = null
let lastPath = ''

/**
 * 稳健版 Waline 组件：
 * - 动态加载 Clerk（不存在也不会报错）
 * - 在 init 前把 Clerk 用户写入 localStorage('waline-user')
 * - login: 'disable' 只用 Clerk 身份
 * - serverURL 缺失时不初始化，避免报错导致整页空白
 */
const WalineComponent = (props) => {
  const containerRef = useRef(null)
  const router = useRouter()

  // 将 Clerk 用户信息写入 localStorage，供 Waline 自动读取
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (typeof window === 'undefined') return

      // 动态加载 Clerk（两种包名都试一遍）
      let useUser = null
      try {
        const m = await import('@clerk/nextjs')
        useUser = m.useUser
      } catch {}
      if (!useUser) {
        try {
          const m2 = await import('@clerk/clerk-react')
          useUser = m2.useUser
        } catch {}
      }
      if (!useUser) return
      if (cancelled) return

      // 读取当前用户
      // 注意：hook 只能在组件顶层用，这里不能直接调用。
      // 处理方式：改为在顶层再写一份 effect（见下面第二个 useEffect），这段仅保留以兼容老环境。
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // 顶层读取 Clerk 用户（推荐）
  // 如果没安装 Clerk，这个 try 会失败，但我们兜住不让页面崩
  let clerkUser = null
  try {
    // 仅在浏览器且包存在时使用
    // 这里用 "optional require" 的写法避免打包错误
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const maybeNext = require('@clerk/nextjs')
    clerkUser = maybeNext?.useUser?.().user ?? null
  } catch {}
  if (!clerkUser) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const maybeReact = require('@clerk/clerk-react')
      clerkUser = maybeReact?.useUser?.().user ?? null
    } catch {}
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!clerkUser) return
    try {
      const nick =
        clerkUser.username ||
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
        clerkUser.primaryEmailAddress?.emailAddress?.split('@')?.[0] ||
        'User'

      const mail =
        clerkUser.primaryEmailAddress?.emailAddress ||
        clerkUser.emailAddresses?.[0]?.emailAddress ||
        ''

      const link = clerkUser.imageUrl || ''

      localStorage.setItem('waline-user', JSON.stringify({ nick, mail, link }))
    } catch {
      // 忽略本地存储失败，不能让它把页面干崩
    }
  }, [clerkUser])

  // 初始化 Waline
  useEffect(() => {
    if (typeof window === 'undefined') return
    // 容器和 serverURL 必须同时就绪
    const serverURL = siteConfig('COMMENT_WALINE_SERVER_URL')
    if (!containerRef.current || !serverURL) return
    if (waline) return

    try {
      waline = init({
        el: containerRef.current,
        serverURL,
        lang: siteConfig('LANG'),
        dark: 'html.dark',
        reaction: true,
        login: 'disable', // 关键：关闭 Waline 自带登录
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
        try {
          waline.update(props)
        } catch (e) {
          console.error('Waline update error:', e)
        }
      }
    }

    try {
      router.events.on('routeChangeComplete', updateWaline)
    } catch {}

    // 锚点高亮逻辑（尽量包裹 try）
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
      try {
        router.events.off('routeChangeComplete', updateWaline)
      } catch {}
      try {
        waline?.destroy()
      } catch {}
      waline = null
    }
    // 只在首渲染尝试初始化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef.current])

  // 如果没有配置 serverURL，就不渲染，避免触发错误
  const hasServer = typeof window !== 'undefined' && siteConfig('COMMENT_WALINE_SERVER_URL')
  if (!hasServer) return null

  return <div id="waline" ref={containerRef} />
}

export default WalineComponent
