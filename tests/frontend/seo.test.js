/**
 * SEO 模块测试
 * 覆盖: generateMetaTags, generateJsonLd, PAGE_META 数据完整性
 */

import { describe, it, expect } from 'vitest';
import { PAGE_META, SITE_NAME, generateMetaTags, generateJsonLd } from '../../lib/seo.js';

describe('SEO Module', () => {
  describe('PAGE_META data integrity', () => {
    const expectedPages = ['index', 'lab', 'classification', 'morphology', 'gallery', 'distribution', 'about'];

    it('should have entries for all 7 pages', () => {
      expect(Object.keys(PAGE_META)).toEqual(expect.arrayContaining(expectedPages));
      expect(Object.keys(PAGE_META).length).toBe(7);
    });

    it.each(expectedPages)('page "%s" should have all required fields', (slug) => {
      const meta = PAGE_META[slug];
      expect(meta).toHaveProperty('title');
      expect(meta).toHaveProperty('description');
      expect(meta).toHaveProperty('ogImage');
      expect(meta).toHaveProperty('keywords');
      expect(meta.title.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThanOrEqual(30);
      expect(meta.keywords.length).toBeGreaterThan(0);
    });

    it('each page title should contain emoji or Chinese characters', () => {
      for (const slug of Object.keys(PAGE_META)) {
        const hasCnOrEmoji = /[\u4e00-\u9fff🌿🧪📊🔬🖼️🗺️📖]/.test(PAGE_META[slug].title);
        expect(hasCnOrEmoji).toBe(true);
      }
    });
  });

  describe('generateMetaTags', () => {
    it('should return a string containing meta tags', () => {
      const tags = generateMetaTags('index');
      expect(typeof tags).toBe('string');
      expect(tags.length).toBeGreaterThan(0);
    });

    it('should include description meta tag', () => {
      const tags = generateMetaTags('index');
      expect(tags).toContain('<meta name="description" content="');
      expect(tags).toContain(PAGE_META.index.description);
    });

    it('should include keywords meta tag', () => {
      const tags = generateMetaTags('lab');
      expect(tags).toContain('<meta name="keywords" content="');
      expect(tags).toContain(PAGE_META.lab.keywords);
    });

    it('should include Open Graph tags', () => {
      const tags = generateMetaTags('classification');
      expect(tags).toContain('<meta property="og:title" content="');
      expect(tags).toContain('<meta property="og:description" content="');
      expect(tags).toContain('<meta property="og:image" content="');
      expect(tags).toContain('<meta property="og:type" content="website">');
      expect(tags).toContain('<meta property="og:site_name" content="');
    });

    it('should include Twitter Card tags', () => {
      const tags = generateMetaTags('gallery');
      expect(tags).toContain('<meta name="twitter:card" content="summary_large_image">');
      expect(tags).toContain('<meta name="twitter:title" content="');
      expect(tags).toContain('<meta name="twitter:description" content="');
      expect(tags).toContain('<meta name="twitter:image" content="');
    });

    it('should include JSON-LD script tag', () => {
      const tags = generateMetaTags('about');
      expect(tags).toContain('<script type="application/ld+json">');
      expect(tags).toContain('</script>');
    });

    it('should fall back to index meta for unknown slug', () => {
      const tags = generateMetaTags('nonexistent-page');
      expect(tags).toContain(PAGE_META.index.title);
    });
  });

  describe('generateJsonLd', () => {
    it('should return valid JSON string', () => {
      const jsonLd = generateJsonLd('index');
      const parsed = JSON.parse(jsonLd);
      expect(parsed).toBeDefined();
    });

    it('should have correct schema.org structure', () => {
      const parsed = JSON.parse(generateJsonLd('lab'));
      expect(parsed['@context']).toBe('https://schema.org');
      expect(parsed['@type']).toBe('WebPage');
      expect(parsed.name).toBe(PAGE_META.lab.title);
      expect(parsed.description).toBe(PAGE_META.lab.description);
    });

    it('should include isPartOf with WebSite info', () => {
      const parsed = JSON.parse(generateJsonLd('morphology'));
      expect(parsed.isPartOf).toEqual({
        '@type': 'WebSite',
        name: SITE_NAME,
        url: expect.stringContaining('https://'),
      });
    });

    it('should set inLanguage to zh-CN', () => {
      const parsed = JSON.parse(generateJsonLd('distribution'));
      expect(parsed.inLanguage).toBe('zh-CN');
    });

    it('should include about section for Ficus', () => {
      const parsed = JSON.parse(generateJsonLd('about'));
      expect(parsed.about).toEqual({
        '@type': 'Thing',
        name: 'Ficus (榕属)',
        alternateName: 'Fig trees',
        description: '桑科(Moraceae)榕属，全球约800+种木本植物',
      });
    });

    it('should generate correct URL based on slug', () => {
      const indexParsed = JSON.parse(generateJsonLd('index'));
      expect(indexParsed.url).toMatch(/\/$/);

      const labParsed = JSON.parse(generateJsonLd('lab'));
      expect(labParsed.url).toContain('/lab.html');
    });

    it.each(['index', 'lab', 'classification', 'morphology', 'gallery', 'distribution', 'about'])(
      'generateJsonLd for "%s" should be valid JSON-LD',
      (slug) => {
        const jsonLd = generateJsonLd(slug);
        const parsed = JSON.parse(jsonLd);
        expect(parsed.name).toBe(PAGE_META[slug].title);
        expect(parsed.url).toContain(slug === 'index' ? '' : slug + '.html');
      },
    );
  });

  describe('constants', () => {
    it('SITE_NAME should be defined', () => {
      expect(SITE_NAME).toBe('榕树世界 · 万物之荫');
    });
  });
});
