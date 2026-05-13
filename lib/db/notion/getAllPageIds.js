import BLOG from '@/blog.config'

export default function getAllPageIds(collectionQuery, collectionId, collectionView, viewIds) {
  if (!collectionQuery && !collectionView) {
    return []
  }

  let pageIds = []

  try {
    // Notion 数据库中的第几个视图用于站点展示和排序：
    const groupIndex = BLOG.NOTION_INDEX || 0
    if (Array.isArray(viewIds) && viewIds.length > 0) {
      const viewId = viewIds[groupIndex] || viewIds[0]
      const queryView = collectionQuery?.[collectionId]?.[viewId]
      const ids =
        queryView?.collection_group_results?.blockIds ||
        queryView?.blockIds ||
        []

      if (Array.isArray(ids)) {
        pageIds.push(...ids.filter(Boolean))
      }
    }
  } catch (error) {
    // 不能在 catch 中引用 try 代码块内部的 ids，否则会把真实异常覆盖成
    // ReferenceError: ids is not defined，导致 Vercel 构建阶段无法定位问题。
    console.error('Error fetching page IDs:', error)
  }

  // 否则按照数据库原始排序
  if (
    pageIds.length === 0 &&
    collectionQuery &&
    collectionId &&
    collectionQuery[collectionId] &&
    Object.values(collectionQuery[collectionId]).length > 0
  ) {
    const pageSet = new Set()
    Object.values(collectionQuery[collectionId]).forEach(view => {
      view?.blockIds?.forEach(id => id && pageSet.add(id)) // group 视图
      view?.collection_group_results?.blockIds?.forEach(id => id && pageSet.add(id)) // table 视图
    })
    pageIds = [...pageSet]
    // console.log('PageIds: 从 collectionQuery 获取', collectionQuery, pageIds.length)
  }

  return pageIds.filter(id => typeof id === 'string' && id)
}
