// /pages/links.js  （src 结构就放 /src/pages/links.js）
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { DynamicLayout } from '@/themes/theme'
import { getLinksAndCategories } from '@/lib/links'

function LinksBody({ data = [], categories = [] }) {
  const groups = categories.map(cat => ({
    cat,
    items: data
      .filter(x => (cat === '未分类' ? !x.Categories?.length : x.Categories?.includes(cat)))
      .sort((a, b) => (b.Weight || 0) - (a.Weight || 0) || a.Name.localeCompare(b.Name))
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">友情链接</h1>
      <div className="grid gap-10">
        {groups.map(({ cat, items }) => (
          <section key={cat}>
            <h2 className="text-xl font-semibold mb-4">{cat}</h2>
            {items.length === 0 ? (
              <div className="text-sm opacity-60">此分类暂无条目</div>
            ) : (
              <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(it => (
                  <li key={`${cat}-${it.URL}`} className="border rounded-2xl p-4 hover:shadow transition">
                    <a
                      href={it.URL}
                      target="_blank"
                      rel="noopener noreferrer nofollow external"
                      className="flex items-center gap-3 no-underline"
                      onClick={e => e.stopPropagation()}
                    >
                      <img
                        src={it.Avatar}
                        alt={it.Name}
                        className="w-10 h-10 rounded-lg object-cover"
                        onError={e => {
                          try {
                            const u = new URL(it.URL)
                            e.currentTarget.src = `https://icons.duckduckgo.com/ip3/${u.hostname}.ico`
                          } catch {
                            e.currentTarget.src = '/favicon.ico'
                          }
                        }}
                      />
                      <div>
                        <div className="font-medium">{it.Name}</div>
                        <div className="text-xs opacity-70 mt-1 line-clamp-2">{it.Description}</div>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

export default function Links(props) {
  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  // ✅ 用 LayoutSlug（需要 Notion 里存在 slug=links 的“占位页”）
  return (
    <DynamicLayout theme={theme} layoutName="LayoutSlug" {...props}>
      <LinksBody data={props.items} categories={props.categories} />
    </DynamicLayout>
  )
}

export async function getStaticProps({ locale }) {
  const base = await getGlobalData({ from: 'links', locale })
  const { items, categories } = await getLinksAndCategories()
  return {
    props: { ...base, items, categories },
    revalidate: siteConfig('NEXT_REVALIDATE_SECOND', BLOG.NEXT_REVALIDATE_SECOND, base.NOTION_CONFIG)
  }
}
