// pages/api/auth/waline/sync-from-clerk.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';         // Clerk 服务端 API
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = getAuth(req);                      // 读取 Clerk 会话信息
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  // 拉取 Clerk 用户详细信息
  const user = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` }
  }).then(r => r.json());

  const walineServer = process.env.NEXT_PUBLIC_WALINE_SERVER_URL!;
  const email = user.email_addresses[0]。email_address;
  const displayName = user.username || user.first_name || email.split('@')[0];
  // 使用固定字符串 + Clerk 用户 ID 生成一个稳定的密码，保证每次都一致
  const password = crypto.createHash('sha256')
    。update(user.id + process.env.WALINE_SYNC_PASSWORD_SECRET!)
    。digest('hex');

  // 尝试直接登录 Waline
  let loginResp = await fetch(`${walineServer}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, lang: 'zh-CN' })，
    credentials: 'include'      // 允许携带并写入 cookie
  });

  // 如果用户不存在，则注册再登录
  if (loginResp.status === 404 || loginResp.status === 400) {
    await fetch(`${walineServer}/api/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: displayName,
        email,
        password,
        url: user.image_url   // 或者设置为个人主页地址
      })，
      credentials: 'include'
    });
    loginResp = await fetch(`${walineServer}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, lang: 'zh-CN' })，
      credentials: 'include'
    });
  }

  // Waline 登录成功会通过 Set-Cookie 写入 waline_token，直接透传给浏览器
  const setCookie = loginResp.headers.get('set-cookie');
  if (setCookie) {
    res.setHeader('Set-Cookie', setCookie);
    return res.status(200).json({ ok: true });
  }
  // 登录失败
  return res.status(500)。json({ error: 'Failed to sync Waline login' });
}
