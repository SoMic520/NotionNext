// themes/hexo/components/Header.js
import { useEffect, useState } from 'react'

/**
 * 站点头部（Hexo 主题）
 * 本版把右上角登录按钮改为 Waline 的 登录 / 管理 / 退出
 * - 登录：跳转 /api/waline/ui/login
 * - 管理：跳转 /api/waline/ui
 * - 退出：调用 /api/waline/api/token & /api/waline/api/logout 后刷新
 *
 * 注意：
 * 1) 这里只改 Header.js 一个文件；其它文件先别动。
 * 2) 如果还没部署 Waline 服务端（/api/waline），登录/管理会 404，等你部署好再用即可。
 */

export default function Header () {
  // ===== Waline 登录态（仅此处内联，不新建文件）=====
  const [wlUser, setWlUser] = useState(null)
  const [wlLoading, setWlLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/waline/api/user', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setWlUser(data?.data || null)
        } else {
          setWlUser(null)
        }
      } catch (e) {
        setWlUser(null)
      } finally {
        setWlLoading(false)
      }
    }
    load()
  }, [])

  const handleWalineLogout = async () => {
    try { await fetch('/api/waline/api/token', { method: 'DELETE', credentials: 'include' }) } catch (e) {}
    try { await fetch('/api/waline/api/logout', { method: 'POST', credentials: 'include' }) } catch (e) {}
    if (typeof window !== 'undefined') location.reload()
  }
  // ===== Waline 登录态 End =====

  return (
    <header className='w-full sticky top-0 z-40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur border-b'>
      <div className='max-w-6xl mx-auto h-14 px-4 flex items-center justify-between'>
        {/* 左：站点名/Logo（按需替换文案或链接） */}
        <a href='/' className='font-semibold text-base hover:opacity-80'>
          SoMic Studio
        </a>

        {/* 中：简单导航（按需增删） */}
        <nav className='hidden md:flex items-center gap-5 text-sm opacity-90'>
          <a href='/' className='hover:opacity-80'>首页</a>
          <a href='/archive' className='hover:opacity-80'>归档</a>
          <a href='/category' className='hover:opacity-80'>分类</a>
          <a href='/tag' className='hover:opacity-80'>标签</a>
        </nav>

        {/* 右：Waline 登录/管理/退出（替换原 Clerk 按钮） */}
        <div className='flex items-center'>
          {wlLoading ? (
            <div className='text-sm opacity-60'>…</div>
          ) : !wlUser ? (
            // 未登录：显示「登录」
            <a
              href='/api/waline/ui/login'
              className='px-3 py-1.5 rounded-xl border hover:bg-gray-100 dark:hover:bg-neutral-700 text-sm'
              title='登录'
            >
              登录
            </a>
          ) : (
            // 已登录：显示 昵称 + 管理 + 退出
            <div className='flex items-center gap-2'>
              {wlUser.displayName && (
                <span className='text-sm opacity-80' title={wlUser.displayName}>
                  {wlUser.displayName}
                </span>
              )}
              <a
                href='/api/waline/ui'
                className='px-3 py-1.5 rounded-xl border hover:bg-gray-100 dark:hover:bg-neutral-700 text-sm'
                title='Waline 管理后台'
              >
                管理
              </a>
              <button
                onClick={handleWalineLogout}
                className='px-3 py-1.5 rounded-xl border hover:bg-gray-100 dark:hover:bg-neutral-700 text-sm'
                title='退出'
              >
                退出
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 移动端导航（可选） */}
      <div className='md:hidden px-4 pb-2'>
        <div className='flex items-center gap-4 text-sm opacity-90'>
          <a href='/' className='hover:opacity-80'>首页</a>
          <a href='/archive' className='hover:opacity-80'>归档</a>
          <a href='/category' className='hover:opacity-80'>分类</a>
          <a href='/tag' className='hover:opacity-80'>标签</a>
        </div>
      </div>
    </header>
  )
}
