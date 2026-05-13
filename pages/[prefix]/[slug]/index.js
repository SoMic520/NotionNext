import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData, resolvePostProps } from '@/lib/db/SiteDataApi'
import Slug from '..'
import { checkSlugHasOneSlash } from '@/lib/utils/post'
import { isExport } from '@/lib/utils/buildMode'
import { getPriorityPages, prefetchAllBlockMaps } from '@/lib/build/prefetch'

/**
 * 根据notion的slug访问页面
 * 解析二级目录 /article/about
 * @param {*} props
 * @returns
 */
const PrefixSlug = props => {
  return <Slug {...props} />
}

const getTwoSegmentPaths = pages =>
  (Array.isArray(pages) ? pages : [])
    .filter(row => checkSlugHasOneSlash(row))
    .map(row => {
      const parts = String(row.slug || '').replace(/^\//, '').split('/')
      return {
        params: {
          prefix: parts[0],
          slug: parts[1]
        }
      }
    })
    .filter(path => path.params.prefix && path.params.slug)

export async function getStaticPaths() {
  const from = 'slug-paths'
  const { allPages } = await fetchGlobalAllData({ from })
  const safePages = Array.isArray(allPages) ? allPages : []

  // Export 模式：全量预生成
  if (isExport()) {
    await prefetchAllBlockMaps(safePages)
    return {
      paths: getTwoSegmentPaths(safePages),
      fallback: false
    }
  }

  // ISR 模式：预生成最新10篇（仅两段路径格式）
  const tops = getPriorityPages(safePages)

  return {
    paths: getTwoSegmentPaths(tops),
    fallback: 'blocking'
  }
}

export async function getStaticProps({ params: { prefix, slug }, locale }) {
  const props = await resolvePostProps({
    prefix,
    slug,
    locale,
  })

  return {
    props,
    revalidate: isExport()
      ? undefined
      : siteConfig(
        'NEXT_REVALIDATE_SECOND',
        BLOG.NEXT_REVALIDATE_SECOND,
        props.NOTION_CONFIG
      ),
    notFound: !props.post
  }
}

export default PrefixSlug
