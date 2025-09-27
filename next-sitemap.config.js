const BLOG = require('./blog.config')

/**
 * 通常没啥用，sitemap交给 /pages/sitemap.xml.js 动态生成
 */
module.exports = {  // 将中文句号改为英文句号
  siteUrl: BLOG.LINK,  // 确保BLOG.LINK是正确的
  changefreq: 'daily',
  priority: 0.7,
  generateRobotsTxt: true,
  sitemapSize: 7000,  // 修复语法错误：添加逗号
  // ...other options 
  // https://github.com/iamvishnusankar/next-sitemap#configuration-options 
}
