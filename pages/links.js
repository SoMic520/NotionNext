// /pages/links.js
import { getLinksAndCategories } from '@/lib/links'

export async function getStaticProps() {
  try{
    const r = await getLinksAndCategories()
    return { props: { data: r.items, categories: r.categories, ok:true }, revalidate: 3600 }
  }catch(e){
    return { props: { data: [], categories: [], ok:false, err: String(e?.message || e) }, revalidate: 300 }
  }
}

export default function Links({ data=[], categories=[], ok, err }) {
  const groups = categories.map(cat=>({
    cat,
    items: data
      .filter(x => (cat==='未分类' ? !x.Categories?.length : x.Categories?.includes(cat)))
      .sort((a,b)=> (b.Weight||0)-(a.Weight||0) || a.Name.localeCompare(b.Name))
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-3">友情链接</h1>
      {!ok && (
        <div className="mb-6 text-sm p-3 rounded-lg border">
          <div className="font-medium">未能读取 Notion 数据</div>
          <div className="opacity-80 mt-1">{err}</div>
        </div>
      )}

      {data.length === 0 ? (
        <div className="text-sm opacity-70">暂无数据。请确认数据库里至少有一条记录（Name / URL / Category）。</div>
      ) : (
        <div className="grid gap-10">
          {groups.map(({cat,items})=>(
            <section key={cat}>
              <h2 className="text-xl font-semibold mb-4">{cat}</h2>
              {items.length===0 ? (
                <div className="text-sm opacity-60">此分类暂为空</div>
              ) : (
                <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(it=>(
                    <li key={it.URL} className="border rounded-2xl p-4 hover:shadow transition">
                      <a href={it.URL} target="_blank" rel="noreferrer" className="flex items-center gap-3 no-underline">
                        <img
                          src={it.Avatar || '/favicon.ico'}
                          alt={it.Name}
                          className="w-10 h-10 rounded-lg object-cover"
                          onError={e=>{ e.currentTarget.src='/favicon.ico' }}
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
