/**
 * 统一日志系统 — 支持分级、颜色、时间戳、模块标记、请求上下文
 *
 * 环境变量：
 *   LOG_LEVEL=debug|info|warn|error  （默认 debug）
 *   LOG_JSON=true                   输出纯JSON（适合日志采集）
 *
 * 用法：
 *   const log = createLogger('server');
 *   log.info('hello %s', 'world');
 *
 *   // 请求上下文（自动附加 reqId 前缀）
 *   const reqLog = log.withContext({ reqId: 'a1b2c3', ip: '10.0.0.1' });
 *   reqLog.debug('processing...');
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  // 级别颜色
  debug: '\x1b[90m',   // 灰色
  info:  '\x1b[36m',   // 青色
  warn:  '\x1b[33m',   // 黄色
  error: '\x1b[31m',   // 红色
  // 模块颜色（循环使用，便于区分）
  m0: '\x1b[35m', m1: '\x1b[34m', m2: '\x1b[32m', m3: '\x1b[36m',
  m4: '\x1b[33m', m5: '\x1b[35m', m6: '\x1b[34m', m7: '\x1b[32m',
  // 上下文颜色
  ctx: '\x1b[38;5;208m', // 橙色
};

const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.debug;
function _isJsonMode() { return process.env.LOG_JSON === 'true'; }
const LOG_FILE = process.env.LOG_FILE || '';

// ── 文件日志（按日期分割，纯文本无颜色）──
let _logFd = null;
let _logDate = '';

function _getLogFilePath() {
  const dir = path.dirname(LOG_FILE);
  const ext = path.extname(LOG_FILE) || '.log';
  const base = path.basename(LOG_FILE, ext);
  const dateStr = new Date().toISOString().slice(0, 10);
  return path.join(dir, `${base}-${dateStr}${ext}`);
}

function _ensureLogFile() {
  if (!LOG_FILE) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (_logFd && _logDate === today) return _logFd;
  if (_logFd) { try { fs.closeSync(_logFd); } catch {} }
  const fp = _getLogFilePath();
  const dir = path.dirname(fp);
  try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch {}
  try { _logFd = fs.openSync(fp, 'a'); _logDate = today; return _logFd; }
  catch (e) { /* 文件打开失败时静默降级到仅 console */ return null; }
}

/** 写入一行到日志文件（无 ANSI 颜色码） */
function _writeToFile(line) {
  const fd = _ensureLogFile();
  if (fd == null) return;
  try { fs.writeSync(fd, line + '\n'); } catch {}
}

// ── 进程级错误守护 ──
let _guardsInstalled = false;

function setupProcessGuards() {
  if (_guardsInstalled) return;
  _guardsInstalled = true;

  const crashLog = createLogger('process');

  process.on('uncaughtException', (err) => {
    crashLog.error('[uncaughtException] %s | %s', err.message, err.stack ? err.stack.split('\n').slice(0, 5).join(' | ') : '');
    // 不退出进程 — 让 Express 继续服务其他请求
  });

  process.on('unhandledRejection', (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error && reason.stack ? reason.stack.split('\n').slice(0, 3).join(' | ') : '';
    crashLog.warn('[unhandledRejection] %s | %s', msg, stack);
  });
}

// 模块名 → 颜色映射缓存
const moduleColors = new Map();
let colorIdx = 0;

function getModuleColor(mod) {
  if (!moduleColors.has(mod)) {
    moduleColors.set(mod, 'm' + (colorIdx++ % 8));
  }
  return COLORS[moduleColors.get(mod)];
}

function timestamp() {
  return new Date().toLocaleString('zh-CN', {
    hour12: false,
    year: '2-digit', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

/** 生成短请求 ID (如 a1b2c3) */
function generateReqId() {
  return Math.random().toString(36).slice(2, 8);
}

/** 获取调用位置（文件名:行号），仅 error 级别使用 */
function getCallSite() {
  const stack = new Error().stack;
  if (!stack) return '';
  // 跳过 "Error"、log 函数、logger 方法、用户调用 — 取第4行
  const lines = stack.split('\n');
  for (let i = 3; i < Math.min(lines.length, 8); i++) {
    const match = lines[i].match(/\((.+?):(\d+):\d+\)|\s+at\s+(.+?):(\d+):\d+/);
    if (match) {
      const file = (match[1] || match[3]).replace(/\\/g, '/').replace(/.*\//, '');
      const line = match[2] || match[4];
      return `${file}:${line}`;
    }
  }
  return '';
}

/**
 * 创建模块专属 logger
 */
function createLogger(module) {
  const modColor = getModuleColor(module);
  const prefix = _isJsonMode() ? '' : `${modColor}[${module}]${COLORS.reset}`;

  function log(level, ...args) {
    if (LEVELS[level] < currentLevel) return;
    const lvlColor = COLORS[level];
    const ts = timestamp();

    let ctx = null;
    if (args.length > 0 && args[args.length - 1] && typeof args[args.length - 1] === 'object' && args[args.length - 1]._ctx) {
      ctx = args.pop()._ctx;
    }

    // 构建纯文本行（用于文件输出，无颜色码）
    let plainText;
    if (_isJsonMode()) {
      const entry = {
        ts, level, module,
        ...(ctx ? { reqId: ctx.reqId, ip: ctx.ip } : {}),
        msg: args.map(formatArg),
        ...(level === 'error' ? { at: getCallSite() } : {}),
      };
      plainText = JSON.stringify(entry);
      console.log(plainText);
    } else {
      let formatted;
      if (args.length > 0 && typeof args[0] === 'string' && /%[sdjfoO]/.test(args[0])) {
        formatted = util.format(...args);
      } else {
        formatted = args.map(a => typeof a === 'object' ? formatObj(a) : a).join(' ');
      }
      const ctxPrefix = ctx ? `[${ctx.reqId || '??'}] ` : '';
      const siteInfo = level === 'error' ? ` (${getCallSite()})` : '';
      plainText = `${ts} ${ctxPrefix}[${module}] ${level.toUpperCase().padEnd(5)} ${formatted}${siteInfo}`;
      console.log(
        `${COLORS.dim}${ts}${COLORS.reset} ${ctxPrefix ? `${COLORS.ctx}[${ctx.reqId || '??'}]${COLORS.reset} ` : ''}${prefix} ${lvlColor}${level.toUpperCase().padEnd(5)}${COLORS.reset} ${formatted}${siteInfo ? ` ${COLORS.dim}${siteInfo}${COLORS.reset}` : ''}`
      );
    }

    _writeToFile(plainText);
  }

  function formatArg(arg) {
    if (typeof arg === 'string') return arg;
    try { return JSON.stringify(arg); } catch { return String(arg); }
  }

  function makeTimer(label) {
    const start = process.hrtime.bigint();
    const steps = [];
    let lastMark = start;

    return {
      mark(stepName) {
        const now = process.hrtime.bigint();
        const ms = Number(now - lastMark) / 1e6;
        steps.push({ name: stepName, ms: ms.toFixed(0) });
        lastMark = now;
        return this;
      },
      stop(extra) {
        const totalMs = Number(process.hrtime.bigint() - start) / 1e6;
        const totalStr = totalMs.toFixed(0) + 'ms';
        const parts = [label + ':', totalStr];
        if (steps.length > 0) {
          const stepStrs = steps.map(s => `${s.name}=${s.ms}ms`);
          parts.push(`(${stepStrs.join(' ')})`);
        }
        if (extra) parts.push(extra);
        log('debug', parts.join(' '));
        return totalMs;
      },
      get elapsed() {
        return Number(process.hrtime.bigint() - start) / 1e6;
      },
      get stepsDetail() {
        return steps.slice();
      },
    };
  }

  const logger = {
    debug(...args) { log('debug', ...args); },
    info(...args)  { log('info', ...args); },
    warn(...args)  { log('warn', ...args); },
    error(...args) { log('error', ...args); },

    timer(label) {
      return makeTimer(label);
    },

    reqTimer(req) {
      const label = `${req.method} ${req.path}`;
      const t = makeTimer(label);
      return {
        done(statusCode, extra) {
          t.stop(`→ ${statusCode}` + (extra ? ' ' + extra : ''));
        }
      };
    },

    withContext(ctx) {
      const ctxData = { _ctx: ctx };
      return {
        debug(...args) { log('debug', ...args, ctxData); },
        info(...args)  { log('info', ...args, ctxData); },
        warn(...args)  { log('warn', ...args, ctxData); },
        error(...args) { log('error', ...args, ctxData); },
        timer: logger.timer.bind(logger),
        reqTimer: logger.reqTimer.bind(logger),
        withContext: logger.withContext.bind(logger),
      };
    },
  };

  return logger;
}

/** 格式化对象输出（带缩进和颜色） */
function formatObj(obj, indent = 0) {
  const pad = ' '.repeat(indent);
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return String(obj);

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    const inner = obj.map(v => formatObj(v, indent + 2)).join(`,\n${pad}`);
    return `[\n${pad}  ${inner}\n${pad}]`;
  }

  const entries = Object.entries(obj).filter(([k]) => !k.startsWith('_'));
  if (entries.length === 0) return '{}';
  const inner = entries.map(([k, v]) => {
    const val = typeof v === 'string' && v.length > 120 ? v.slice(0, 120) + '...' : formatObj(v);
    return `${k}: ${val}`;
  }).join(`,\n${pad}`);
  return `{\n${pad}  ${inner}\n${pad}]`;
}

module.exports = { createLogger, generateReqId, setupProcessGuards };
