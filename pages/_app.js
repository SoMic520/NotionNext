// import '@/styles/animate.css' // @see https://animate.style/
import '@/styles/globals.css'
import '@/styles/utility-patterns.css'

// core styles shared by all of react-notion-x (required)
import '@/styles/notion.css' //  重写部分 notion 样式
import 'react-notion-x/src/styles.css' // 原版的 react-notion-x

import useAdjustStyle from '@/hooks/useAdjustStyle'
import { GlobalContextProvider } from '@/lib/global'
import { getBaseLayoutByTheme } from '@/themes/theme'
import { useRouter } from 'next/router'
import { useCallback, useMemo, useEffect } from 'react'
import { getQueryParam } from '../lib/utils'

// 各种扩展插件，这些要阻塞引入
import BLOG from '@/blog.config'
import ExternalPlugins from '@/components/ExternalPlugins'
import SEO from '@/components/SEO'
import { zhCN } from '@clerk/localizations'
import dynamic from 'next/dynamic'

// 使用动态加载 ClerkProvider，避免在非启用 Clerk 的情况下加载相关库
const ClerkProvider = dynamic(() =>
  import('@clerk/nextjs').then(m => m.ClerkProvider)
)

// 从 Clerk hooks 里取登录状态
const useAuth = dynamic(() =>
  import('@clerk/nextjs').then(m => m.useAuth),
  { ssr: false }
)

/**
 * 小组件：监听 Clerk 登录状态，自动同步 Waline 登录
 */
function SyncWalineLogin() {
  const { isSignedIn } = useAuth()

  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/auth/waline/sync-from-clerk', { method: 'POST' })
        .then(() => console.log('✅ Waline 登录已同步'))
        .catch(err => console.error('❌ Waline 同步失败', err))
    }
  }, [isSignedIn])

  return null
}

/**
 * App 挂载 DOM 的入口文件
 */
const MyApp = ({ Component, pageProps }) => {
  useAdjustStyle()

  const route = useRouter()
  const theme = useMemo(() => {
    return (
      getQueryParam(route.asPath, 'theme') ||
      pageProps?.NOTION_CONFIG?.THEME ||
      BLOG.THEME
    )
  }, [route])

  const GLayout = useCallback(
    props => {
      const Layout = getBaseLayoutByTheme(theme)
      return <Layout {...props} />
    },
    [theme]
  )

  const enableClerk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  const content = (
    <GlobalContextProvider {...pageProps}>
      <GLayout {...pageProps}>
        <SEO {...pageProps} />
        <Component {...pageProps} />
      </GLayout>
      <ExternalPlugins {...pageProps} />
    </GlobalContextProvider>
  )

  return (
    <>
      {enableClerk ? (
        <ClerkProvider
          localization={zhCN}
          appearance={{
            layout: { unsafe_disableDevelopmentModeWarnings: true },
          }}
        >
          {/* 这里插入同步组件 */}
          <SyncWalineLogin />
          {content}
        </ClerkProvider>
      ) : (
        content
      )}
    </>
  )
}

export default MyApp
