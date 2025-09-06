// themes/hexo/components/Header.js
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import throttle from 'lodash.throttle'
import SmartLink from '@/components/SmartLink'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import CONFIG from '../config'
import ButtonRandomPost from './ButtonRandomPost'
import CategoryGroup from './CategoryGroup'
import Logo from './Logo'
import { MenuListTop } from './MenuListTop'
import SearchButton from './SearchButton'
import SearchDrawer from './SearchDrawer'
import SideBar from './SideBar'
import SideBarDrawer from './SideBarDrawer'
import TagGroups from './TagGroups'

// ❌ 移除 Clerk 相关 import（SignedIn/SignedOut/SignInButton/UserButton）

let windowTop = 0

/**
 * 顶部导航（Hexo 主题）
 */
const Header = props => {
  const searchDrawer = useRef()
  const { tags, currentTag, categories, currentCategory } = props
  const { locale } = useGlobal()
  const router = useRouter()
  const [isOpen, changeShow] = useState(false)
  const showSearchButton = siteConfig('HEXO_MENU_SEARCH', false, CONFIG)
  const showRandomButton = siteConfig('HEXO_MENU_RANDOM', false, CONFIG)

  // === 多语言开关：中文/英文按钮文字 ===
  const langFromConfig = siteConfig('LANG', 'zh-CN', CONFIG)
  const currentLang = (router?.locale || langFromConfig || 'zh-CN').toLowerCase()
  const isZH = currentLang.startsWith('zh')
  const SIGN_IN_TEXT = isZH ? '登录' : 'Sign in'

  // 仅新增：Waline 登录弹窗的开关 & 登录页地址（使用你的独立服务）
  const [wlOpen, setWlOpen] = useState(false)
  const WALINE_LOGIN_URL = 'https://waline.somac.top/ui/login'
  // 如需进入后台自行管理：const WALINE_DASHBOARD_URL = 'https://waline.somac.top/ui'

  const toggleMenuOpen = () => changeShow(!isOpen)
  const toggleSideBarClose = () => changeShow(false)

  // 监听滚动
  useEffect(() => {
    window.addEventListener('scroll', topNavStyleHandler)
    router.events.on('routeChangeComplete', topNavStyleHandler)
    topNavStyleHandler()
    return () => {
      router.events.off('routeChangeComplete', topNavStyleHandler)
      window.removeEventListener('scroll', topNavStyleHandler)
    }
  }, [])

  const throttleMs = 200

  const topNavStyleHandler = useCallback(
    throttle(() => {
      const scrollS = window.scrollY
      const nav = document.querySelector('#sticky-nav')
      // 首页和文章页会有头图
      const header = document.querySelector('#header')
      // 导航栏和头图是否重叠
      const scrollInHeader =
        header && (scrollS < 10 || scrollS < header?.clientHeight - 50)

      if (scrollInHeader) {
        nav && nav.classList.replace('bg-white', 'bg-none')
        nav && nav.classList.replace('border', 'border-transparent')
        nav && nav.classList.replace('drop-shadow-md', 'shadow-none')
        nav && nav.classList.replace('dark:bg-hexo-black-gray', 'transparent')
      } else {
        nav && nav.classList.replace('bg-none', 'bg-white')
        nav && nav.classList.replace('border-transparent', 'border')
        nav && nav.classList.replace('shadow-none', 'drop-shadow-md')
        nav && nav.classList.replace('transparent', 'dark:bg-hexo-black-gray')
      }

      if (scrollInHeader) {
        nav && nav.classList.replace('text-black', 'text-white')
      } else {
        nav && nav.classList.replace('text-white', 'text-black')
      }

      // 导航栏不在头图里，且页面向下滚动一定程度 隐藏导航栏
      const showNav =
        scrollS <= windowTop ||
        scrollS < 5 ||
        (header && scrollS <= header.clientHeight + 100)
      if (!showNav) {
        nav && nav.classList.replace('top-0', '-top-20')
        windowTop = scrollS
      } else {
        nav && nav.classList.replace('-top-20', 'top-0')
        windowTop = scrollS
      }
    }, throttleMs)
  )

  const searchDrawerSlot = (
    <>
      {categories && (
        <section className='mt-8'>
          <div className='text-sm flex flex-nowrap justify-between font-light px-2'>
            <div className='text-gray-600 dark:text-gray-200'>
              <i className='mr-2 fas fa-th-list' />
              {locale.COMMON.CATEGORY}
            </div>
            <SmartLink
              href={'/category'}
              passHref
              className='mb-3 text-gray-400 hover:text-black dark:text-gray-400 dark:hover:text-white hover:underline cursor-pointer'>
              {locale.COMMON.MORE} <i className='fas fa-angle-double-right' />
            </SmartLink>
          </div>
          <CategoryGroup
            currentCategory={currentCategory}
            categories={categories}
          />
        </section>
      )}

      {tags && (
        <section className='mt-4'>
          <div className='text-sm py-2 px-2 flex flex-nowrap justify-between font-light dark:text-gray-200'>
            <div className='text-gray-600 dark:text-gray-200'>
              <i className='mr-2 fas fa-tag' />
              {locale.COMMON.TAGS}
            </div>
            <SmartLink
              href={'/tag'}
              passHref
              className='text-gray-400 hover:text-black  dark:hover:text-white hover:underline cursor-pointer'>
              {locale.COMMON.MORE} <i className='fas fa-angle-double-right' />
            </SmartLink>
          </div>
          <div className='p-2'>
            <TagGroups tags={tags} currentTag={currentTag} />
          </div>
        </section>
      )}
    </>
  )

  return (
    <div id='top-nav' className='z-40'>
      <SearchDrawer cRef={searchDrawer} slot={searchDrawerSlot} />

      {/* 导航栏 */}
      <div
        id='sticky-nav'
        style={{ backdropFilter: 'blur(3px)' }}
        className={
          'top-0 duration-300 transition-all  shadow-none fixed bg-none dark:bg-hexo-black-gray dark:text-gray-200 text-black w-full z-20 transform border-transparent dark:border-transparent'
        }>
        <div className='w-full flex justify-between items-center px-4 py-2'>
          <div className='flex'>
            <Logo {...props} />
          </div>

          {/* 右侧功能 */}
          <div className='mr-1 flex justify-end items-center '>
            <div className='hidden lg:flex'>
              <MenuListTop {...props} />
            </div>

            <div
              onClick={toggleMenuOpen}
              className='w-8 justify-center items-center h-8 cursor-pointer flex lg:hidden'>
              {isOpen ? <i className='fas fa-times' /> : <i className='fas fa-bars' />}
            </div>

            {showSearchButton && <SearchButton />}
            {showRandomButton && <ButtonRandomPost {...props} />}

            {/* ✅ 把原 Clerk 登录弹窗替换为 Waline 登录网站（不改其它样式） */}
            <button
              onClick={() => setWlOpen(true)}
              className='px-3 py-1 rounded border'
            >
              {SIGN_IN_TEXT}
            </button>

            {wlOpen && (
              <div className='fixed inset-0 z-[9999]'>
                <div
                  className='absolute inset-0 bg-black/40'
                  onClick={() => setWlOpen(false)}
                />
                <div className='relative mx-auto my-12 w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 shadow-xl overflow-hidden'>
                  <div className='flex items-center justify-between px-4 h-12 border-b'>
                    <div className='font-semibold'>{SIGN_IN_TEXT}</div>
                    <button
                      onClick={() => setWlOpen(false)}
                      className='text-xl leading-none px-2'
                      aria-label='Close'
                    >
                      ×
                    </button>
                  </div>

                  {/* 这里就是“把弹窗网站改为 Waline 登录网站” */}
                  <iframe
                    src={WALINE_LOGIN_URL}
                    className='w-full h-[520px]'
                    referrerPolicy='no-referrer'
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 折叠侧边栏 */}
      <SideBarDrawer isOpen={isOpen} onClose={toggleSideBarClose}>
        <SideBar {...props} />
      </SideBarDrawer>
    </div>
  )
}

export default Header
