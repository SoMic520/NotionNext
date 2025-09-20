import { useEffect, useMemo, useState } from 'react'

/** 推荐页（卡片风格 + 交互优化） */
export default function LayoutRecommend (props) {
  // 数据源兜底：posts 优先，其次 allPages
  const posts = (props?.posts && props.posts.length
    ? props.posts
    : (props?.allPages && props.allPages.length ? props.allPages : []))

  /** ---------- 数据规范化 / 过滤 ---------- */
  // 标准化 recommend => string[]
  const normRec = (p) => {
    let v = p?.recommend
    if (!v && p?.ext && typeof p.ext === 'object') v = p.ext.recommend
    if (!v) return []
    if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean)
    if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean)
    return []
  }

  const allPublished = useMemo(
    () => (posts || []).filter(p => p?.type === 'Post' && p?.status === 'Published'),
    [posts]
  )
  const recPosts = useMemo(
    () => allPublished.filter(p => normRec(p).length > 0),
    [allPublished]
  )

  // Tabs & 计数
  const tabCounts = useMemo(() => {
    const map = new Map()
    recPosts.forEach(p => normRec(p).forEach(t => map.set(t, (map.get(t) || 0) + 1)))
    return map
  }, [recPosts])
  const tabs = useMemo(() => Array.from(tabCounts.keys()), [tabCounts])

  /** ---------- 选中/搜索：持久化 + URL 同步 ---------- */
  const url = typeof window !== 'undefined' ? new URL(window.location.href) : null
  const initSelected = url?.searchParams.get('r') || (typeof window !== 'undefined' ? localStorage.getItem('__rec_tab__') : null) || null
  const initQ = url?.searchParams.get('q') || (typeof window !== 'undefined' ? localStorage.getItem('__rec_q__') : '') || ''

  const [selected, setSelected] = useState(initSelected)
  const [q, setQ] = useState(initQ)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const usp = new URLSearchParams(window.location.search)
    if (selected) usp.set('r', selected); else usp.delete('r')
    if (q?.trim()) usp.set('q', q.trim()); else usp.delete('q')
    const newUrl = `${window.location.pathname}${usp.toString() ? `?${usp.toString()}` : ''}`
    window.history.replaceState(null, '', newUrl)
    localStorage.setItem('__rec_tab__', selected || '')
    localStorage.setItem('__rec_q__', q || '')
  }, [selected, q])

  // 结果集
  const filtered = useMemo(() => {
    let list = recPosts
    if (selected) list = list.filter(p => normRec(p).includes(selected))
    if (q.trim()) {
      const key = q.trim().toLowerCase()
      list = list.filter(p => (p?.title || '').toLowerCase().includes(key))
    }
    return list
  }, [recPosts, selected, q])

  const getDate = p => p?.publishDay || p?.date?.start_date || p?.lastEditedDay || ''
  const getSummary = p => {
    const s = (p?.summary || '').trim()
    if (!s) return ''
    return s.length > 120 ? `${s.slice(0, 118)}…` : s
  }

  /** ---------- UI ---------- */
  const hasActiveFilter = Boolean(selected) || Boolean(q.trim())

  // 你不喜欢蓝色，这里用「墨色 + 悬停变绿」；想换色改这两个变量即可
  const titleBase = 'text-lg md:text-xl font-medium text-slate-800 dark:text-slate-100'
  const titleHover = 'group-hover:scale-[1.02] group-hover:text-emerald-600 dark:group-hover:text-emerald-400'

  return (
    <div className='max-w-5xl mx-auto px-4 py-6'>
      <h1 className='text-3xl md:text-4xl font-extrabold tracking-tight mb-4'>
        推荐文章
      </h1>

      {/* 顶部状态/筛选条 */}
      <div className='sticky top-16 z-20 mb-6'>
        <div className='rounded-2xl border border-gray-200/70 dark:border-white/10 bg-gradient-to-b from-white/85 to-white/60 dark:from-black/50 dark:to-black/30 backdrop-blur shadow-sm px-4 py-3 flex flex-col gap-3'>
          {/* 统计 + 清空 */}
          <div className='flex flex-col md:flex-row md:items-center gap-3'>
            <div className='text-sm text-gray-600 dark:text-gray-300'>
              共 <b>{allPublished.length}</b> 篇文章
              {selected ? <>，当前「{selected}」：<b>{filtered.length}</b></> : null}
              {q?.trim() ? <>，搜索：<b>{q.trim()}</b></> : null}
            </div>

            <div className='grow' />

            {hasActiveFilter && (
              <button
                onClick={() => { setSelected(null); setQ('') }}
                className='text-xs md:text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition'>
                <i className='fas fa-rotate-left mr-1.5' />
                清空筛选
              </button>
            )}
          </div>

          {/* 搜索框 */}
          <div className='flex items-center gap-2'>
            <div className='relative'>
              <i className='fas fa-magnifying-glass absolute left-3 top-2.5 text-gray-400 dark:text-gray-500 text-sm' />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder='搜索标题…'
                className='w-64 md:w-80 pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10'
              />
            </div>
          </div>

          {/* Tabs */}
          <div className='flex flex-wrap gap-2'>
            <button
              onClick={() => setSelected(null)}
              className={
                'px-3 py-1.5 rounded-2xl border text-sm transition ' +
                (!selected
                  ? 'bg-black text-white dark:bg-white dark:text-black border-black/10 dark:border-white/10'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10 hover:bg-gray-200/70 dark:hover:bg-white/20')
              }>
              全部
              <span className='ml-2 text-xs opacity-80'>{recPosts.length}</span>
            </button>

            {tabs.map(t => {
              const active = selected === t
              const count = tabCounts.get(t) || 0
              return (
                <button
                  key={t}
                  onClick={() => setSelected(t)}
                  title={t}
                  className={
                    'px-3 py-1.5 rounded-2xl border text-sm transition ' +
                    (active
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black/10 dark:border-white/10'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10 hover:bg-gray-200/70 dark:hover:bg-white/20')
                  }>
                  {t}
                  <span className='ml-2 text-xs opacity-80'>{count}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 卡片列表 */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5'>
        {filtered.length === 0 && (
          <div className='col-span-full py-16 text-center text-sm text-gray-500 dark:text-gray-400 rounded-2xl border border-dashed border-gray-300 dark:border-white/10'>
            暂无匹配的推荐文章
          </div>
        )}

        {filtered.map(p => {
          const recs = normRec(p)
          return (
            <a
              key={p.id}
              href={p?.slug ? `/${p.slug}` : `/post/${p.id}`}
              className='group rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] hover:bg-white/90 dark:hover:bg-white/[0.06] shadow-sm hover:shadow-md transition overflow-hidden'>
              <div className='p-4 md:p-5 flex flex-col h-full'>
                {/* 标题 */}
                <div className={`${titleBase} transform transition ${titleHover}`}>
                  {p.title}
                </div>

                {/* 标签徽标 */}
                {recs.length > 0 && (
                  <div className='mt-2 flex flex-wrap gap-1.5'>
                    {recs.map(r => (
                      <span
                        key={r}
                        className='px-2 py-0.5 rounded-full text-xs border border-gray-200 dark:border-white/15 bg-gray-100/60 dark:bg-white/5 text-gray-700 dark:text-gray-200'>
                        <i className='fas fa-hashtag mr-1 opacity-70' />
                        {r}
                      </span>
                    ))}
                  </div>
                )}

                {/* 摘要 */}
                {getSummary(p) && (
                  <p className='mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-3'>
                    {getSummary(p)}
                  </p>
                )}

                {/* 底部信息 */}
                <div className='mt-auto pt-3 text-sm tabular-nums text-gray-500 dark:text-gray-400 flex items-center justify-between'>
                  <span className='inline-flex items-center gap-1.5'>
                    <i className='fas fa-file-lines opacity-60' />
                    文章
                  </span>
                  <span>{getDate(p)}</span>
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
