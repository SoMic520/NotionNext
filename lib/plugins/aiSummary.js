import { getDataFromCache, setDataToCache } from '@/lib/cache/cache_manager'
import { siteConfig } from '@/lib/config'

/**
 * get Ai summary
 * @returns {Promise<string>}
 * @param aiSummaryAPI
 * @param aiSummaryKey
 * @param truncatedText
 */
export async function getAiSummary(aiSummaryAPI, aiSummaryKey, truncatedText) {
  try {
    if (!aiSummaryAPI) return null
    const content = String(truncatedText || '')
    console.log('请求文章摘要', content.slice(0, 100))
    const response = await fetch(aiSummaryAPI, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: aiSummaryKey,
        content
      })
    })

    if (response.ok) {
      const data = await response.json()
      return data?.summary || null
    } else {
      throw new Error(`Response not ok: ${response.status}`)
    }
  } catch (error) {
    console.error('ChucklePostAI：请求失败', error)
    return null
  }
}

/**
 * 获取文章摘要
 * @param props
 * @param pageContentText
 * @returns {Promise<void>}
 */
export async function getPageAISummary(post, pageContentText = '') {
  if (!post?.id) return
  const aiSummaryAPI = siteConfig('AI_SUMMARY_API')
  if (aiSummaryAPI) {
    const cacheKey = `ai_summary_${post.id}`
    let aiSummary = await getDataFromCache(cacheKey)
    if (aiSummary) {
      post.aiSummary = aiSummary
    } else {
      const aiSummaryKey = siteConfig('AI_SUMMARY_KEY')
      const aiSummaryCacheTime = siteConfig('AI_SUMMARY_CACHE_TIME')
      const wordLimit = Number(siteConfig('AI_SUMMARY_WORD_LIMIT', 1000)) || 1000
      let content = ''
      if (Array.isArray(post.toc)) {
        for (const heading of post.toc) {
          content += `${heading?.text || ''} `
        }
      }
      content += pageContentText || ''
      const combinedText = `${post.title || ''} ${content}`
      const truncatedText = combinedText.slice(0, wordLimit)
      aiSummary = await getAiSummary(aiSummaryAPI, aiSummaryKey, truncatedText)
      if (aiSummary) {
        await setDataToCache(cacheKey, aiSummary, aiSummaryCacheTime)
        post.aiSummary = aiSummary
      }
    }
  }
}
