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

// 新增导入 Clerk 用户按钮
import { UserButton } from '@clerk/nextjs'

let windowTop = 0

/**
 * 顶部导航
 * @param {*} props
 * @returns
 */
const Header = props => {
  const searchDrawer = useRef()
  const { tags, currentTag, categories, currentCategory } = props
  const { locale } = useGlobal()
  const router = useRouter()
  const [isOpen, changeShow] = useState(false)

  const showSearchButton = siteConfig('HEXO_MENU_SEARCH', false, CONFIG)
  const showRandomButton = siteConfig('HEXO_MENU_RANDOM', false, CONFIG)

  const toggleMenuOpen = () => {
    changeShow(!isOpen)
  }
  const toggleSideBarClose = () => {
    changeShow(false)
  }

  // 监听滚动，控制导航样式
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
      const header = document.querySelector('#header')
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

      // 控制导航条显隐
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

  // 搜索抽屉内容，省略不相关 JSX
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
              href='/category'
              passHref
              className='mb-3 text-gray-400 hover:text-black dark:text-gray-400 dark:hover:text-white hover:underline cursor-pointer'>
              {locale.COMMON.MORE} <i className='fas fa-angle-double-right' />
            </SmartLink>
          </div>
          <CategoryGroup currentCategory={currentCategory} categories={categories} />
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
              href='/tag'
              passHref
              className='text-gray-400 hover:text-black dark:hover:text-white hover:underline cursor-pointer'>
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
      {/* 搜索抽屉 */}
      <SearchDrawer cRef={searchDrawer} slot={searchDrawerSlot} />

      {/* 导航栏 */}
      <div
        id='sticky-nav'
        style={{ backdropFilter: 'blur(3px)' }}
        className='top-0 duration-300 transition-all shadow-none fixed bg-none dark:bg-hexo-black-gray dark:text-gray-200 text-black w-full z-20 transform border-transparent dark:border-transparent'>
        <div className='w-full flex justify-between items-center px-4 py-2'>
          {/* 左侧 Logo */}
          <div className='flex'>
            <Logo {...props} />
          </div>

          {/* 右侧功能区 */}
          <div className='mr-1 flex justify-end items-center'>
            {/* 桌面端菜单 */}
            <div className='hidden lg:flex'>
              <MenuListTop {...props} />
            </div>

            {/* 新增用户按钮：显示个人头像、个人中心/退出登录等 */}
            <UserButton afterSignOutUrl='/' />

            {/* 移动端菜单开关 */}
            <div
              onClick={toggleMenuOpen}
              className='w-8 justify-center items-center h-8 cursor-pointer flex lg:hidden'>
              {isOpen ? <i className='fas fa-times' /> : <i className='fas fa-bars' />}
            </div>

            {/* 搜索按钮和随机文章按钮根据配置显示 */}
            {showSearchButton && <SearchButton {...props} />}
            {showRandomButton && <ButtonRandomPost {...props} />}
          </div>
        </div>
      </div>

      {/* 折叠侧边栏 */}
      <SideBarDrawer onClose={toggleSideBarClose}>
        <SideBar {...props} />
      </SideBarDrawer>
    </div>
  )
}

export default Header
