/**
 * Navigation 配置模块测试
 * 覆盖: NAV_ITEMS, MORE_ITEMS 数据完整性与一致性
 */

import { describe, it, expect } from 'vitest';
import { NAV_ITEMS, MORE_ITEMS } from '../../lib/navigation.js';
import { PAGES } from '../../lib/sitemap.js';

describe('Navigation Module', () => {
  describe('NAV_ITEMS', () => {
    it('should export NAV_ITEMS array', () => {
      expect(Array.isArray(NAV_ITEMS)).toBe(true);
    });

    it('should have exactly 7 navigation items', () => {
      expect(NAV_ITEMS).toHaveLength(7);
    });

    it('each nav item should have href and text properties', () => {
      for (const item of NAV_ITEMS) {
        expect(item).toHaveProperty('href');
        expect(item).toHaveProperty('text');
        expect(typeof item.href).toBe('string');
        expect(typeof item.text).toBe('string');
        expect(item.href.length).toBeGreaterThan(0);
        expect(item.text.length).toBeGreaterThan(0);
      }
    });

    it('first item should be home page', () => {
      expect(NAV_ITEMS[0]).toEqual({ href: '/', text: '首页' });
    });

    it('all href values should start with /', () => {
      for (const item of NAV_ITEMS) {
        expect(item.href.startsWith('/')).toBe(true);
      }
    });

    it('nav texts should all be in Chinese', () => {
      for (const item of NAV_ITEMS) {
        expect(/[\u4e00-\u9fff]/.test(item.text)).toBe(true);
      }
    });

    it('should cover all main site sections', () => {
      const hrefs = NAV_ITEMS.map(i => i.href);
      expect(hrefs).toContain('/');
      expect(hrefs).toContain('/classification.html');
      expect(hrefs).toContain('/lab.html');
      expect(hrefs).toContain('/morphology.html');
      expect(hrefs).toContain('/gallery.html');
      expect(hrefs).toContain('/distribution.html');
      expect(hrefs).toContain('/about.html');
    });
  });

  describe('MORE_ITEMS', () => {
    it('should export MORE_ITEMS array', () => {
      expect(Array.isArray(MORE_ITEMS)).toBe(true);
    });

    it('should have at least 2 more items', () => {
      expect(MORE_ITEMS.length).toBeGreaterThanOrEqual(2);
    });

    it('each more item should have href and text', () => {
      for (const item of MORE_ITEMS) {
        expect(item).toHaveProperty('href');
        expect(item).toHaveProperty('text');
        expect(typeof item.href).toBe('string');
        expect(typeof item.text).toBe('string');
      }
    });

    it('more item hrefs should reference existing pages', () => {
      const moreHrefs = MORE_ITEMS.map(i => i.href);
      const navHrefs = NAV_ITEMS.map(i => i.href);
      for (const href of moreHrefs) {
        expect(navHrefs).toContain(href);
      }
    });
  });

  describe('consistency between NAV_ITEMS and sitemap pages', () => {
    it('navigation should align with sitemap pages', () => {
      const navHrefs = NAV_ITEMS.map(i => i.href);
      const sitemapUrls = PAGES.map(p => p.url);

      for (const href of navHrefs) {
        expect(sitemapUrls).toContain(href);
      }
    });
  });
});
