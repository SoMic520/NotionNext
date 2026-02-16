import subscribeToMailchimpApi from '@/lib/plugins/mailchimp'

// 简单的邮箱格式验证
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// 限制名称长度，防止滥用
const MAX_NAME_LENGTH = 100

/**
 * 接受邮件订阅
 * @param {*} req
 * @param {*} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' })
  }

  const { email, firstName, lastName } = req.body || {}

  // 验证邮箱格式
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ status: 'error', message: 'Invalid email address' })
  }

  // 验证名称长度
  if (firstName && (typeof firstName !== 'string' || firstName.length > MAX_NAME_LENGTH)) {
    return res.status(400).json({ status: 'error', message: 'Invalid first name' })
  }
  if (lastName && (typeof lastName !== 'string' || lastName.length > MAX_NAME_LENGTH)) {
    return res.status(400).json({ status: 'error', message: 'Invalid last name' })
  }

  try {
    const response = await subscribeToMailchimpApi({
      email: email.trim().toLowerCase(),
      first_name: firstName?.trim() || '',
      last_name: lastName?.trim() || ''
    })
    await response.json()
    res.status(200).json({ status: 'success', message: 'Subscription successful!' })
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Subscription failed!' })
  }
}
