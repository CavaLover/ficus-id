/**
 * Sitemap 模块测试
 * 覆盖: generateSitemap, PAGES 数据, XML 格式验证
 */

import { describe, it, expect } from 'vitest';
import { PAGES, generateSitemap } from '../../lib/sitemap.js';

describe('Sitemap Module', () => {
  describe('PAGES data', () => {
    it('should define exactly 7 pages', () => {
      expect(PAGES).toHaveLength(7);
    });

    it('should include all expected routes', () => {
      const urls = PAGES.map(p => p.url);
      expect(urls).toContain('/');
      expect(urls).toContain('/lab.html');
      expect(urls).toContain('/classification.html');
      expect(urls).toContain('/morphology.html');
      expect(urls).toContain('/gallery.html');
      expect(urls).toContain('/distribution.html');
      expect(urls).toContain('/about.html');
    });

    it('each page should have required fields', () => {
      for (const page of PAGES) {
        expect(page).toHaveProperty('url');
        expect(page).toHaveProperty('priority');
        expect(page).toHaveProperty('changefreq');
      }
    });

    it('priority values should be valid (0.0-1.0)', () => {
      for (const page of PAGES) {
        const pri = parseFloat(page.priority);
        expect(pri).toBeGreaterThanOrEqual(0.0);
        expect(pri).toBeLessThanOrEqual(1.0);
      }
    });

    it('index page should have highest priority', () => {
      const indexPage = PAGES.find(p => p.url === '/');
      expect(indexPage.priority).toBe('1.0');
    });

    it('lab page should have second-highest priority', () => {
      const labPage = PAGES.find(p => p.url === '/lab.html');
      expect(labPage.priority).toBe('0.9');
    });

    it('changefreq values should be valid sitemap values', () => {
      const validFreqs = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
      for (const page of PAGES) {
        expect(validFreqs).toContain(page.changefreq);
      }
    });
  });

  describe('generateSitemap output', () => {
    it('should return a non-empty string', () => {
      const xml = generateSitemap();
      expect(typeof xml).toBe('string');
      expect(xml.length).toBeGreaterThan(0);
    });

    it('should be valid XML with proper declaration', () => {
      const xml = generateSitemap();
      expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    });

    it('should have urlset root element with sitemap namespace', () => {
      const xml = generateSitemap();
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml.trim().endsWith('</urlset>')).toBe(true);
    });

    it('should contain URL entry for each PAGES item', () => {
      const xml = generateSitemap();
      for (const page of PAGES) {
        expect(xml).toContain(`<loc>`);
        expect(xml).toContain(`${page.url}</loc>`);
      }
    });

    it('each URL entry should have lastmod, changefreq, priority', () => {
      const xml = generateSitemap();
      for (const page of PAGES) {
        const urlStartIdx = xml.indexOf(`${page.url}</loc>`);
        expect(urlStartIdx).toBeGreaterThan(-1);

        const urlBlockStart = xml.lastIndexOf('<url>', urlStartIdx);
        const urlBlockEnd = xml.indexOf('</url>', urlStartIdx) + '</url>'.length;
        const urlBlock = xml.substring(urlBlockStart, urlBlockEnd);

        expect(urlBlock).toContain('<lastmod>');
        expect(urlBlock).toContain(`<changefreq>${page.changefreq}</changefreq>`);
        expect(urlBlock).toContain(`<priority>${page.priority}</priority>`);
      }
    });

    it('lastmod should be today\'s date (YYYY-MM-DD format)', () => {
      const xml = generateSitemap();
      const today = new Date().toISOString().split('T')[0];
      const count = (xml.match(new RegExp(today, 'g')) || []).length;
      expect(count).toBe(PAGES.length);
    });

    it('all URLs should use https protocol', () => {
      const xml = generateSitemap();
      const locMatches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
      for (const loc of locMatches) {
        expect(loc).toContain('https://');
      }
    });
  });
});
