// /pages/links.js
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { DynamicLayout } from '@/themes/theme'
import { getLinksAndCategories } from '@/lib/links'

function DebugPanel({ __err, __dbg, __env }) {
  if (!__err && !__dbg) return null
  return (
    <div className="dbg">
      <h3>调试信息（仅无数据时展示）</h3>
      {__err && <pre className="block">{String(__err)}</pre>}
      {__dbg && (
        <ul>
          <li>NOTION_VERSION: {__dbg.NOTION_VERSION}</li>
          <li>过滤是否被环境变量禁用: {__dbg.DISABLE_FILTER ? '是(FRIENDS_NO_FILTER=1)' : '否'}</li>
          <li>数据库标题: {__dbg.dbTitle || '(空)'}</li>
          <li>数据库是否包含 Category 列: {__dbg.dbHasCategory ? '是' : '否'}</li>
          <li>状态过滤字段: {__dbg.filterKey || '(未找到，将不筛选)'}</li>
          <li>过滤类型: {__dbg.filterType || '(无)'}</li>
          {__dbg.filterOptions && <li>可选状态值: {__dbg.filterOptions.join(', ')}</li>}
          {__dbg.filterUsable && <li>允许的状态匹配: {__dbg.filterUsable.join(', ') || '(无)'}</li>}
          <li>带过滤条数: {__dbg.countWithFilter}</li>
          <li>是否回退无过滤: {__dbg.fallbackNoFilter ? '是' : '否'}</li>
          <li>无过滤条数: {__dbg.countNoFilter}</li>
        </ul>
      )}
      {__env && (
        <>
          <h4>环境变量</h4>
          <ul>
            <li>NOTION_TOKEN: {__env.hasToken ? '已设置' : '未设置'}</li>
            <li>FRIENDS_DB_ID: {__env.dbMasked}</li>
            <li>FRIENDS_NO_FILTER: {__env.noFilter ? '1(已禁用过滤)' : '(未禁用)'}</li>
            <li>FRIENDS_DEBUG: {__env.debug ? '1(开启)' : '(关闭)'}</li>
          </ul>
        </>
      )}
      <p className="tip">
        若 <code>带过滤条数=0</code> 而 <code>无过滤条数&gt;0</code>，请检查数据库中的“发布状态”列是否包含“已发布/公开/正常”等允许值；
        或临时设置 <code>FRIENDS_NO_FILTER=1</code> 以忽略发布筛选。
      </p>
      <style jsx>{`
        .dbg { margin-top: 16px; padding: 14px; border:1px dashed #e5e7eb; border-radius: 12px; font-size: 13px; color:#374151; }
        .dbg h3{ margin:0 0 8px; font-size:14px; font-weight:700;}
        .dbg h4{ margin:10px 0 6px; font-size:13px; font-weight:700;}
        .dbg pre{ white-space:pre-wrap; background:#fafafa; padding:8px; border-radius:8px; border:1px solid #efefef}
        .dbg ul{ margin:6px 0; padding-left:16px}
        .dbg .tip{ margin-top:8px; color:#6b7280}
        @media (prefers-color-scheme: dark){
          .dbg{ border-color:#1f2937; color:#cbd5e1}
          .dbg pre{ background:#0f172a; border-color:#1f2937}
        }
      `}</style>
    </div>
  )
}

function LinksBody({ data = [], categories = [], debugInfo, envInfo }) {
  const groups = (categories || []).map(cat => ({
    cat,
    items: (data || [])
      .filter(x => (cat === '未分类' ? !x.Categories?.length : x.Categories?.includes(cat)))
      .sort((a, b) => (b.Weight || 0) - (a.Weight || 0) || a.Name.localeCompare(b.Name))
  }))

  return (
    <div className="links-wrap">
      <header className="top">
        <h1>友情链接</h1>
        <p>精选站点，按分类归纳。悬停查看简介，点击将在新窗口打开。</p>
      </header>

      {(!data || data.length === 0) ? (
        <>
          <div className="empty">
            暂无数据。请检查 Notion 权限与字段；下方调试信息可帮助快速定位。
          </div>
          <DebugPanel __err={debugInfo?.__err} __dbg={debugInfo?.__dbg} __env={envInfo} />
        </>
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
                  {items.map(it => (
                    <li key={`${cat}-${it.URL || it.Name}`}>
                      <a
                        className="card"
                        href={it.URL || '#'}
                        target="_blank"
                        rel="noopener noreferrer nofollow external"
                        aria-label={it.Name}
                      >
                        <div className="icon">
                          <img
                            src={it.Avatar || '/favicon.ico'}
                            alt={it.Name}
                            loading="lazy"
                            onError={e => {
                              try {
                                if (it.URL) {
                                  const u = new URL(it.URL)
                                  e.currentTarget.src = `https://icons.duckduckgo.com/ip3/${u.hostname}.ico`
                                } else {
                                  e.currentTarget.src = '/favicon.ico'
                                }
                              } catch {
                                e.currentTarget.src = '/favicon.ico'
                              }
                            }}
                          />
                        </div>
                        <div className="meta">
                          <div className="name">{it.Name}</div>
                          {it.Description && <p className="desc">{it.Description}</p>}
                          {it.URL && (
                            <div className="host">
                              {(() => {
                                try { return new URL(it.URL).hostname.replace(/^www\./, '') }
                                catch { return '' }
                              })()}
                            </div>
                          )}
                        </div>
                        <div className="shine" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {/* 样式（同上一版现代 UI） */}
      <style jsx>{`
        :root {
          --bg: #ffffff; --card: #ffffffcc; --txt: #0f172a; --sub: #475569; --muted: #64748b;
          --line: #e5e7eb; --ring: 66,153,225; --glow: 59,130,246; --shadow: 16,24,40; --radius: 16px;
        }
        @media (prefers-color-scheme: dark) {
          :root { --bg:#0b1220; --card:#0b1220cc; --txt:#e5e7eb; --sub:#cbd5e1; --muted:#94a3b8; --line:#1f2937; --glow:56,189,248; --shadow:0,0,0; }
        }
        .links-wrap { max-width:1080px; margin:0 auto; padding:40px 16px 56px; background:var(--bg); }
        .top h1 { margin:0; font-size:28px; line-height:1.25; font-weight:800; letter-spacing:-.02em; color:var(--txt)}
        .top p { margin:8px 0 0; font-size:14px; color:var(--muted) }
        .empty { margin-top:16px; padding:28px 20px; border:1px dashed var(--line); border-radius:calc(var(--radius) + 4px); color:var(--muted); text-align:center; backdrop-filter:blur(6px) }
        .groups { display:flex; flex-direction:column; gap:36px; margin-top:12px }
        .group-head { margin-bottom:10px; display:flex; align-items:center; justify-content:space-between }
        .group-title { font-size:18px; font-weight:700; color:var(--txt); margin:0 }
        .group-count { font-size:12px; color:var(--muted) }
        .group-empty { border:1px solid var(--line); border-radius:var(--radius); padding:14px 16px; color:var(--muted); font-size:14px }
        .cards { list-style:none; padding:0; margin:0; display:grid; gap:14px; grid-template-columns:repeat(1, minmax(0,1fr)); }
        @media (min-width:520px){ .cards{ grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media (min-width:880px){ .cards{ grid-template-columns:repeat(3,minmax(0,1fr)); } }
        .card{ position:relative; display:flex; gap:12px; align-items:flex-start; padding:14px; border-radius:var(--radius);
          text-decoration:none; background: radial-gradient(1200px 200px at top right, rgba(var(--glow), .04), transparent 45%), var(--card);
          border:1px solid var(--line); box-shadow: 0 1px 1px rgba(var(--shadow), .04), 0 8px 16px rgba(var(--shadow), .06);
          transform: translateZ(0); transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease, background .25s ease;
          will-change: transform, box-shadow; }
        .card:hover{ transform: translateY(-2px) scale(1.01);
          box-shadow: 0 2px 4px rgba(var(--shadow), .08), 0 14px 28px rgba(var(--shadow), .10), 0 24px 48px rgba(var(--glow), .08);
          border-color: rgba(var(--glow), .35);
          background: radial-gradient(1000px 160px at top right, rgba(var(--glow), .08), transparent 50%), var(--card); }
        .card:focus-visible{ outline:none; box-shadow: 0 0 0 2px rgba(var(--ring), .9), 0 10px 22px rgba(var(--shadow), .10) }
        .icon{ flex:0 0 auto; width:44px; height:44px; border-radius:10px; overflow:hidden; background:linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,0)); border:1px solid var(--line); transform:translateZ(0) }
        .icon img{ width:100%; height:100%; object-fit:cover; opacity:0; animation:fadeIn .3s ease-out forwards; display:block }
        .meta{ min-width:0 }
        .name{ color:var(--txt); font-weight:700; font-size:15px; line-height:1.3; letter-spacing:.01em; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
        .desc{ margin:6px 0 0; color:var(--sub); font-size:12px; line-height:1.6; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden }
        .host{ margin-top:8px; font-size:11px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
        .shine{ pointer-events:none; position:absolute; inset:0; border-radius:inherit; background:linear-gradient(135deg, rgba(var(--glow), .0) 40%, rgba(var(--glow), .18) 60%, rgba(var(--glow), .0) 80%); opacity:0; transition:opacity .28s ease; mask: radial-gradient(200px 120px at 95% 5%, #000 20%, transparent 60%) }
        .card:hover .shine{ opacity:1 }
        @keyframes fadeIn { to { opacity:1 } }
        @media (prefers-reduced-motion: reduce){
          .card, .card:hover { transition:none !important; transform:none !important; box-shadow:none !important }
          .icon img{ animation:none !important; opacity:1 !important }
        }
      `}</style>

      {/* 仅在 /links 隐藏 Notion 正文（当走 LayoutSlug） */}
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
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('__links_hide_notion')
    }
    return (
      <DynamicLayout theme={theme} layoutName="LayoutSlug" {...props}>
        <LinksBody
          data={props.items}
          categories={props.categories}
          debugInfo={{ __err: props.__err, __dbg: props.__dbg }}
          envInfo={props.__env}
        />
      </DynamicLayout>
    )
  }
  return (
    <LinksBody
      data={props.items}
      categories={props.categories}
      debugInfo={{ __err: props.__err, __dbg: props.__dbg }}
      envInfo={props.__env}
    />
  )
}

// ISR + 调试信息透出
export async function getStaticProps({ locale }) {
  let base = {}
  let items = []
  let categories = []
  let hasSlug = false
  let __err = null
  let __dbg = null

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
    __dbg = r?.__debug || null
  } catch (e) {
    __err = e?.message || String(e)
    items = []
    categories = []
  }

  const dbId = process.env.FRIENDS_DB_ID || ''
  const dbMasked = dbId ? (dbId.slice(0,6) + '...' + dbId.slice(-4)) : '(未设置)'
  const __env = {
    hasToken: !!process.env.NOTION_TOKEN,
    dbMasked,
    noFilter: String(process.env.FRIENDS_NO_FILTER || '').toLowerCase() === '1',
    debug:    String(process.env.FRIENDS_DEBUG    || '').toLowerCase() === '1'
  }

  return {
    props: { ...base, items, categories, __hasSlug: hasSlug, __err, __dbg, __env },
    revalidate: 600
  }
}
