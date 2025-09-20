import { useMemo, useState } from 'react'

export default function LayoutRecommend (props) {
  const { posts = [] } = props
  const recPosts = useMemo(() => posts.filter(p => p?.recommend), [posts])
  const tabs = useMemo(() => {
    const s = new Set()
    recPosts.forEach(p => {
      const v = p.recommend
      if (Array.isArray(v)) v.forEach(x => s.add(x))
      else if (typeof v === 'string') s.add(v)
    })
    return Array.from(s)
  }, [recPosts])

  const [selected, setSelected] = useState(null)
  const list = useMemo(() => {
    if (!selected) return recPosts
    return recPosts.filter(p =>
      Array.isArray(p.recommend) ? p.recommend.includes(selected) : p.recommend === selected
    )
  }, [recPosts, selected])

  return (
    <div className='max-w-3xl mx-auto px-4 py-6'>
      <h1 className='text-2xl font-semibold mb-4'>推荐文章</h1>
      <div className='flex flex-wrap gap-2 mb-4'>
        <button onClick={() => setSelected(null)} className='px-3 py-1 border rounded-2xl'>
          全部
        </button>
        {tabs.map(t => (
          <button key={t} onClick={() => setSelected(t)} className='px-3 py-1 border rounded-2xl'>
            {t}
          </button>
        ))}
      </div>
      <ul className='divide-y divide-gray-200 dark:divide-gray-700'>
        {list.map(p => (
          <li key={p.id} className='py-2 flex justify-between'>
            <a href={p?.slug ? `/${p.slug}` : `/post/${p.id}`}>{p.title}</a>
            <span className='text-sm text-gray-500'>{p.publishDay}</span>
          </li>
        ))}
        {list.length === 0 && <li className='py-6 text-center text-gray-500'>暂无推荐文章</li>}
      </ul>
    </div>
  )
}
