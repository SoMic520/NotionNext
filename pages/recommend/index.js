// pages/recommend/index.js
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { DynamicLayout } from '@/themes/theme'

export default function Recommend (props) {
  return (
    <DynamicLayout
      theme={siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)}
      layoutName='LayoutRecommend'   // 对应下面第2步新建的布局名
      {...props}
    />
  )
}

export async function getStaticProps({ locale }) {
  const props = await getGlobalData({ from: 'Recommend', locale })
  delete props.allPages
  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig('NEXT_REVALIDATE_SECOND', BLOG.NEXT_REVALIDATE_SECOND, props.NOTION_CONFIG)
  }
}
