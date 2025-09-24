import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { DynamicLayout } from '@/themes/theme'
import { getLinksAndCategories } from '@/lib/links'

function LinksSlot({ data = [], categories = [] }) { /* 你的渲染逻辑保留 */ }

export default function Links(props) {
  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  const slot = <LinksSlot data={props.items} categories={props.categories} />

  // ✅ 不要用 LayoutSlug，换成 LayoutIndex（不依赖 Notion 页，侧栏也会正常）
  return <DynamicLayout theme={theme} layoutName="LayoutIndex" {...props} slot={slot} />

  // 若你的主题不支持 slot，就用 children：
  // return (
  //   <DynamicLayout theme={theme} layoutName="LayoutIndex" {...props}>
  //     <LinksSlot data={props.items} categories={props.categories} />
  //   </DynamicLayout>
  // )
}

export async function getStaticProps({ locale }) {
  const base = await getGlobalData({ from: 'links', locale })
  const { items, categories } = await getLinksAndCategories()
  return {
    props: { ...base, items, categories },
    revalidate: siteConfig('NEXT_REVALIDATE_SECOND', BLOG.NEXT_REVALIDATE_SECOND, base.NOTION_CONFIG)
  }
}
