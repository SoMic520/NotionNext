import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import CONFIG from '../config'

/**
 * 跳转到内容区顶部
 * Hexo 主题有封面/文章头图时，回到 window 顶部会跳回封面；
 * 这里优先回到 #wrapper 主内容区起点，保持在文章列表/正文开始位置。
 * @param targetRef 关联高度的目标html标签
 * @param showPercent 是否显示百分比
 * @returns {JSX.Element}
 * @constructor
 */
const ButtonJumpToTop = ({ showPercent = true, percent }) => {
  const { locale } = useGlobal()

  const jumpToContentTop = () => {
    const wrapper = document.getElementById('wrapper')
    const header = document.querySelector('header')
    const headerHeight = header?.getBoundingClientRect?.().height || 0

    if (wrapper) {
      const wrapperTop = wrapper.getBoundingClientRect().top + window.pageYOffset
      const targetTop = Math.max(0, wrapperTop - headerHeight - 8)
      window.scrollTo({ top: targetTop, behavior: 'smooth' })
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
