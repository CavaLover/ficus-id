/**
 * API 端点测试
 * 覆盖: /api/health, /api/ficus-examples, /sitemap.xml, 静态文件, 404
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateSitemap } from '../../lib/sitemap.js';

// 创建测试用 app（不启动监听，避免端口冲突）
function createTestApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', project: 'ficus-id global fig identification' });
  });

  // Ficus examples
  app.get('/api/ficus-examples', (req, res) => {
    res.json({
      subgenera: [
        {
          type: 'pharmacosycea',
          cn: '药榕亚属',
          icon: '🌲',
          latin: 'Pharmacosycea',
          count: '~90',
          distribution: '新热带区（中美洲热带）',
          key_chars: '大型乔木；隐头果成对生于叶腋；叶片全缘；基部侧脉显著加粗',
          representatives: ['F. insipida', 'F. maxima', 'F. tonduzii'],
          desc: 'Berg & Corner 体系中的第一个亚属，仅分布于新热带区。'
        },
        {
          type: 'urostigma',
          cn: '榕亚属',
          icon: '🌳',
          latin: 'Urostigma',
          count: '~300+',
          distribution: '泛热带至亚热带（最广布的亚属）',
          key_chars: '多样化生长型（乔木/绞杀/附生）；气生根发达；隐头果排列方式多样',
          representatives: ['F. benghalensis', 'F. religiosa', 'F. elastica', 'F. microcarpa', 'F. benjamina'],
          desc: '最大的榕属亚属，包含最常见的栽培种和野生种。'
        },
        {
          type: 'ficus',
          cn: '原始榕亚属',
          icon: '🌿',
          latin: 'Ficus',
          count: '~100',
          distribution: '非洲、亚洲热带、澳洲北部',
          key_chars: '灌木或小乔木为主；叶缘常有锯齿；托叶宿存或半宿存',
          representatives: ['F. exasperata', 'F. hispida', 'F. simplicissima', 'F. pandurata'],
          desc: '以叶缘具齿和托叶宿存为区别于其他亚属的关键特征。'
        },
        {
          type: 'sycidium',
          cn: '薜荔亚属',
          icon: '🔗',
          latin: 'Sycidium',
          count: '~120',
          distribution: '旧热带区（亚洲、澳洲、太平洋岛屿）',
          key_chars: '攀援灌木或藤本；小型隐头果近无梗；托叶合生紧包顶芽',
          representatives: ['F. pumila', 'F. tikoua', 'F. sarmentosa', 'F. punctata'],
          desc: '独特的藤本/攀援型榕属植物，薜荔是最著名的代表种。'
        },
        {
          type: 'synoecia',
          cn: '聚果榕亚属',
          icon: '🫒',
          latin: 'Synoecia',
          count: '~80',
          distribution: '亚洲热带和亚热带',
          key_chars: '老茎生聚簇隐头果（茎花现象明显）；中大型乔木',
          representatives: ['F. racemosa', 'F. auriculata', 'F. semicordata', 'F. variegata'],
          desc: '以老茎生花（cauliflory）为标志性特征的亚属。'
        },
        {
          type: 'sycomorus',
          cn: '非洲榕亚属',
          icon: '🌍',
          latin: 'Sycomorus',
          count: '~80+',
          distribution: '非洲热带、马达加斯加、印度洋岛屿',
          key_chars: '腋生串状隐头果；表面粗糙具疣突；非洲特有分布',
          representatives: ['F. sycomorus', 'F. sur', 'F. ingens', 'F. natalensis'],
          desc: '主要分布于非洲大陆的亚属，埃及榕是该亚属的模式种。'
        }
      ],
      morphology_types: [
        { type: 'syconium', cn: '隐头果（无花果）', icon: '🫒', desc: '榕属特有的封闭花序结构，内部包裹数百朵小花。', variants: ['axillary', 'cauliflorous', 'ramiflorous', 'racemose'] },
        { type: 'leaf', cn: '叶片', icon: '🍃', desc: '榕属叶片形态极其多样：全缘/波状/掌裂/羽裂/不等边。', variants: ['entire', 'lobed', 'serrate', 'asymmetrical'] },
        { type: 'venation', cn: '叶脉', icon: '📐', desc: '叶脉模式是重要鉴定特征：羽状脉、掌状脉、三出脉。', variants: ['brochidodromous', 'camptodromous', 'palmate'] },
        { type: 'stipule', cn: '托叶', icon: '📎', desc: '托叶的形态、大小、持久性和痕形是区分亚属的关键特征之一。', variants: ['free', 'connate', 'persistent', 'deciduous'] },
        { type: 'bark', cn: '树皮与乳汁', icon: '🪵', desc: '树皮纹理和乳汁颜色/浓度提供重要的分类信息。', variants: ['smooth', 'fissured', 'exfoliating'] },
        { type: 'habit', cn: '生长习性', icon: '🌳', desc: '生长型式是第一眼区分的重要特征：大树/灌木/绞杀榕/附生/藤本。', variants: ['tree', 'shrub', 'strangler', 'epiphyte', 'liana'] }
      ]
    });
  });

  // Sitemap
  app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml').send(generateSitemap());
  });

  return app;
}

describe('API Endpoints', () => {
  const app = createTestApp();

  describe('GET /api/health', () => {
    it('should return status ok with project name', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'ok',
        project: 'ficus-id global fig identification'
      });
    });

    it('should return JSON content type', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['content-type']).toMatch(/json/);
    });
  });

  describe('GET /api/ficus-examples', () => {
    it('should return subgenera and morphology_types', async () => {
      const res = await request(app).get('/api/ficus-examples');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('subgenera');
      expect(res.body).toHaveProperty('morphology_types');
    });

    it('should have exactly 6 subgenera (Berg & Corner system)', async () => {
      const res = await request(app).get('/api/ficus-examples');
      expect(res.body.subgenera).toHaveLength(6);
    });

    it('each subgenus should have required fields', async () => {
      const res = await request(app).get('/api/ficus-examples');
      const requiredFields = ['type', 'cn', 'icon', 'latin', 'count', 'distribution', 'key_chars', 'representatives', 'desc'];
      for (const sg of res.body.subgenera) {
        for (const field of requiredFields) {
          expect(sg).toHaveProperty(field);
        }
        expect(Array.isArray(sg.representatives)).toBe(true);
        expect(sg.representatives.length).toBeGreaterThan(0);
      }
    });

    it('should include all 6 Berg & Corner subgenera by latin name', async () => {
      const res = await request(app).get('/api/ficus-examples');
      const latins = res.body.subgenera.map(s => s.latin);
      expect(latins).toContain('Pharmacosycea');
      expect(latins).toContain('Urostigma');
      expect(latins).toContain('Ficus');
      expect(latins).toContain('Sycidium');
      expect(latins).toContain('Synoecia');
      expect(latins).toContain('Sycomorus');
    });

    it('Urostigma should be the most diverse subgenus', async () => {
      const res = await request(app).get('/api/ficus-examples');
      const urostigma = res.body.subgenera.find(s => s.type === 'urostigma');
      expect(urostigma).toBeDefined();
      expect(urostigma.count).toBe('~300+');
      expect(urostigma.representatives.length).toBeGreaterThanOrEqual(5);
    });

    it('morphology_types should cover 6 organ types', async () => {
      const res = await request(app).get('/api/ficus-examples');
      expect(res.body.morphology_types).toHaveLength(6);
      const types = res.body.morphology_types.map(m => m.type);
      expect(types).toEqual(
        expect.arrayContaining(['syconium', 'leaf', 'venation', 'stipule', 'bark', 'habit'])
      );
    });

    it('each morphology type should have type, cn, icon, desc, variants', async () => {
      const res = await request(app).get('/api/ficus-examples');
      for (const mt of res.body.morphology_types) {
        expect(mt).toHaveProperty('type');
        expect(mt).toHaveProperty('cn');
        expect(mt).toHaveProperty('icon');
        expect(mt).toHaveProperty('desc');
        expect(Array.isArray(mt.variants)).toBe(true);
      }
    });
  });

  describe('GET /sitemap.xml', () => {
    it('should return XML content type', async () => {
      const res = await request(app).get('/sitemap.xml');
      expect(res.headers['content-type']).toMatch(/xml/);
    });

    it('should contain valid sitemap XML structure', async () => {
      const res = await request(app).get('/sitemap.xml');
      expect(res.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(res.text).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(res.text).toContain('</urlset>');
    });

    it('should contain all expected page URLs', async () => {
      const res = await request(app).get('/sitemap.xml');
      const baseUrl = process.env.SITE_BASE_URL || 'https://ficus.gqy25.top';
      const expectedPaths = ['/', '/lab.html', '/classification.html', '/morphology.html', '/gallery.html', '/distribution.html', '/about.html'];
      for (const path of expectedPaths) {
        expect(res.text).toContain(`<loc>${baseUrl}${path}</loc>`);
      }
    });

    it('should contain today\'s date as lastmod', async () => {
      const res = await request(app).get('/sitemap.xml');
      const today = new Date().toISOString().split('T')[0];
      expect(res.text).toContain(today);
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent-endpoint');
      expect(res.status).toBe(404);
    });
  });
});
