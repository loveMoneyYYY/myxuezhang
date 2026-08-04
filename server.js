const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { findAnswer } = require('./lib/qa');

const app = express();
const PORT = process.env.PORT || 3000;
const configPath = path.join(__dirname, 'config.json');
const SESSION_COOKIE = 'admin_session';
const sessions = new Set();

async function loadConfig() {
  try {
    const text = await fs.readFile(configPath, 'utf8');
    return JSON.parse(text);
  } catch (error) {
    console.error('Load config failed:', error);
    return {};
  }
}

async function saveConfig(config) {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
}

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

app.use((req, res, next) => {
  const protectedPaths = ['/admin', '/admin.html', '/admin.js', '/admin.css'];
  if (protectedPaths.includes(req.path) || (req.path === '/api/config' && req.method === 'POST')) {
    return authMiddleware(req, res, next);
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

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
  const config = await loadConfig();
  const expectedPassword = config.adminPassword || process.env.ADMIN_PASSWORD || 'admin123';
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
  const config = req.body;
  if (!config || typeof config !== 'object') {
    return res.status(400).json({ error: '无效配置数据。' });
  }

  try {
    const currentConfig = await loadConfig();
    if (currentConfig.adminPassword) {
      config.adminPassword = currentConfig.adminPassword;
    } else if (process.env.ADMIN_PASSWORD) {
      config.adminPassword = process.env.ADMIN_PASSWORD;
    }
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
