const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { findAnswer } = require('./lib/qa');
const {
  closeStorage,
  getAdminPassword,
  initializeStorage,
  loadConfig,
  saveConfig
} = require('./storage');

const app = express();
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
  return res.redirect('/admin/login');
}

function getPublicConfig(config) {
  const { adminPassword, ...publicConfig } = config;
  return publicConfig;
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

fs.mkdir(uploadDir, { recursive: true }).catch((error) => {
  console.error('Create upload directory failed:', error);
});

app.use((req, res, next) => {
  const protectedPaths = ['/admin', '/admin.html', '/admin.js', '/admin.css'];
  const needAuth =
    protectedPaths.includes(req.path) ||
    (req.path === '/api/config' && req.method === 'POST') ||
    (req.path === '/api/upload' && req.method === 'POST');
  if (needAuth) {
    return authMiddleware(req, res, next);
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/guide', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'guide.html'));
});

app.get('/admin', (req, res) => {
  if (!isAuthenticated(req)) {
    return res.redirect('/admin/login');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/login', async (req, res) => {
  if (isAuthenticated(req)) {
    return res.redirect('/admin');
  }

  const loginFile = path.join(__dirname, 'public', 'admin-login.html');
  let html = await fs.readFile(loginFile, 'utf8');
  const errorText = req.query.error ? '登录失败，密码错误。' : '';
  html = html.replace('%ERROR%', errorText);
  res.send(html);
});

app.post('/admin/login', async (req, res) => {
  const { password } = req.body;
  const expectedPassword = await getAdminPassword();
  if (password === expectedPassword) {
    const token = createSessionToken();
    sessions.add(token);
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax`);
    return res.redirect('/admin');
  }
  return res.redirect('/admin/login?error=1');
});

app.get('/admin/logout', authMiddleware, (req, res) => {
  const cookies = parseCookies(req);
  if (cookies[SESSION_COOKIE]) {
    sessions.delete(cookies[SESSION_COOKIE]);
  }
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0`);
  res.redirect('/admin/login');
});

app.get('/api/config', async (req, res) => {
  const config = await loadConfig();
  res.json(getPublicConfig(config));
});

app.post('/api/config', async (req, res) => {
  const config = { ...req.body };
  if (!config || typeof config !== 'object') {
    return res.status(400).json({ error: '无效配置数据。' });
  }

  try {
    delete config.adminPassword;
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

app.post('/api/upload', upload.single('file'), (req, res) => {
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
