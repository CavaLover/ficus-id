/**
 * Logger 模块测试
 * 覆盖: createLogger, generateReqId, 日志输出, JSON模式, 上下文, timer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, generateReqId } from '../../lib/logger.js';

describe('Logger Module', () => {
  describe('generateReqId', () => {
    it('should return a string of length 6', () => {
      const id = generateReqId();
      expect(typeof id).toBe('string');
      expect(id.length).toBe(6);
    });

    it('should return different IDs on consecutive calls', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateReqId());
      }
      expect(ids.size).toBeGreaterThan(99);
    });

    it('should only contain alphanumeric characters', () => {
      for (let i = 0; i < 50; i++) {
        const id = generateReqId();
        expect(id).toMatch(/^[a-z0-9]+$/);
      }
    });
  });

  describe('createLogger - basic logging', () => {
    it('should create a logger with debug/info/warn/error methods', () => {
      const log = createLogger('test-module');
      expect(typeof log.debug).toBe('function');
      expect(typeof log.info).toBe('function');
      expect(typeof log.warn).toBe('function');
      expect(typeof log.error).toBe('function');
    });

    it('should output to console without throwing', () => {
      const log = createLogger('test-output');
      expect(() => {
        log.debug('debug message');
        log.info('info message %s', 'with arg');
        log.warn('warn message');
        log.error('error message');
      }).not.toThrow();
    });
  });

  describe('log output structure', () => {
    it('debug output should contain module name and DEBUG label', () => {
      const log = createLogger('mod-test');
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      log.debug('test msg');
      const output = String(spy.mock.calls[0][0]);
      // 输出应包含模块名和级别（可能有ANSI码包裹）
      expect(output).toContain('[mod-test]');
      expect(output.toUpperCase()).toContain('DEBUG');
      spy.mockRestore();
    });

    it('info output should contain INFO label', () => {
      const log = createLogger('info-mod');
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      log.info('hello world');
      const output = String(spy.mock.calls[0][0]);
      expect(output.toUpperCase()).toContain('INFO');
      expect(output).toContain('hello world');
      spy.mockRestore();
    });

    it('warn output should contain WARN label', () => {
      const log = createLogger('warn-mod');
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      log.warn('warning!');
      const output = String(spy.mock.calls[0][0]);
      expect(output.toUpperCase()).toContain('WARN');
      spy.mockRestore();
    });

    it('error output should contain ERROR label', () => {
      const log = createLogger('err-mod');
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      log.error('oops');
      const output = String(spy.mock.calls[0][0]);
      expect(output.toUpperCase()).toContain('ERROR');
      spy.mockRestore();
    });
  });

  describe('printf-style formatting', () => {
    it('should substitute %s placeholders', () => {
      const log = createLogger('fmt-test');
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      log.info('hello %s %d', 'world', 42);
      const output = String(spy.mock.calls[0][0]);
      expect(output).toContain('world');
      expect(output).toContain('42');
      spy.mockRestore();
    });
  });

  describe('object argument formatting', () => {
    it('should include object keys in output', () => {
      const log = createLogger('obj-test');
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      log.info({ foo: 'bar', num: 123 });
      const output = String(spy.mock.calls[0][0]);
      expect(output).toContain('foo');
      expect(output).toContain('bar');
      spy.mockRestore();
    });
  });

  describe('context logging', () => {
    it('should attach context via withContext', () => {
      const log = createLogger('ctx-test');
      const ctxLog = log.withContext({ reqId: 'xyz789' });

      expect(typeof ctxLog.debug).toBe('function');
      expect(typeof ctxLog.info).toBe('function');
      expect(typeof ctxLog.withContext).toBe('function');
    });

    it('context output should contain reqId', () => {
      const log = createLogger('ctx-out');
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const ctxLog = log.withContext({ reqId: 'abc123' });
      ctxLog.info('contextual msg');
      const output = String(spy.mock.calls[0][0]);
      expect(output).toContain('abc123');
      spy.mockRestore();
    });

    it('nested withContext should work', () => {
      const log = createLogger('nest-test');
      const ctx1 = log.withContext({ reqId: 'r1' });
      const ctx2 = ctx1.withContext({ extra: 'data' });
      expect(() => ctx2.info('nested context')).not.toThrow();
    });
  });

  describe('timer', () => {
    it('timer.elapsed should be a number >= 0', () => {
      const log = createLogger('timer-test');
      const t = log.timer('test-op');
      expect(typeof t.elapsed).toBe('number');
      expect(t.elapsed).toBeGreaterThanOrEqual(0);
    });

    it('timer.mark() should record step times', () => {
      const log = createLogger('timer-mark');
      const t = log.timer('multi-step');

      t.mark('step1');
      t.mark('step2');
      t.mark('step3');

      const steps = t.stepsDetail;
      expect(steps).toHaveLength(3);
      steps.forEach(s => {
        expect(s).toHaveProperty('name');
        expect(s).toHaveProperty('ms');
      });
    });

    it('timer.stop() should not throw', () => {
      const log = createLogger('timer-stop');
      const t = log.timer('stop-test');
      expect(() => t.stop()).not.toThrow();
      expect(() => t.stop('extra info')).not.toThrow();
    });

    it('reqTimer.done() should not throw', () => {
      const log = createLogger('req-timer');
      const rt = log.reqTimer({ method: 'GET', path: '/api/test' });
      expect(() => rt.done(200)).not.toThrow();
      expect(() => rt.done(200, 'extra')).not.toThrow();
    });
  });
});
