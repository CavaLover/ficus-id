/**
 * 无障碍(a11y)辅助模块测试
 * 覆盖: generateSkipLink, generateA11yWrapper, getSkipLinkCSS
 */

import { describe, it, expect } from 'vitest';
import { generateSkipLink, generateA11yWrapper, getSkipLinkCSS } from '../../lib/a11y.js';

describe('A11y Module', () => {
  describe('generateSkipLink', () => {
    it('should return an anchor element', () => {
      const link = generateSkipLink();
      expect(link).toContain('<a');
      expect(link).toContain('</a>');
    });

    it('should link to #main-content by default', () => {
      const link = generateSkipLink();
      expect(link).toContain('href="#main-content"');
    });

    it('should use custom target ID when provided', () => {
      const link = generateSkipLink('custom-target');
      expect(link).toContain('href="#custom-target"');
    });

    it('should have skip-link CSS class', () => {
      const link = generateSkipLink();
      expect(link).toContain('class="skip-link"');
    });

    it('should contain accessible text in Chinese', () => {
      const link = generateSkipLink();
      expect(link).toContain('跳转到主要内容');
    });

    it('should produce valid HTML snippet', () => {
      const link = generateSkipLink();
      expect(link).toMatch(/^<a[^>]*>.*<\/a>$/);
    });
  });

  describe('generateA11yWrapper', () => {
    it('should wrap content in <main> element', () => {
      const wrapped = generateA11yWrapper('<p>Hello</p>');
      expect(wrapped).toContain('<main');
      expect(wrapped).toContain('</main>');
      expect(wrapped).toContain('<p>Hello</p>');
    });

    it('should set id="main-content"', () => {
      const wrapped = generateA11yWrapper('content');
      expect(wrapped).toContain('id="main-content"');
    });

    it('should set role="main"', () => {
      const wrapped = generateA11yWrapper('content');
      expect(wrapped).toContain('role="main"');
    });

    it('should preserve the original content', () => {
      const content = '<div class="test"><span>Nested</span></div>';
      const wrapped = generateA11yWrapper(content);
      expect(wrapped).toContain(content);
    });

    it('should handle empty content gracefully', () => {
      const wrapped = generateA11yWrapper('');
      expect(wrapped).toContain('<main');
      expect(wrapped).toContain('</main>');
    });

    it('should handle multi-line content', () => {
      const content = '<section>\n  <h1>Title</h1>\n  <p>Body</p>\n</section>';
      const wrapped = generateA11yWrapper(content);
      expect(wrapped).toContain('<h1>Title</h1>');
      expect(wrapped).toContain('<p>Body</p>');
    });
  });

  describe('getSkipLinkCSS', () => {
    it('should return a non-empty CSS string', () => {
      const css = getSkipLinkCSS();
      expect(typeof css).toBe('string');
      expect(css.length).toBeGreaterThan(0);
    });

    it('should define .skip-link selector', () => {
      const css = getSkipLinkCSS();
      expect(css).toContain('.skip-link');
    });

    it('should hide link off-screen by default (top: -100%)', () => {
      const css = getSkipLinkCSS();
      expect(css).toContain('top: -100%');
    });

    it('should show link on focus (top: 0)', () => {
      const css = getSkipLinkCSS();
      expect(css).toContain('.skip-link:focus');
      expect(css).toContain('top: 0');
    });

    it('should have high z-index for accessibility', () => {
      const css = getSkipLinkCSS();
      expect(css).toContain('z-index: 9999');
    });

    it('should include background color and padding', () => {
      const css = getSkipLinkCSS();
      expect(css).toContain('background:');
      expect(css).toContain('color:');
      expect(css).toContain('padding:');
    });

    it('should include border-radius for visual polish', () => {
      const css = getSkipLinkCSS();
      expect(css).toContain('border-radius');
    });
  });

  describe('integration: skip link and wrapper consistency', () => {
    it('skip link target should match wrapper id', () => {
      const link = generateSkipLink();
      const wrapper = generateA11yWrapper('');

      const linkTarget = link.match(/href="([^"]+)"/)[1];
      const wrapperId = wrapper.match(/id="([^"]+)"/)[1];

      expect(linkTarget).toBe('#' + wrapperId);
    });
  });
});
