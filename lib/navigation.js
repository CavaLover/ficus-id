/**
 * 导航配置模块
 */

const NAV_ITEMS = [
  { href: '/', text: '首页' },
  { href: '/classification.html', text: '分类体系' },
  { href: '/lab.html', text: '鉴定实验室' },
  { href: '/morphology.html', text: '形态指南' },
  { href: '/gallery.html', text: '物种图鉴' },
  { href: '/distribution.html', text: '全球分布' },
  { href: '/about.html', text: '关于' },
];

const MORE_ITEMS = [
  { href: '/gallery.html', text: '🖼️ 物种图鉴', style: 'color:var(--primary);font-weight:600;' },
  { href: '/about.html', text: '📖 生态学', style: '' },
];

module.exports = { NAV_ITEMS, MORE_ITEMS };
