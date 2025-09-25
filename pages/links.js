// /pages/links.js
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { DynamicLayout } from '@/themes/theme'
import getLinksAndCategories from '@/lib/links' // 默认导入最稳

function safeHost(u) { try { return new URL(u).hostname.toLowerCase() } catch { return '' } }

function LinksBody({ data = [], categories = [] }) {
  const groups = (categories || []).map(cat => ({
    cat,
    items: (data || [])
      .filter(x => (cat === '未分类' ? !(x.Categories && x.Categories.length) : (x.Categories || []).includes(cat)))
      .sort((a, b) => (b.Weight || 0) - (a.Weight || 0) || String(a.Name || '').localeCompare(String(b.Name || '')))
  }))

  return (
    <div className="wrap">
      <header className="hd">
        <h1>友情链接</h1>
        <p>悬停卡片可预览网页，点击新标签打开。</p>
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
                    // 图标兜底：Avatar → DuckDuckGo → /favicon.ico → Google S2 → 本地
                    const iconDuck = host ? `https://icons.duckduckgo.com/ip3/${host.replace(/^www\./,'')}.ico` : '/favicon.ico'
                    const iconRoot = host ? `https://${host}/favicon.ico` : '/favicon.ico'
                    const iconS2   = host ? `https://www.google.com/s2/favicons?sz=64&domain=${host}` : '/favicon.ico'
                    const initial  = it.Avatar || iconDuck

                    return (
                      <li key={`${cat}-${it.URL || it.Name}`}>
                        <a
                          className="card"
                          href={it.URL || '#'}
                          target="_blank"
                          rel="noopener noreferrer nofollow external"
                          aria-label={it.Name}
                        >
                          {/* 统一大小的小图标方块 */}
                          <div className="icon">
                            <img
                              src={initial}
                              alt={it.Name}
                              title={host || it.Name}
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              data-fallback="0"
                              onError={e => {
                                const step = Number(e.currentTarget.dataset.fallback || '0')
                                if (step === 0) { e.currentTarget.dataset.fallback = '1'; e.currentTarget.src = iconRoot }
                                else if (step === 1) { e.currentTarget.dataset.fallback = '2'; e.currentTarget.src = iconS2 }
                                else if (step === 2) { e.currentTarget.dataset.fallback = '3'; e.currentTarget.src = '/favicon.ico' }
                              }}
                            />
                          </div>

                          {/* 文本信息（两行描述，行高统一；整体最小高保证同排整齐） */}
                          <div className="meta">
                            <div className="name">{it.Name}</div>
                            {it.Description && <p className="desc">{it.Description}</p>}
                            {host && <div className="host">{host.replace(/^www\./, '')}</div>}
                          </div>

                          {/* 悬停预览：更大的“网页实时预览”窗口（iframe） */}
                          {it.URL && (
                            <div className="preview" aria-hidden>
                              <div className="preview-inner" data-loaded="0">
                                <div className="preview-bar">
                                  <span className="dot" /><span className="dot" /><span className="dot" />
                                  <span className="url">{host}</span>
                                </div>
                                <div className="frame-wrap">
                                  <iframe
                                    className="frame"
                                    src={it.URL}
                                    title={it.Name}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-pointer-lock allow-modals"
                                    onLoad={e => e.currentTarget.closest('.preview-inner')?.setAttribute('data-loaded', '1')}
                                  />
                                  <div className="loading">
                                    <span className="spinner" /> 预览加载中…
                                  </div>
                                </div>
                                <div className="preview-tip">若站点禁止内嵌预览，请直接点击卡片访问</div>
                              </div>
                            </div>
                          )}
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
        :root{
          --txt:#0b1220; --sub:#334155; --muted:#64748b;
          --box:#cfd6e3;        /* 方框边 */
          --ring:#7aa2ff;       /* 高亮颜色 */
          --radius:12px;
        }
        @media (prefers-color-scheme: dark){
          :root{ --txt:#e5e7eb; --sub:#cbd5e1; --muted:#94a3b8; --box:#273448; --ring:#4aa8ff }
        }

        .wrap{ max-width:1100px; margin:0 auto; padding:28px 16px 56px; }
        .hd h1{ margin:0; font-size:28px; font-weight:800; color:var(--txt) }
        .hd p{ margin:8px 0 0; font-size:14px; color:var(--muted) }

        .empty{ margin-top:16px; padding:18px; border:1px dashed var(--box); border-radius:var(--radius); color:var(--muted); text-align:center }

        .groups{ display:flex; flex-direction:column; gap:28px; margin-top:12px }
        .group-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px }
        .group-title{ margin:0; font-size:18px; font-weight:700; color:var(--txt) }
        .group-count{ font-size:12px; color:var(--muted) }

        .group-empty{ border:1px solid var(--box); border-radius:var(--radius); padding:12px 14px; color:var(--muted); font-size:14px }

        /* 同一排“宽度一致”：自适应列宽，但每列最小 320px，最大平均分 */
        .cards{
          list-style:none; padding:0; margin:0;
          display:grid; gap:14px;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        }

        /* 关键：透明背景，仅边框的“方框卡片”，缩放丝滑且不跳（不改边框宽度） */
        .card{
          position:relative; display:flex; gap:12px; align-items:flex-start;
          padding:14px; border:1px solid var(--box); border-radius:var(--radius);
          text-decoration:none; background: transparent;
          transform: translateZ(0) scale(1); will-change: transform, box-shadow;
          transition: transform .22s cubic-bezier(.2,.8,.2,1), box-shadow .22s ease, outline-color .22s ease;
          outline: 0;      /* hover 用外发光，不改 border 宽度，避免尺寸抖动 */
          min-height: 96px; /* 保证同排看起来齐整 */
        }
        .card:hover{
          transform: translateY(-1px) scale(1.015);         /* 丝滑缩放 */
          box-shadow: 0 0 0 1px var(--ring), 0 10px 28px rgba(0,0,0,.10);
        }
        .card:focus-visible{
          box-shadow: 0 0 0 2px var(--ring), 0 12px 30px rgba(0,0,0,.12);
        }

        /* 左侧小图标方块（统一尺寸） */
        .icon{
          flex:0 0 auto; width:44px; height:44px;
          border-radius:10px; overflow:hidden;
          border:1px solid var(--box); background: transparent;
        }
        .icon img{ width:100%; height:100%; object-fit:cover; display:block }

        .meta{ min-width:0 }
        .name{ color:var(--txt); font-weight:800; font-size:16px; line-height:1.25; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
        .desc{ margin:4px 0 0; color:var(--sub); font-size:13px; line-height:1.55; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden }
        .host{ margin-top:6px; font-size:12px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis }

        /* —— 大号“网页预览” —— */
        .preview{
          pointer-events:none;   /* 避免与 hover 交互打架；需要交互可去掉 */
          position:absolute; inset:auto auto calc(100% + 12px) 0;
          opacity:0; transform: translateY(-8px) scale(.98);
          transition: opacity .18s ease, transform .18s ease;
          z-index:40;
          display:none; /* 移动端默认隐藏 */
        }
        @media (min-width: 900px){ .preview{ display:block } }
        .card:hover .preview{ opacity:1; transform: translateY(-14px) scale(1) }

        .preview-inner{
          width: clamp(520px, 60vw, 860px);     /* 比之前更大 */
          height: clamp(300px, 48vh, 520px);
          border: 1px solid var(--ring);
          border-radius: 14px;
          overflow: hidden;
          background: #0b1220EE; /* 深色半透明，防止页面下层穿透 */
          backdrop-filter: blur(8px) saturate(130%);
          box-shadow: 0 18px 48px rgba(0,0,0,.28);
          position: relative;
        }
        .preview-bar{
          height: 34px; display:flex; align-items:center; gap:8px;
          padding: 0 10px; color:#cbd5e1; font-size:12px; background: rgba(255,255,255,.06);
          border-bottom: 1px solid rgba(255,255,255,.08);
        }
        .preview-bar .dot{ width:10px; height:10px; border-radius:50%; background:#e87979 }
        .preview-bar .dot:nth-child(2){ background:#fbbf24 }
        .preview-bar .dot:nth-child(3){ background:#34d399 }
        .preview-bar .url{ margin-left:6px; opacity:.85; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }

        .frame-wrap{ position:absolute; inset:34px 0 22px 0; }
        .frame{
          width:100%; height:100%; border:0;
          background:#0b1220; /* 先给个底色 */
        }
        .loading{
          position:absolute; inset:34px 0 22px 0; display:flex; align-items:center; justify-content:center;
          color:#cbd5e1; font-size:12px; gap:10px; background: rgba(0,0,0,.18);
          opacity:1; transition: opacity .2s ease;
        }
        .preview-inner[data-loaded="1"] .loading{ opacity:0; pointer-events:none }

        .spinner{
          width:12px; height:12px; border-radius:50%;
          border:2px solid rgba(255,255,255,.35); border-top-color:#fff;
          animation: spin 1s linear infinite;
        }
        @keyframes spin{ to{ transform: rotate(360deg) } }

        @media (prefers-reduced-motion: reduce){
          .card, .card:hover{ transition:none !important; transform:none !important; box-shadow:none !important }
          .preview, .card:hover .preview{ transition:none !important }
        }
      `}</style>

      <style jsx global>{`
        html.__links_hide_notion article .notion,
        html.__links_hide_notion article .notion-page { display:none !important; }
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

// ISR：稳定；并探测是否存在 slug=links 占位页
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
    const r = await getLinksAndCategories({ debug: false })
    items = r?.items || []
    categories = r?.categories || []
  } catch (e) {
    items = []
    categories = []
  }

  return { props: { ...base, items, categories, __hasSlug: hasSlug }, revalidate: 600 }
}
