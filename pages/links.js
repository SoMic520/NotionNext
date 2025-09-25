// /pages/links.js
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { DynamicLayout } from '@/themes/theme'
import getLinksAndCategories from '@/lib/links' // 默认导入，最稳

function safeHost(u) { try { return new URL(u).hostname } catch { return '' } }

function LinksBody({ data = [], categories = [] }) {
  const groups = (categories || []).map(cat => ({
    cat,
    items: (data || [])
      .filter(x => (cat === '未分类' ? !(x.Categories && x.Categories.length) : (x.Categories || []).includes(cat)))
      .sort((a, b) => (b.Weight || 0) - (a.Weight || 0) || String(a.Name || '').localeCompare(String(b.Name || '')))
  }))

  return (
    <div className="links-wrap">
      <header className="top">
        <h1>友情链接</h1>
        <p>精选站点，按分类归纳。悬停查看简介，点击将在新窗口打开。</p>
      </header>

      {(!data || data.length === 0) ? (
        <div className="empty">暂无数据。请检查 Notion 库授权与字段（Name / URL / Category）。</div>
      ) : (
        <div className="groups">
          {groups.map(({ cat, items }) => (
            <section key={cat} className="group">
              <div className="group-head">
                <h2 className="group-title">{cat}</h2>
                <span className="group-count">共 {items.length} 个</span>
              </div>
              {items.length === 0 ? (
                <div className="group-empty">此分类暂无条目</div>
              ) : (
                <ul className="cards">
                  {items.map(it => {
                    const host = it.URL ? safeHost(it.URL) : ''
                    const initial = it.Avatar || (host ? `https://icons.duckduckgo.com/ip3/${host.replace(/^www\./,'')}.ico` : '/favicon.ico')
                    const s2 = host ? `https://www.google.com/s2/favicons?sz=64&domain=${host}` : '/favicon.ico'
                    return (
                      <li key={`${cat}-${it.URL || it.Name}`}>
                        <a className="card" href={it.URL || '#'} target="_blank" rel="noopener noreferrer nofollow external" aria-label={it.Name}>
                          <div className="icon">
                            <img
                              src={initial}
                              alt={it.Name}
                              loading="lazy"
                              decoding="async"
                              crossOrigin="anonymous"
                              data-fallback="0"
                              onError={e => {
                                const step = Number(e.currentTarget.dataset.fallback || '0')
                                if (step === 0 && host) {
                                  e.currentTarget.dataset.fallback = '1'
                                  e.currentTarget.src = s2
                                } else if (step === 1) {
                                  e.currentTarget.dataset.fallback = '2'
                                  e.currentTarget.src = '/favicon.ico'
                                }
                              }}
                            />
                          </div>
                          <div className="meta">
                            <div className="name">{it.Name}</div>
                            {it.Description && <p className="desc">{it.Description}</p>}
                            {host && <div className="host">{host.replace(/^www\./, '')}</div>}
                          </div>
                          <div className="shine" aria-hidden />
                        </a>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <style jsx>{`
        :root {
          --bg: #ffffff; --card: #ffffff; --txt: #0b1220; --sub: #334155; --muted: #64748b;
          --line: #e5e7eb; --ring: 59,130,246; --glow: 59,130,246; --shadow: 16,24,40; --radius: 18px;
        }
        @media (prefers-color-scheme: dark) {
          :root { --bg:#0b1220; --card:#0d1424; --txt:#e5e7eb; --sub:#cbd5e1; --muted:#94a3b8; --line:#1f2937; --ring:56,189,248; --glow:56,189,248; --shadow:0,0,0; }
        }

        .links-wrap { max-width: 1120px; margin: 0 auto; padding: 42px 16px 60px; background: var(--bg); }
        .top h1 { margin:0; font-size:30px; line-height:1.22; font-weight:800; letter-spacing:-.02em; color:var(--txt) }
        .top p { margin:10px 0 0; font-size:15px; color:var(--muted) }

        .empty { margin-top:16px; padding:28px 20px; border:1px dashed var(--line); border-radius:calc(var(--radius) + 4px); color:var(--muted); text-align:center; backdrop-filter:blur(6px); font-size:15px }

        .groups { display:flex; flex-direction:column; gap:38px; margin-top:14px }
        .group-head { margin-bottom:12px; display:flex; align-items:center; justify-content:space-between }
        .group-title { font-size:19px; font-weight:750; color:var(--txt); margin:0 }
        .group-count { font-size:12px; color:var(--muted) }

        .group-empty { border:1px solid var(--line); border-radius:var(--radius); padding:14px 16px; color:var(--muted); font-size:14px }

        .cards { list-style:none; padding:0; margin:0; display:grid; gap:16px; grid-template-columns:repeat(1, minmax(0, 1fr)) }
        @media (min-width:560px){ .cards{ grid-template-columns:repeat(2, minmax(0, 1fr)) } }
        @media (min-width:900px){ .cards{ grid-template-columns:repeat(3, minmax(0, 1fr)) } }

        .card { position:relative; display:flex; gap:14px; align-items:flex-start; padding:16px; border-radius:var(--radius);
          text-decoration:none; background:var(--card); border:1px solid var(--line);
          box-shadow: 0 1px 1px rgba(var(--shadow), .04), 0 10px 18px rgba(var(--shadow), .06);
          transform:translateZ(0); transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease, background .22s ease; will-change: transform, box-shadow }
        .card:hover { transform:translateY(-2px); box-shadow: 0 2px 4px rgba(var(--shadow), .06), 0 16px 28px rgba(var(--shadow), .10);
          border-color: rgba(var(--ring), .45); background: radial-gradient(900px 180px at 96% 0%, rgba(var(--glow), .06), transparent 55%) var(--card) }
        .card:focus-visible { outline:none; box-shadow: 0 0 0 2px rgba(var(--ring), .9), 0 12px 26px rgba(var(--shadow), .10) }

        .icon { flex:0 0 auto; width:48px; height:48px; border-radius:12px; overflow:hidden; background:linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,0)); border:1px solid var(--line); transform:translateZ(0) }
        .icon img { width:100%; height:100%; object-fit:cover; opacity:0; animation:fadeIn .3s ease-out forwards; display:block }

        .meta { min-width:0 }
        .name { color:var(--txt); font-weight:750; font-size:16px; line-height:1.3; letter-spacing:.01em; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
        .desc { margin:6px 0 0; color:var(--sub); font-size:13px; line-height:1.7; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden }
        .host { margin-top:8px; font-size:12px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis }

        .shine { pointer-events:none; position:absolute; inset:0; border-radius:inherit; background:linear-gradient(135deg, rgba(var(--glow), .0) 40%, rgba(var(--glow), .18) 60%, rgba(var(--glow), .0) 80%); opacity:0; transition:opacity .28s ease }
        .card:hover .shine { opacity:1 }

        @keyframes fadeIn { to { opacity:1 } }
        @media (prefers-reduced-motion: reduce){ .card, .card:hover{ transition:none !important; transform:none !important; box-shadow:none !important } .icon img{ animation:none !important; opacity:1 !important } }
      `}</style>

      <style jsx global>{`
        html.__links_hide_notion article .notion,
        html.__links_hide_notion article .notion-page { display: none !important; }
      `}</style>
    </div>
  )
}

export default function Links(props) {
  const theme = siteConfig('THEME', BLOG.THEME, props?.NOTION_CONFIG)
  if (props.__hasSlug) {
    if (typeof document !== 'undefined') document.documentElement.classList.add('__links_hide_notion')
    return (
      <DynamicLayout theme={theme} layoutName="LayoutSlug" {...props}>
        <LinksBody data={props.items} categories={props.categories} />
      </DynamicLayout>
    )
  }
  return <LinksBody data={props.items} categories={props.categories} />
}

export async function getStaticProps({ locale }) {
  let base = {}
  let items = []
  let categories = []
  let hasSlug = false

  try {
    base = await getGlobalData({ from: 'links', locale })
    const pages = base?.allPages || base?.pages || []
    hasSlug = Array.isArray(pages) && pages.some(p =>
      (p?.slug === 'links' || p?.slug?.value === 'links') &&
      (p?.type === 'Page' || p?.type?.value === 'Page') &&
      (p?.status === 'Published' || p?.status?.value === 'Published' || p?.status === '公开' || p?.status === '已发布')
    )
  } catch (e) {
    base = { NOTION_CONFIG: base?.NOTION_CONFIG || {} }
  }

  try {
    const r = await getLinksAndCategories({ debug: true })
    items = r?.items || []
    categories = r?.categories || []
  } catch (e) {
    items = []
    categories = []
  }

  return {
    props: { ...base, items, categories, __hasSlug: hasSlug },
    revalidate: 600
  }
}
