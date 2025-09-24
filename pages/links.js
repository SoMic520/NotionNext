// /pages/links.js   （src 结构就放 /src/pages/links.js）
import { getLinksAndCategories } from '@/lib/links'

function LinksBody({ data = [], categories = [] }) {
  const groups = (categories || []).map(cat => ({
    cat,
    items: (data || [])
      .filter(x => (cat === '未分类' ? !x.Categories?.length : x.Categories?.includes(cat)))
      .sort((a, b) => (b.Weight || 0) - (a.Weight || 0) || a.Name.localeCompare(b.Name))
  }))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, marginBottom: 12 }}>友情链接</h1>

      {(!data || data.length === 0) ? (
        <div style={{ opacity: .7 }}>暂无数据。请检查 Notion 库授权与字段（Name / URL / Category）。</div>
      ) : (
        <div style={{ display: 'grid', gap: 40 }}>
          {groups.map(({ cat, items }) => (
            <section key={cat}>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 12px' }}>{cat}</h2>
              {items.length === 0 ? (
                <div style={{ opacity: .6, fontSize: 14 }}>此分类暂无条目</div>
              ) : (
                <ul style={{
                  listStyle: 'none', padding: 0, margin: 0,
                  display: 'grid', gap: 16,
                  gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))'
                }}>
                  {items.map(it => (
                    <li key={`${cat}-${it.URL}`} style={{
                      border: '1px solid #e5e7eb', borderRadius: 16, padding: 14
                    }}>
                      <a
                        href={it.URL}
                        target="_blank"
                        rel="noopener noreferrer nofollow external"
                        style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}
                      >
                        <img
                          src={it.Avatar}
                          alt={it.Name}
                          loading="lazy"
                          style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
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
                          <div style={{ fontWeight: 600 }}>{it.Name}</div>
                          <div style={{ opacity: .7, fontSize: 12, marginTop: 2 }}>{it.Description}</div>
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

export default function Links(props) {
  return <LinksBody data={props.items} categories={props.categories} />
}

// ✅ ISR：首个请求生成静态页；之后从 CDN 直出；后台定期增量刷新。
// 失败时也返回空数据，页面不会“无限加载”或报错。
export async function getStaticProps() {
  try {
    const { items, categories } = await getLinksAndCategories()
    return { props: { items, categories }, revalidate: 600 } // 10 分钟刷新一次
  } catch (e) {
    return { props: { items: [], categories: [] }, revalidate: 300 }
  }
}
