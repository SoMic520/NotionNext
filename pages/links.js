import Head from 'next/head'
import { getFavicon, getLinksAndCategories } from '@/lib/links'

export async function getStaticProps() {
  try {
    const { items, categories } = await getLinksAndCategories()
    return {
      props: { items, categories },
      revalidate: 600
    }
  } catch (error) {
    console.error('[links] fetch error:', error)
    return {
      props: { items: [], categories: [] },
      revalidate: 300
    }
  }
}

function sortItems(list = []) {
  return [...list].sort((a, b) => {
    const w = (b.Weight || 0) - (a.Weight || 0)
    if (w !== 0) return w
    return (a.Name || '').localeCompare(b.Name || '', 'zh-Hans-CN')
  })
}

export default function LinksPage({ items = [], categories = [] }) {
  const visibleCategories = categories.filter(Boolean)

  return (
    <>
      <Head>
        <title>友情链接</title>
      </Head>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ fontSize: 28, marginBottom: 20 }}>友情链接</h1>

        {visibleCategories.length === 0 && <p>暂无数据</p>}

        {visibleCategories.map(cat => {
          const group = sortItems(
            items.filter(it => (it.Categories || []).includes(cat))
          )
          if (group.length === 0) return null

          return (
            <section key={cat} style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, marginBottom: 12 }}>{cat}</h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 12
                }}
              >
                {group.map(it => (
                  <a
                    key={it.id}
                    href={it.URL}
                    target='_blank'
                    rel='noopener noreferrer nofollow external'
                    onClick={e => e.stopPropagation()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid #e5e7eb',
                      borderRadius: 10,
                      padding: 12,
                      textDecoration: 'none',
                      color: 'inherit',
                      background: '#fff'
                    }}
                  >
                    <img
                      src={it.Logo || it.Avatar}
                      alt={it.Name}
                      width={40}
                      height={40}
                      loading='lazy'
                      style={{ borderRadius: 8, marginRight: 12, flexShrink: 0 }}
                      onError={e => {
                        if (!e.currentTarget.dataset.fallback) {
                          e.currentTarget.dataset.fallback = 'favicon'
                          e.currentTarget.src = getFavicon(it.URL)
                        } else if (e.currentTarget.dataset.fallback === 'favicon') {
                          e.currentTarget.dataset.fallback = 'local'
                          e.currentTarget.src = '/favicon.ico'
                        }
                      }}
                    />
                    <span style={{ minWidth: 0 }}>
                      <strong
                        style={{
                          display: 'block',
                          marginBottom: 4,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {it.Name}
                      </strong>
                      {it.Description && (
                        <small
                          style={{
                            display: 'block',
                            color: '#6b7280',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {it.Description}
                        </small>
                      )}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )
        })}
      </main>
    </>
  )
}
