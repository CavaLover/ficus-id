/**
 * 图片发送链路验证测试
 * 覆盖: Data URL 解析、base64 校验、体积限制、JSON 精确提取
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

// 复用 server 中的验证逻辑（提取为纯函数以便独立测试）
function parseDataUrl(imageData) {
  const dataUrlMatch = imageData.match(/^data:(image\/\w+);base64,(.+)$/s);
  if (!dataUrlMatch) return null;
  return { mediaType: dataUrlMatch[1], rawBase64: dataUrlMatch[2] };
}

function cleanBase64(raw) {
  return raw.replace(/\s/g, '');
}

function validateBase64(str) {
  return /^[A-Za-z0-9+/]+=*$/.test(str);
}

function estimateDecodedBytes(base64Len) {
  return Math.floor(base64Len * 0.75);
}

// 括号计数法 JSON 提取（与 server.js 同步）
function extractJson(text) {
  const startIdx = text.indexOf('{');
  if (startIdx === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.substring(startIdx, i + 1);
    }
  }
  return null;
}

// 生成指定长度的合法 base64 字符串
function makeBase64(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  // 补齐 padding
  while (result.length % 4 !== 0) result += '=';
  return result;
}

describe('Image Validation Pipeline', () => {

  describe('Data URL parsing', () => {
    it('should extract mediaType and base64 from valid JPEG Data URL', () => {
      const b64 = makeBase64(100);
      const url = `data:image/jpeg;base64,${b64}`;
      const parsed = parseDataUrl(url);

      expect(parsed).not.toBeNull();
      expect(parsed.mediaType).toBe('image/jpeg');
      expect(parsed.rawBase64).toBe(b64);
    });

    it('should extract mediaType for PNG', () => {
      const b64 = makeBase64(50);
      const url = `data:image/png;base64,${b64}`;
      const parsed = parseDataUrl(url);

      expect(parsed.mediaType).toBe('image/png');
    });

    it('should extract mediaType for WebP', () => {
      const b64 = makeBase64(50);
      const url = `data:image/webp;base64,${b64}`;
      const parsed = parseDataUrl(url);

      expect(parsed.mediaType).toBe('image/webp');
    });

    it('should return null for non-Data-URL string', () => {
      expect(parseDataUrl('not a data url')).toBeNull();
      expect(parseDataUrl('')).toBeNull();
      expect(parseDataUrl('data:text/plain;base64,aGVsbG8=')).toBeNull(); // 非 image/*
    });

    it('should handle base64 with newlines (PEM-style)', () => {
      const b64 = makeBase64(200);
      // 每76字符插入换行
      const withNewlines = b64.match(/.{1,76}/g)?.join('\n') || b64;
      const url = `data:image/jpeg;base64,${withNewlines}`;
      const parsed = parseDataUrl(url);

      expect(parsed).not.toBeNull();
      // rawBase64 应包含换行符
      expect(parsed.rawBase64).toContain('\n');
    });
  });

  describe('Base64 cleanup', () => {
    it('should remove all whitespace characters', () => {
      const input = 'ABCD \t\n\rEFGH';
      expect(cleanBase64(input)).toBe('ABCDEFGH');
    });

    it('should handle already-clean base64 unchanged', () => {
      const clean = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      expect(cleanBase64(clean)).toBe(clean);
    });
  });

  describe('Base64 validity check', () => {
    it('should accept valid base64 string', () => {
      expect(validateBase64(makeBase64(100))).toBe(true);
    });

    it('should accept base64 with padding', () => {
      expect(validateBase64('ABCD==')).toBe(true);
      expect(validateBase64('ABC=')).toBe(true);
    });

    it('should reject strings with spaces', () => {
      expect(validateBase64('AB CD')).toBe(false);
    });

    it('should reject strings with special characters', () => {
      expect(validateBase64('AB!CD')).toBe(false);
      expect(validateBase64('AB@CD')).toBe(false);
      expect(validateBase64('AB#CD')).toBe(false);
    });

    it('empty string should be rejected by regex (requires at least one char)', () => {
      expect(validateBase64('')).toBe(false);
    });

    it('should reject unicode characters', () => {
      expect(validateBase64('AB中文CD')).toBe(false);
    });
  });

  describe('Size estimation', () => {
    it('should estimate ~75% of base64 length as bytes', () => {
      // 1000 chars base64 ≈ 750 bytes
      expect(estimateDecodedBytes(1000)).toBe(750);
      expect(estimateDecodedBytes(4000)).toBe(3000);
    });

    it('should handle small values', () => {
      expect(estimateDecodedBytes(4)).toBe(3);   // 最小有效 base64
      expect(estimateDecodedBytes(8)).toBe(6);
    });
  });

  describe('Size bounds enforcement', () => {
    const MIN_BYTES = 1024;       // 1KB 最小
    const MAX_BYTES = 10 * 1024 * 1024; // 10MB 最大

    function checkSize(base64Len) {
      const bytes = estimateDecodedBytes(base64Len);
      if (bytes < MIN_BYTES) return 'TOO_SMALL';
      if (bytes > MAX_BYTES) return 'TOO_LARGE';
      return 'OK';
    }

    it('should reject data smaller than 1KB', () => {
      // < 1365 base64 chars → < 1024 bytes
      expect(checkSize(100)).toBe('TOO_SMALL');
      expect(checkSize(1364)).toBe('TOO_SMALL');
    });

    it('should accept data within valid range', () => {
      // 1366+ base64 chars → 1024+ bytes
      expect(checkSize(1366)).toBe('OK');
      expect(checkSize(10000)).toBe('OK');     // ~7.5KB
      expect(checkValueInRange(100000, MIN_BYTES, MAX_BYTES)).toBe('OK'); // ~75KB
    });

    it('should reject data larger than 10MB', () => {
      // > 13,653,334 base64 chars → > 10MB
      expect(checkSize(14_000_000)).toBe('TOO_LARGE');
    });

    function checkValueInRange(val, min, max) {
      const bytes = Math.floor(val * 0.75);
      return bytes >= min && bytes <= max ? 'OK' : bytes < min ? 'TOO_SMALL' : 'TOO_LARGE';
    }
  });
});

describe('extractJson - brace-counting parser', () => {
  it('should extract plain JSON object', () => {
    const text = '{"key":"value"}';
    const result = extractJson(text);
    expect(result).toBe('{"key":"value"}');
    expect(JSON.parse(result)).toEqual({ key: 'value' });
  });

  it('should extract nested JSON object', () => {
    const json = '{"a":{"b":{"c":1}},"d":[1,2,3]}';
    const text = `Here is the result:\n${json}\nDone.`;
    const result = extractJson(text);
    expect(JSON.parse(result)).toEqual({ a: { b: { c: 1 } }, d: [1, 2, 3] });
  });

  it('should handle escaped quotes inside strings', () => {
    const json = '{"desc":"He said \\"hello\\""}';
    const result = extractJson(json);
    expect(JSON.parse(result)).toEqual({ desc: 'He said "hello"' });
  });

  it('should handle escaped backslash sequences', () => {
    const json = '{"path":"C:\\\\Users\\\\test"}';
    const result = extractJson(json);
    expect(JSON.parse(result)).toEqual({ path: 'C:\\Users\\test' });
  });

  it('should stop at first matching closing brace (not greedy)', () => {
    const inner = '{"name":"result"}';
    const outer = '{"identification":' + inner + '}';
    const text = outer + ' some trailing text {"other":"ignored"}';
    const result = extractJson(text);
    // Should capture the full outer object, not go beyond it
    expect(JSON.parse(result)).toHaveProperty('identification');
    expect(JSON.parse(result).identification).toEqual({ name: 'result' });
  });

  it('should return null when no JSON present', () => {
    expect(extractJson('no json here at all')).toBeNull();
    expect(extractJson('')).toBeNull();
  });

  it('should handle the actual ficus identification response shape', () => {
    const json = JSON.stringify({
      identification: { genus: 'Ficus', subgenus: 'Urostigma', species: 'Ficus benjamina', confidence: 85 },
      observed_characters: { plant_part: 'leaf' },
      key_diagnostic_features: ['feature1', 'feature2']
    });
    const text = `Based on analysis:\n${json}\n\nConclusion above.`;
    const result = extractJson(text);
    const parsed = JSON.parse(result);
    expect(parsed.identification.genus).toBe('Ficus');
    expect(parsed.identification.confidence).toBe(85);
    expect(parsed.key_diagnostic_features).toHaveLength(2);
  });

  it('should handle arrays inside JSON', () => {
    const json = '{"items":[{"a":1},{"b":2}],"count":2}';
    const result = extractJson(json);
    expect(JSON.parse(result).items).toHaveLength(2);
  });

  it('should handle Unicode content in JSON values', () => {
    const json = '{"cn_name":"榕属","latin":"Ficus","desc":"隐头果成对生于叶腋"}';
    const result = extractJson(json);
    const parsed = JSON.parse(result);
    expect(parsed.cn_name).toBe('榕属');
    expect(parsed.desc).toContain('隐头果');
  });
});

describe('API endpoint integration: image validation', () => {
  function createApp() {
    const app = express();
    app.use(express.json({ limit: '10mb' }));

    app.post('/api/identify-ficus', (req, res) => {
      const { imageData } = req.body;

      if (!imageData) {
        return res.status(400).json({ error: '缺少图片数据' });
      }

      const dataUrlMatch = imageData.match(/^data:(image\/\w+);base64,(.+)$/s);
      if (!dataUrlMatch) {
        return res.status(400).json({ error: '图片数据格式无效，需要 base64 Data URL' });
      }

      let base64Data = dataUrlMatch[2].replace(/\s/g, '');

      if (!/^[A-Za-z0-9+/]+=*$/.test(base64Data)) {
        return res.status(400).json({ error: '图片数据格式错误' });
      }

      const decodedBytes = Math.floor(base64Data.length * 0.75);
      if (decodedBytes < 1024) {
        return res.status(400).json({ error: '图片数据过小或损坏' });
      }
      if (decodedBytes > 10 * 1024 * 1024) {
        return res.status(413).json({ error: '图片过大，请压缩后重试' });
      }

      res.json({ success: true, validated: true, mediaType: dataUrlMatch[1], estimatedSize: decodedBytes });
    });

    return app;
  }

  const app = createApp();

  it('should reject missing imageData', async () => {
    const res = await request(app).post('/api/identify-ficus').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('缺少图片数据');
  });

  it('should reject non-Data-URL format', async () => {
    const res = await request(app)
      .post('/api/identify-ficus')
      .send({ imageData: 'not-a-data-url' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('格式无效');
  });

  it('should reject too-small image data (< 1KB decoded)', async () => {
    const tinyB64 = makeBase64(100); // ~75 bytes
    const res = await request(app)
      .post('/api/identify-ficus')
      .send({ imageData: `data:image/jpeg;base64,${tinyB64}` });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('过小');
  });

  it('should accept valid image data within size limits', async () => {
    const validB64 = makeBase64(2000); // ~1500 bytes > 1KB
    const res = await request(app)
      .post('/api/identify-ficus')
      .send({ imageData: `data:image/jpeg;base64,${validB64}` });
    expect(res.status).toBe(200);
    expect(res.body.validated).toBe(true);
    expect(res.body.mediaType).toBe('image/jpeg');
    expect(res.body.estimatedSize).toBeGreaterThan(1024);
  });

  it('should accept PNG Data URL and report correct media type', async () => {
    const validB64 = makeBase64(2000);
    const res = await request(app)
      .post('/api/identify-ficus')
      .send({ imageData: `data:image/png;base64,${validB64}` });
    expect(res.status).toBe(200);
    expect(res.body.mediaType).toBe('image/png');
  });

  it('should clean whitespace in base64 before validation', async () => {
    const validB64 = makeBase64(2000);
    // 注入换行和空格模拟 PEM 风格
    const dirtyB64 = validB64.match(/.{1,40}/g).join('\n  ');
    const res = await request(app)
      .post('/api/identify-ficus')
      .send({ imageData: `data:image/webp;base64,${dirtyB64}` });
    expect(res.status).toBe(200);
    expect(res.body.mediaType).toBe('image/webp');
  });

  it('should reject invalid base64 characters', async () => {
    const res = await request(app)
      .post('/api/identify-ficus')
      .send({ imageData: 'data:image/jpeg;base64,!!!invalid!!!' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('格式错误');
  });
});
