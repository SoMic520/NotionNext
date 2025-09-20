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

  // ✅ 关键兜底：若 posts 为空，则从 allPages 里筛出已发布的博文作为 posts
  if (!props.posts?.length && Array.isArray(props.allPages)) {
    props。posts = props.allPages.filter(p => p?.type === 'Post' && p?.status === 'Published')
  }

  // 可选：如果你之前写过 delete props.allPages，请删掉那行，避免上面兜底失效
  // delete props.allPages  ← 不要这行！

  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig('NEXT_REVALIDATE_SECOND', BLOG.NEXT_REVALIDATE_SECOND, props.NOTION_CONFIG)
  }
}
