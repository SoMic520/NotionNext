import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { DynamicLayout } from '@/themes/theme'
import { useRouter } from 'next/router'
import { useMemo } from 'react'

/**
 * 搜索路由
 * @param {*} props
 * @returns
 */
const Search = props => {
  const { posts } = props

  const router = useRouter()
  const keyword = router?.query?.s

  // 使用 useMemo 缓存过滤结果，避免每次渲染重复计算
  const filteredPosts = useMemo(() => {
    if (!keyword) return []
    const lowerKeyword = keyword.toLowerCase()
    return posts.filter(post => {
      const tagContent = post?.tags ? post.tags.join(' ') : ''
      const categoryContent = post?.category ? post.category.join(' ') : ''
      const searchContent = post.title + post.summary + tagContent + categoryContent
      return searchContent.toLowerCase().includes(lowerKeyword)
    })
  }, [posts, keyword])

  props = { ...props, posts: filteredPosts }

  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return <DynamicLayout theme={theme} layoutName='LayoutSearch' {...props} />
}

/**
 * 浏览器前端搜索
 */
export async function getStaticProps({ locale }) {
  const props = await fetchGlobalAllData({
    from: 'search-props',
    locale
  })
  const { allPages } = props
  props.posts = allPages?.filter(
    page => page.type === 'Post' && page.status === 'Published'
  )
  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig(
          'NEXT_REVALIDATE_SECOND',
          BLOG.NEXT_REVALIDATE_SECOND,
          props.NOTION_CONFIG
        )
  }
}

export default Search
