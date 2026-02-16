import { cleanCache } from '@/lib/cache/local_file_cache'

/**
 * 清理缓存
 * 需要通过环境变量 CACHE_CLEAN_TOKEN 配置访问令牌
 * 请求时需携带 ?token=xxx 或 Authorization header
 * @param {*} req
 * @param {*} res
 */
export default async function handler(req, res) {
  // 仅允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed. Use POST.' })
  }

  // 验证访问令牌（如果配置了 CACHE_CLEAN_TOKEN）
  const configuredToken = process.env.CACHE_CLEAN_TOKEN
  if (configuredToken) {
    const requestToken = req.query?.token || req.headers?.authorization?.replace('Bearer ', '')
    if (requestToken !== configuredToken) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: invalid token' })
    }
  }

  try {
    await cleanCache()
    res.status(200).json({ status: 'success', message: 'Clean cache successful!' })
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Clean cache failed!' })
  }
}
