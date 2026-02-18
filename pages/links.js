// /pages/links.js
import { getLinksAndCategories } from '../lib/links'

function LinksBody({ data = [], categories = [] }) {
  const groups = (categories || []).map(cat => ({
    cat,
    items: (data || [])
      .filter(x => (cat === '\u672a\u5206\u7c7b'
        ? !(x.Categories && x.Categories.length)
        : (x.Categories && x.Categories.includes(cat))
      ))
      .sort((a, b) => ((b.Weight || 0) - (a.Weight || 0)) || a.Name.localeCompare(b.Name))
  }))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 12px' }}>\u53cb\u60c5\u94fe\u63a5</h1>

      {(!data || data.length === 0) ? (
        <div style={{ opacity: 0.7 }}>\u6682\u65e0\u6570\u636e\u3002\u8bf7\u68c0\u67e5 Notion \u5e93\u6388\u6743\u4e0e\u5b57\u6bb5\uff08Name / URL / Category\uff09\u3002</div>
      ) : (
        <div style={{ display: 'grid', gap: 40 }}>
          {groups.map(({ cat, items }) => (
            <section key={cat}>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 12px' }}>{cat}</h2>
              {items.length === 0 ? (
                <div style={{ opacity: 0.6, fontSize: 14 }}>\u6b64\u5206\u7c7b\u6682\u65e0\u6761\u76ee</div>
              ) : (
                <ul style={{
                  listStyle: 'none', padding: 0, margin: 0,
                  display: 'grid', gap: 16,
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))'
                }}>
                  {items.map(it => (
                    <li key={cat + '-' + it.URL} style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 14 }}>
                      <a
                        href={it.URL}
                        target="_blank"
                        rel="noopener noreferrer nofollow external"
                        style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', cursor: 'pointer' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <img
                          src={(it.Logo || it.Avatar)}
                          alt={it.Name}
                          loading="lazy"
                          style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
                          onError={e => {
                            try {
                              const u = new URL(it.URL)
                              e.currentTarget.src = 'https://icons.duckduckgo.com/ip3/' + u.hostname + '.ico'
                            } catch {
                              e.currentTarget.src = '/favicon.ico'
                            }
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 600 }}>{it.Name}</div>
                          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 2 }}>{it.Description}</div>
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

export default function LinksPage(props) {
  return <LinksBody data={props.items} categories={props.categories} />
}

export async function getStaticProps() {
  try {
    const { items, categories } = await getLinksAndCategories()
    return { props: { items, categories }, revalidate: 600 }
  } catch (e) {
    return { props: { items: [], categories: [] }, revalidate: 300 }
  }
}
