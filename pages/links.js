// /pages/links.js   或 /src/pages/links.js
import { getLinksAndCategories } from '@/lib/links'

export default function Links({ data = [], categories = [], err }) {
  const groups = (categories || []).map(cat => ({
    cat,
    items: (data || [])
      .filter(x => (cat === '未分类' ? !x.Categories?.length : x.Categories?.includes(cat)))
      .sort((a, b) => (b.Weight || 0) - (a.Weight || 0) || a.Name.localeCompare(b.Name))
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">友情链接</h1>

      {err && (
        <div className="mb-6 text-sm p-3 rounded-lg border">
          <div className="font-medium">读取 Notion 失败</div>
          <div className="opacity-80 mt-1">{err}</div>
        </div>
      )}

      {(!data || data.length === 0) ? (
        <div className="text-sm opacity-70">暂无数据。请确认数据库里至少有一条记录（Name / URL / Category）。</div>
      ) : (
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
      )}
    </div>
  )
}

// ✅ 改用 SSR：构建阶段不预渲染这个页面，从而规避 “page wasn’t built”
export async function getServerSideProps() {
  try {
    const { items, categories } = await getLinksAndCategories()
    return { props: { data: items, categories } }
  } catch (e) {
    return { props: { data: [], categories: [], err: String(e?.message || e) } }
  }
}
