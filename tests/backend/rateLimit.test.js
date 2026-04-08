/**
 * Rate Limiting 中间件测试
 * 覆盖: 正常请求、超限拒绝、窗口重置、自定义配置
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Rate Limit Middleware', () => {
  let createRateLimit;
  let cleanupStore;

  beforeEach(async () => {
    vi.useFakeTimers();
    // 动态导入获取新的模块实例（含独立的 store）
    const modPath = new URL('../../middleware/rateLimit.js', import.meta.url).href;
    const mod = await import(modPath + '?cacheBust=' + Date.now());
    createRateLimit = mod.createRateLimit;
    cleanupStore = mod.cleanupStore;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeReq(ip) {
    return { ip, connection: ip ? undefined : { remoteAddress: ip } };
  }

  function makeRes() {
    const res = {
      _status: 0,
      _headers: {},
      _body: null,
      status(code) { this._status = code; return this; },
      json(body) { this._body = body; return this; },
      set(key, val) { this._headers[key] = val; return this; },
    };
    return res;
  }

  /** 发送 n 次请求，返回最后一次的 res */
  function sendN(limiter, ip, n) {
    let lastRes;
    for (let i = 0; i < n; i++) {
      const req = makeReq(ip);
      lastRes = makeRes();
      limiter(req, lastRes, () => {});
    }
    return lastRes;
  }

  /** 发送 n 次请求，返回每次是否被放行 */
  function sendNTrack(limiter, ip, n) {
    const results = [];
    for (let i = 0; i < n; i++) {
      const req = makeReq(ip);
      const res = makeRes();
      let nextCalled = false;
      limiter(req, res, () => { nextCalled = true; });
      results.push({ nextCalled, status: res._status });
    }
    return results;
  }

  describe('default configuration', () => {
    it('should allow requests within limit (default 10)', () => {
      const limiter = createRateLimit();
      const results = sendNTrack(limiter, 'rl-default-1', 10);
      for (const r of results) {
        expect(r.nextCalled).toBe(true);
        expect(r.status).toBe(0);
      }
    });

    it('should reject the 11th request with 429', () => {
      const limiter = createRateLimit();
      const results = sendNTrack(limiter, 'rl-default-2', 11);

      // 前10次应该通过
      for (let i = 0; i < 10; i++) {
        expect(results[i].nextCalled).toBe(true);
      }
      // 第11次应被拒绝
      expect(results[10].nextCalled).toBe(false);
      expect(results[10].status).toBe(429);
    });

    it('should set Retry-After header when rate limited', () => {
      const limiter = createRateLimit();
      const res = sendN(limiter, 'rl-default-3', 11);
      expect(res._headers['Retry-After']).toBeDefined();
      expect(Number(res._headers['Retry-After'])).toBeGreaterThan(0);
    });

    it('should return Chinese error message when rate limited', () => {
      const limiter = createRateLimit();
      const res = sendN(limiter, 'rl-default-4', 11);
      expect(res._body.error).toContain('请求过于频繁');
    });
  });

  describe('per-IP isolation', () => {
    it('should track each IP independently', () => {
      const limiter = createRateLimit();

      // IP A sends 10 requests (all allowed)
      const resultsA = sendNTrack(limiter, 'rl-ip-a', 10);
      for (const r of resultsA) {
        expect(r.nextCalled).toBe(true);
      }

      // IP B's first request should still be allowed
      const resultsB = sendNTrack(limiter, 'rl-ip-b', 1);
      expect(resultsB[0].nextCalled).toBe(true);

      // IP A's 11th request should be rejected
      const resultsA11 = sendNTrack(limiter, 'rl-ip-a', 1);
      expect(resultsA11[0].nextCalled).toBe(false);
      expect(resultsA11[0].status).toBe(429);
    });
  });

  describe('window reset', () => {
    it('should reset counter after window expires', () => {
      const limiter = createRateLimit({ maxRequests: 3, windowMs: 5000 });

      // Exhaust limit
      sendN(limiter, 'rl-window-1', 3);

      // 4th should be blocked
      const blocked = sendN(limiter, 'rl-window-1', 1);
      expect(blocked._status).toBe(429);

      // Advance time past window
      vi.advanceTimersByTime(6000);

      // New request should be allowed again
      const results = sendNTrack(limiter, 'rl-window-1', 1);
      expect(results[0].nextCalled).toBe(true);
      expect(results[0].status).toBe(0);
    });
  });

  describe('custom configuration', () => {
    it('should respect custom maxRequests', () => {
      const limiter = createRateLimit({ maxRequests: 2 });
      const results = sendNTrack(limiter, 'rl-custom-1', 3);

      expect(results[0].nextCalled).toBe(true);
      expect(results[1].nextCalled).toBe(true);
      expect(results[2].nextCalled).toBe(false);
      expect(results[2].status).toBe(429);
    });

    it('should use environment variable RATE_LIMIT_MAX', async () => {
      const original = process.env.RATE_LIMIT_MAX;
      process.env.RATE_LIMIT_MAX = '3';
      const modPath = new URL('../../middleware/rateLimit.js', import.meta.url).href;
      const mod = await import(modPath + '?env=' + Date.now());
      const limiter = mod.createRateLimit();

      const results = sendNTrack(limiter, 'rl-env-1', 4);
      for (let i = 0; i < 3; i++) {
        expect(results[i].status).not.toBe(429);
      }
      expect(results[3].status).toBe(429);

      process.env.RATE_LIMIT_MAX = original;
    });
  });

  describe('fallback handling', () => {
    it('should handle missing ip gracefully (use fallback)', () => {
      const limiter = createRateLimit();
      const req = {};
      const res = makeRes();
      let nextCalled = false;
      limiter(req, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
    });
  });

  describe('cleanupStore', () => {
    it('should remove expired records', () => {
      const limiter = createRateLimit({ maxRequests: 1, windowMs: 1000 });

      sendN(limiter, 'rl-cleanup-1', 1);

      vi.advanceTimersByTime(2000);
      cleanupStore();

      const results = sendNTrack(limiter, 'rl-cleanup-1', 1);
      expect(results[0].nextCalled).toBe(true);
    });
  });
});
