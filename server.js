const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { findAnswer } = require('./lib/qa');
const {
  closeStorage,
  getAdminPassword,
  getViewStats,
  initializeStorage,
  loadConfig,
  recordPageView,
  saveConfig
} = require('./storage');

const app = express();
function resolveAdminPath() {
  const configuredPath = String(process.env.ADMIN_PATH || '/qdbh-console-7f3a9d2c').trim();
  const normalizedPath = `/${configuredPath.replace(/^\/+|\/+$/g, '')}`;
  if (!/^\/[a-zA-Z0-9_-]{8,80}$/.test(normalizedPath)) {
    throw new Error('ADMIN_PATH must be a single URL path segment containing 8-80 letters, numbers, hyphens, or underscores.');
  }
  return normalizedPath;
}

const ADMIN_PATH = resolveAdminPath();
const ADMIN_LOGIN_PATH = `${ADMIN_PATH}/login`;
const ADMIN_LOGOUT_PATH = `${ADMIN_PATH}/logout`;
const LEGACY_ADMIN_PATH = /^\/admin(?:\/|$)/;
const SECURE_COOKIE_ATTRIBUTE = process.env.NODE_ENV === 'production' ? '; Secure' : '';

function resolvePort() {
  const explicitPort = process.env.PORT || process.env.APP_PORT;
  if (explicitPort) {
    const parsedPort = Number(explicitPort);
    if (Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
      return parsedPort;
    }
  }

  return 3000;
}

const PORT = resolvePort();
const configuredUploadDir = process.env.UPLOAD_DIR;
const uploadDir = configuredUploadDir
  ? (path.isAbsolute(configuredUploadDir) ? configuredUploadDir : path.join(__dirname, configuredUploadDir))
  : path.join(__dirname, 'public', 'uploads');
const SESSION_COOKIE = 'admin_session';
const sessions = new Set();
const DEFAULT_ANSWER_TYPING_SPEED = 45;

function normalizeAnswerTypingSpeed(value) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return DEFAULT_ANSWER_TYPING_SPEED;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_ANSWER_TYPING_SPEED;
  }
  return Math.min(1000, Math.max(0, Math.round(parsed)));
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').slice(0, 16);
    const safeBase = path
      .basename(file.originalname || 'file', ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);
    cb(null, `${Date.now()}-${safeBase || 'upload'}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    if (!name) return cookies;
    cookies[name] = rest.join('=');
    return cookies;
  }, {});
}

function createSessionToken() {
  return crypto.randomBytes(24).toString('hex');
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  return cookies[SESSION_COOKIE] && sessions.has(cookies[SESSION_COOKIE]);
}

function authMiddleware(req, res, next) {
  if (isAuthenticated(req)) {
    return next();
  }
  return res.redirect(ADMIN_LOGIN_PATH);
}

function getPublicConfig(config) {
  const { adminPassword, ...publicConfig } = config;
  publicConfig.answerTypingSpeed = normalizeAnswerTypingSpeed(publicConfig.answerTypingSpeed);
  return publicConfig;
}

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

fs.mkdir(uploadDir, { recursive: true }).catch((error) => {
  console.error('Create upload directory failed:', error);
});

app.use((req, res, next) => {
  // Do not leave the old, commonly scanned /admin entry point available.
  // The administration page is only exposed through ADMIN_PATH.
  if (LEGACY_ADMIN_PATH.test(req.path) || req.path === '/admin.html') {
    return res.status(404).send('Not Found');
  }
  next();
});

app.use((req, res, next) => {
  if (req.method === 'GET' && (req.path === '/' || req.path === '/guide')) {
    res.on('finish', () => {
      if (res.statusCode === 200) {
        recordPageView(req.path).catch((error) => {
          console.error('Record page view failed:', error);
        });
      }
    });
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/guide', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'guide.html'));
});

app.get(ADMIN_PATH, authMiddleware, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get(ADMIN_LOGIN_PATH, async (req, res) => {
  if (isAuthenticated(req)) {
    return res.redirect(ADMIN_PATH);
  }

  const loginFile = path.join(__dirname, 'public', 'admin-login.html');
  let html = await fs.readFile(loginFile, 'utf8');
  const errorText = req.query.error ? '登录失败，密码错误。' : '';
  html = html
    .replace('%ERROR%', errorText)
    .replace('%ADMIN_LOGIN_ACTION%', ADMIN_LOGIN_PATH);
  res.send(html);
});

app.post(ADMIN_LOGIN_PATH, async (req, res) => {
  const { password } = req.body;
  const expectedPassword = await getAdminPassword();
  if (password === expectedPassword) {
    const token = createSessionToken();
    sessions.add(token);
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly${SECURE_COOKIE_ATTRIBUTE}; Path=/; SameSite=Strict; Max-Age=3600`);
    return res.redirect(ADMIN_PATH);
  }
  return res.redirect(`${ADMIN_LOGIN_PATH}?error=1`);
});

app.get(ADMIN_LOGOUT_PATH, authMiddleware, (req, res) => {
  const cookies = parseCookies(req);
  if (cookies[SESSION_COOKIE]) {
    sessions.delete(cookies[SESSION_COOKIE]);
  }
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly${SECURE_COOKIE_ATTRIBUTE}; Path=/; SameSite=Strict; Max-Age=0`);
  res.redirect(ADMIN_LOGIN_PATH);
});

app.get('/api/config', async (req, res) => {
  const config = await loadConfig();
  res.json(getPublicConfig(config));
});

app.post('/api/config', authMiddleware, async (req, res) => {
  const config = { ...req.body };
  if (!config || typeof config !== 'object') {
    return res.status(400).json({ error: '无效配置数据。' });
  }

  try {
    delete config.adminPassword;
    config.answerTypingSpeed = normalizeAnswerTypingSpeed(config.answerTypingSpeed);
    await saveConfig(config);
    res.json({ ok: true });
  } catch (error) {
    console.error('Save config failed:', error);
    res.status(500).json({ error: '保存配置失败。' });
  }
});

app.post('/api/question', async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question 参数不能为空。' });
  }

  const config = await loadConfig();
  const answer = findAnswer(config, question);
  res.json({ answer });
});

app.get('/api/view-stats', authMiddleware, async (_req, res) => {
  try {
    res.json(await getViewStats());
  } catch (error) {
    console.error('Load view stats failed:', error);
    res.status(500).json({ error: 'Unable to load view statistics.' });
  }
});

app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未接收到上传文件。' });
  }
  return res.json({
    ok: true,
    file: {
      url: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype
    }
  });
});

app.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件不能超过 25MB。' });
    }
    return res.status(400).json({ error: error.message });
  }
  return next(error);
});

async function startServer(port) {
  try {
    await initializeStorage();
  } catch (error) {
    console.error('Storage initialization failed:', error);
    process.exit(1);
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && port === 80 && !process.env.PORT && !process.env.APP_PORT) {
      console.warn('Port 80 is already in use, trying port 3000 instead.');
      server.close(() => startServer(3000));
      return;
    }

    console.error(`Failed to start server on port ${port}:`, error);
    process.exit(1);
  });

  const shutdown = async () => {
    await closeStorage();
    server.close(() => process.exit(0));
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer(PORT);
