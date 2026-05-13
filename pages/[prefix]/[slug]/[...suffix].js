import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData, resolvePostProps } from '@/lib/db/SiteDataApi'
import { checkSlugHasMorThanTwoSlash } from '@/lib/utils/post'
import Slug from '..'
import { isExport } from '@/lib/utils/buildMode'
import { getPriorityPages, prefetchAllBlockMaps } from '@/lib/build/prefetch'

/**
 * 根据notion的slug访问页面
 * 解析三级以上目录 /article/2023/10/29/test
 * @param {*} props
 * @returns
 */
const PrefixSlug = props => {
  return <Slug {...props} />
}

const getMultiSegmentPaths = pages =>
  (Array.isArray(pages) ? pages : [])
    .filter(row => checkSlugHasMorThanTwoSlash(row))
    .map(row => {
      const parts = String(row.slug || '').replace(/^\//, '').split('/')
      return {
        params: {
          prefix: parts[0],
          slug: parts[1],
          suffix: parts.slice(2)
        }
      }
    })
    .filter(path =>
      path.params.prefix &&
      path.params.slug &&
      Array.isArray(path.params.suffix) &&
      path.params.suffix.length > 0
    )

export async function getStaticPaths() {
  const from = 'slug-paths'
  const { allPages } = await fetchGlobalAllData({ from })
  const safePages = Array.isArray(allPages) ? allPages : []

  // Export 模式：全量预生成
  if (isExport()) {
    await prefetchAllBlockMaps(safePages)
    return {
      paths: getMultiSegmentPaths(safePages),
      fallback: false
    }
  }

  // ISR 模式：预生成最新10篇（仅三段以上路径格式）
  const tops = getPriorityPages(safePages)

  return {
    paths: getMultiSegmentPaths(tops),
    fallback: 'blocking'
  }
}

/**
 * 抓取页面数据
 * @param {*} param0
 * @returns
 */
export async function getStaticProps({
  params: { prefix, slug, suffix },
  locale
}) {
  const props = await resolvePostProps({
    prefix,
    slug,
    suffix,
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
