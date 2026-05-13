import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData, getPostBlocks } from '@/lib/db/SiteDataApi'
import { formatNotionBlock } from '@/lib/db/notion/getPostBlocks'
import { processPostData } from '@/lib/utils/post'
import { adapterNotionBlockMap } from '@/lib/utils/notion.util'
import { isExport } from '@/lib/utils/buildMode'
import Slug from './[prefix]'

const normalizePath = value =>
  String(value || '')
    .trim()
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .toLowerCase()

const isLinksCandidate = page => {
  const slug = normalizePath(page?.slug)
  const href = normalizePath(page?.href)
  const title = String(page?.title || page?.name || '').trim().toLowerCase()

  return (
    slug === 'links' ||
    href === 'links' ||
    slug === 'friend-links' ||
    href === 'friend-links' ||
    slug === 'friends' ||
    href === 'friends' ||
    title.includes('友情链接') ||
    title.includes('友链') ||
    title.includes('links') ||
    title.includes('friends')
  )
}

const buildFallbackPost = () => ({
  id: 'links-fallback',
  title: '友情链接',
  summary: '请在 Notion 数据库中添加 slug 为 links 的页面，或将友情链接菜单绑定到对应页面。',
  status: 'Published',
  type: 'Page',
  slug: 'links',
  password: '',
  content: [],
  toc: [],
  blockMap: { block: {} },
  date: {
    start_date: new Date().toISOString().slice(0, 10),
    lastEditedDay: new Date().toISOString().slice(0, 10),
    tagItems: []
  }
})

export async function getStaticProps({ locale }) {
  const props = await fetchGlobalAllData({ from: 'links-page', locale })
  const pages = Array.isArray(props?.allPages) ? props.allPages : []

  // 优先找真正发布的 links 页面；如果该行是 Menu/SubMenu，也允许作为页面打开。
  let post = pages.find(
    page => page?.status === 'Published' && isLinksCandidate(page)
  )

  // 有些站点会把友链行设为 Invisible，只作为菜单入口使用；这里兜底允许读取。
  if (!post) {
    post = pages.find(
      page => page?.status === 'Invisible' && isLinksCandidate(page)
    )
  }

  if (post?.id) {
    try {
      const rawBlockMap = await getPostBlocks(post.id, 'links-page')
      const adapted = adapterNotionBlockMap(rawBlockMap)
      post.blockMap = {
        ...adapted,
        block: formatNotionBlock(adapted.block)
      }
    } catch (error) {
      console.warn('[links] failed to fetch links page blocks', post.id, error)
      post.blockMap = { block: {} }
    }
  } else {
    post = buildFallbackPost()
  }

  props.post = post

  try {
    await processPostData(props, 'links-page')
  } catch (error) {
    console.warn('[links] processPostData failed', error)
    delete props.allPages
  }

  return {
    props,
    revalidate: isExport()
      ? undefined
      : siteConfig(
        'NEXT_REVALIDATE_SECOND',
        BLOG.NEXT_REVALIDATE_SECOND,
        props.NOTION_CONFIG
      )
  }
}

export default Slug
