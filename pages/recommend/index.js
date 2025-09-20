// pages/recommend/index.js
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { DynamicLayout } from '@/themes/theme'

export default function Recommend (props) {
  return (
    <DynamicLayout
      theme={siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)}
      layoutName='LayoutRecommend'
      {...props}
    />
  )
}

export async function getStaticProps({ locale }) {
  const props = await getGlobalData({ from: 'Recommend', locale })

  // ✅ 兜底：如果 posts 为空，就从 allPages 抽出已发布的博文
  if ((!props.posts || props.posts.length === 0) && Array.isArray(props.allPages)) {
    props.posts = props.allPages.filter(p => p?.type === 'Post' && p?.status === 'Published')
  }

  // 千万不要在这里 delete props.allPages；让它保留给前端做更多兜底用
  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig('NEXT_REVALIDATE_SECOND', BLOG.NEXT_REVALIDATE_SECOND, props.NOTION_CONFIG)
  }
}
