import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import CONFIG from '../config'

function getFixedHeaderHeight() {
  const header =
    document.querySelector('#theme-hexo > header') ||
    document.querySelector('header.sticky-nav') ||
    document.querySelector('header')
  return header?.getBoundingClientRect?.().height || 0
}

function getContentStartElement() {
  const selectors = [
    '#article-wrapper',
    '#notion-article',
    '#posts-wrapper',
    '#container',
    '#container-inner',
    '#wrapper'
  ]

  for (const selector of selectors) {
    const el = document.querySelector(selector)
    if (el) return el
  }

  return null
}

/**
 * 跳转到内容区顶部。
 * 首页优先回到文章列表 #container；文章页优先回到 #article-wrapper；
 * 这样不会跳回 Hexo 顶部封面，而是回到当前截图中的内容起点。
 */
const ButtonJumpToTop = ({ showPercent = true, percent }) => {
  const { locale } = useGlobal()

  const jumpToContentTop = () => {
    const target = getContentStartElement()
    const headerHeight = getFixedHeaderHeight()

    if (target) {
      const targetTop = target.getBoundingClientRect().top + window.pageYOffset
      window.scrollTo({
        top: Math.max(0, targetTop - headerHeight - 10),
        behavior: 'smooth'
      })
      return
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!siteConfig('HEXO_WIDGET_TO_TOP', null, CONFIG)) {
    return <></>
  }
  return (
    <div
      className='space-x-1 items-center justify-center transform hover:scale-105 duration-200 w-7 h-auto pb-1 text-center'
      onClick={jumpToContentTop}>
      <div title={locale.POST.TOP}>
        <i className='fas fa-arrow-up text-xs' />
      </div>
      {showPercent && <div className='text-xs hidden lg:block'>{percent}</div>}
    </div>
  )
}

export default ButtonJumpToTop
