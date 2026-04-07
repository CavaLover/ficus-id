/**
 * Sitemap 生成模块
 */

const SITE_BASE_URL = process.env.SITE_BASE_URL || 'https://ficus.gqy25.top';

const PAGES = [
  { url: '/', priority: '1.0', changefreq: 'weekly' },
  { url: '/lab.html', priority: '0.9', changefreq: 'weekly' },
  { url: '/classification.html', priority: '0.7', changefreq: 'monthly' },
  { url: '/morphology.html', priority: '0.7', changefreq: 'monthly' },
  { url: '/gallery.html', priority: '0.6', changefreq: 'monthly' },
  { url: '/distribution.html', priority: '0.5', changefreq: 'monthly' },
  { url: '/about.html', priority: '0.4', changefreq: 'monthly' },
];

function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];
  const urls = PAGES.map(p => `  <url>
    <loc>${SITE_BASE_URL}${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

module.exports = { PAGES, generateSitemap };
