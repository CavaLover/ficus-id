/**
 * SEO 元数据生成模块
 * 为每个页面生成 meta 标签、OG 标签、JSON-LD 结构化数据
 */

const SITE_NAME = '榕树世界 · 万物之荫';
const SITE_BASE_URL = process.env.SITE_BASE_URL || 'https://ficus.gqy25.top';

const PAGE_META = {
  index: {
    title: '🌿 全球榕属(Ficus)物种智能鉴定 | 榕树世界',
    description: '基于 Berg & Corner (2005) 权威分类体系的 AI 视觉识别，从叶片、隐头果到树皮，识别全球800+种榕树。由 GLM-5V 多模态模型驱动。',
    ogImage: '/img/hero.jpg',
    keywords: 'Ficus,榕树,榕属,物种鉴定,AI识别,Berg Corner分类,植物分类学'
  },
  lab: {
    title: '🧪 榕属物种鉴定实验室 | 🌿 榕树世界',
    description: '上传植物照片，AI（GLM-5V视觉模型）基于Berg & Corner六亚属体系自动识别榕属植物的亚属、组乃至物种级别分类地位。支持叶片、隐头果、树皮等多器官鉴定。',
    ogImage: '/img/syconium.jpg',
    keywords: 'Ficus鉴定,榕种识别,植物AI,叶形态学,隐头果'
  },
  classification: {
    title: '📊 榕属分类体系 | 🌿 榕树世界',
    description: 'Berg & Corner (2005) 六亚属权威分类系统：Pharmacosycea、Urostigma、Ficus、Sycidium、Synoecia、Sycomorus 完整呈现。',
    ogImage: '/img/leaf.jpg',
    keywords: 'Berg Corner,Ficus分类,六亚属,植物分类学'
  },
  morphology: {
    title: '🔬 形态学鉴定指南 | 🌿 榕树世界',
    description: '榕属六大鉴定器官图鉴：隐头果、叶片、叶脉、托叶、树皮与乳汁、生长习性 — 可视化形态特征参考。',
    ogImage: '/img/leaf.jpg',
    keywords: '植物形态学,叶形,隐头果,托叶,叶脉'
  },
  gallery: {
    title: '🖼️ 榕属物种图鉴 | 🌿 榕树世界',
    description: '按亚属筛选的全球代表物种图像库，涵盖6个亚属的主要榕树种类。',
    ogImage: '/img/gallery1.jpg',
    keywords: 'Ficus物种,榕树图鉴,植物图片'
  },
  distribution: {
    title: '🗺️ 全球榕属分布 | 🌿 榕树世界',
    description: '各亚属地理分布区域、物种丰富度热点：新几内亚150+种、婆罗洲100+种、亚马逊120+种。',
    ogImage: '/img/bark.jpg',
    keywords: 'Ficus分布,热带植物,生物多样性热点'
  },
  about: {
    title: '📖 关于榕树 | 🌿 榕树世界',
    description: '榕-蜂专性互惠共生、关键种生态角色、Berg & Corner分类方法论、项目技术栈与参考文献。',
    ogImage: '/img/bark.jpg',
    keywords: '榕蜂共生,关键种,植物生态学,Fig wasp'
  }
};

function generateJsonLd(pageSlug) {
  const meta = PAGE_META[pageSlug] || PAGE_META.index;
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: meta.title,
    description: meta.description,
    url: `${SITE_BASE_URL}/${pageSlug === 'index' ? '' : pageSlug + '.html'}`,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_BASE_URL },
    inLanguage: 'zh-CN',
    about: {
      '@type': 'Thing',
      name: 'Ficus (榕属)',
      alternateName: 'Fig trees',
      description: '桑科(Moraceae)榕属，全球约800+种木本植物'
    }
  });
}

function generateMetaTags(pageSlug) {
  const meta = PAGE_META[pageSlug] || PAGE_META.index;
  return `
    <meta name="description" content="${meta.description}">
    <meta name="keywords" content="${meta.keywords}">
    <meta property="og:title" content="${meta.title}">
    <meta property="og:description" content="${meta.description}">
    <meta property="og:image" content="${SITE_BASE_URL}${meta.ogImage}">
    <meta property="og:url" content="${SITE_BASE_URL}/">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${SITE_NAME}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${meta.title}">
    <meta name="twitter:description" content="${meta.description}">
    <meta name="twitter:image" content="${SITE_BASE_URL}${meta.ogImage}">
    <script type="application/ld+json">${generateJsonLd(pageSlug)}</script>
  `;
}

module.exports = { PAGE_META, SITE_NAME, SITE_BASE_URL, generateMetaTags, generateJsonLd };
