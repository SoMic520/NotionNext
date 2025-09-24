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
  const theme = siteConfig('THEME', BLOG.THEME, props?.NOTION_CONFIG)
  // 如果 getStaticProps 没拿到 slug 页面，LayoutSlug 会 404；
  // 我们自动回退到 LayoutIndex，避免构建或运行时报错。
  const layout = props?.__hasSlug ? 'LayoutSlug' : 'LayoutIndex'

  return (
    <DynamicLayout theme={theme} layoutName={layout} {...props}>
      <LinksBody data={props.items || []} categories={props.categories || []} />
    </DynamicLayout>
  )
}

export async function getStaticProps({ locale }) {
  let base = {}
  let items = []
  let categories = []
  let hasSlug = false

  // 1) 主题全局数据（出错也不抛）
  try {
    base = await getGlobalData({ from: 'links', locale })
    // 判断主内容库里是否存在 slug=links 的页面（有则让我们用 LayoutSlug）
    // 不同版本结构略有差异，尽量宽松判断：
    const pages = base?.allPages || base?.pages || []
    hasSlug = Array.isArray(pages) && pages.some(p =>
      (p?.slug === 'links' || p?.slug?.value === 'links') &&
      (p?.type === 'Page' || p?.type?.value === 'Page') &&
      (p?.status === 'Published' || p?.status?.value === 'Published' || p?.status === '公开' || p?.status === '已发布')
    )
  } catch (e) {
    console.error('getGlobalData error:', e?.message || e)
    // 兜底：至少返回 NOTION_CONFIG，防止主题读取 undefined
    base = { NOTION_CONFIG: base?.NOTION_CONFIG || {} }
  }

  // 2) 友链数据（出错不抛）
  try {
    const r = await getLinksAndCategories()
    items = r?.items || []
    categories = r?.categories || []
  } catch (e) {
    console.error('getLinksAndCategories error:', e?.message || e)
    items = []
    categories = []
  }

  return {
    props: {
      ...base,
      items,
      categories,
      __hasSlug: hasSlug,      // 仅作选择布局用，可序列化
      __generatedAt: Date.now() // 避免某些静态缓存边缘情况
    },
    // 用固定数值，避免主题配置取不到时返回 undefined
    revalidate: 60
  }
}
