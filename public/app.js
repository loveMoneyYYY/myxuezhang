const configEndpoint = '/api/config';
const questionEndpoint = '/api/question';
const chatHistory = document.getElementById('chatHistory');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const heroContacts = document.getElementById('heroContacts');
const menuButtons = document.getElementById('menuButtons');
const heroInfoCards = document.getElementById('heroInfoCards');
const brandTitle = document.getElementById('brandTitle');
const brandSubtitle = document.getElementById('brandSubtitle');
const siteTitle = document.getElementById('siteTitle');
const heroTitle = document.getElementById('heroTitle');
const heroSubtitle = document.getElementById('heroSubtitle');
const heroDescription = document.getElementById('heroDescription');
const schoolIntro = document.getElementById('schoolIntro');
const disclaimer = document.getElementById('disclaimer');
const siteLogo = document.getElementById('siteLogo');
const heroImage = document.getElementById('heroImage');
const qrImage = document.getElementById('qrImage');
const imageModal = document.getElementById('imageModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalClose = document.getElementById('modalClose');
const modalImage = document.getElementById('modalImage');
const modalLabel = document.getElementById('modalLabel');
const modalDescription = document.getElementById('modalDescription');
let chatScrollTimer = 0;

const defaultConfig = {
  siteTitle: '湖南科技大学',
  heroTitle: '入学答疑站',
  heroSubtitle: '白羊学长 · 新生专属智能问答',
  description: '湖南科技大学26级新生答疑平台',
  schoolIntro: '湖南科技大学 · 26级新生答疑平台',
  disclaimer: 'AI 回答仅供参考，招生、收费、报到等动态信息以学校官方通知为准。',
  siteLogoUrl: '/pic/学校logo.png',
  heroImageUrl: '/pic/hero-bg.svg',
  qrImageUrl: '/pic/wechat-qr.svg',
  phone: '0532-86728687',
  address: '山东省青岛市黄岛区嘉陵江西路425号',
  stickyContacts: [
    {
      label: '权威新生群',
      buttonText: '扫码加入',
      imageUrl: '/pic/wechat-qr.svg',
      description: '加入权威新生群，获取最新报到与入学答疑。'
    },
    {
      label: '学长微信',
      buttonText: '扫码咨询',
      imageUrl: '/pic/wechat-qr.svg',
      description: '扫码添加学长微信，获取专业、宿舍和生活建议。'
    }
  ],
  featureButtons: [
    { icon: '🏠', title: '宿舍条件怎么样？', description: '宿舍条件怎么样？' },
    { icon: '📋', title: '报到流程步骤', description: '报到流程步骤' },
    { icon: '🍽️', title: '食堂介绍', description: '食堂介绍' },
    { icon: '🎖️', title: '军训注意事项', description: '军训注意事项' },
    { icon: '🎭', title: '社团招新信息', description: '社团招新信息' },
    { icon: '⚠️', title: '防骗提醒', description: '防骗提醒' },
    { icon: '🏪', title: '周边生活指南', description: '周边生活指南' },
    { icon: '📦', title: '菜鸟驿站在哪？', description: '菜鸟驿站在哪？' }
  ]
};

let clientConfig = null;

function normalizeAssetUrl(value) {
  if (!value) return '';
  let url = String(value).trim().replace(/\\/g, '/');
  if (url.startsWith('public/')) {
    url = url.slice(7);
  }
  if (url.startsWith('./')) {
    url = url.slice(2);
  }
  if (url && !url.startsWith('/') && !url.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:/)) {
    url = '/' + url;
  }
  return url;
}

function createContactCard(item) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'action-card';
  card.innerHTML = `
    <span class="action-icon">👥</span>
    <strong>${item.label}</strong>
    <span>${item.buttonText || item.description || ''}</span>
  `;
  card.addEventListener('click', () => showContactImage(item));
  return card;
}

function createMenuButton(icon, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'feature-card';
  button.innerHTML = `
    <span class="action-icon">${icon}</span>
    <strong>${label}</strong>
    <span>点击查看详情</span>
  `;
  button.addEventListener('click', () => {
    chatInput.value = label;
    handleSubmit();
  });
  return button;
}

function createInfoCard(icon, title, text) {
  const card = document.createElement('div');
  card.className = 'hero-info-card';
  card.innerHTML = `
    <div class="action-icon">${icon}</div>
    <strong>${title}</strong>
    <p>${text}</p>
  `;
  return card;
}

function scrollToLatestMessage() {
  const latestMessage = chatHistory.lastElementChild;
  if (!latestMessage) {
    return;
  }

  if (chatScrollTimer) {
    window.clearTimeout(chatScrollTimer);
  }

  chatScrollTimer = window.setTimeout(() => {
    latestMessage.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
  }, 0);
}

function appendMessage(text, role) {
  const el = document.createElement('div');
  el.className = `chat-message ${role}`;
  el.textContent = text;
  chatHistory.appendChild(el);
  scrollToLatestMessage();
}

async function loadConfig() {
  try {
    const response = await fetch(configEndpoint);
    if (!response.ok) {
      throw new Error('Config load failed');
    }
    clientConfig = await response.json();
  } catch (error) {
    console.error('Failed to load config', error);
    clientConfig = defaultConfig;
  }
  renderContent();
}

function renderContent() {
  clientConfig = clientConfig || defaultConfig;
  schoolIntro.textContent = clientConfig.schoolIntro || '湖南科技大学 · 26级新生答疑平台';
  disclaimer.textContent = clientConfig.disclaimer || 'AI 回答仅供参考，招生、收费、报到等动态信息以学校官方通知为准。';

  const title = clientConfig.siteTitle || '湖南科技大学';
  brandTitle.textContent = title;
  siteTitle.textContent = title;
  brandSubtitle.textContent = clientConfig.heroSubtitle || '白羊学长新生答疑助手 · 在线';
  heroTitle.textContent = clientConfig.heroTitle || '入学答疑站';
  heroSubtitle.textContent = clientConfig.heroSubtitle || '白羊学长 · 新生专属智能问答';
  heroDescription.textContent = clientConfig.description || '';
  const siteLogoUrl = normalizeAssetUrl(clientConfig.siteLogoUrl) || normalizeAssetUrl(defaultConfig.siteLogoUrl) || '/pic/学校logo.png';
  if (siteLogo) {
    siteLogo.src = siteLogoUrl;
  }
  const heroUrl = normalizeAssetUrl(clientConfig.heroImageUrl) || normalizeAssetUrl(defaultConfig.heroImageUrl);
  heroImage.style.backgroundImage = heroUrl ? `url('${heroUrl}')` : 'none';
  const qrUrl = normalizeAssetUrl(clientConfig.qrImageUrl) || normalizeAssetUrl(defaultConfig.qrImageUrl);
  qrImage.style.backgroundImage = qrUrl ? `url('${qrUrl}')` : 'none';

  heroInfoCards.innerHTML = '';
  if (clientConfig.address) {
    heroInfoCards.appendChild(createInfoCard('📍', '学校地址', clientConfig.address));
  }
  if (clientConfig.phone) {
    heroInfoCards.appendChild(createInfoCard('📞', '招生办电话', clientConfig.phone));
  }

  heroContacts.innerHTML = '';
  (clientConfig.stickyContacts || []).forEach((item) => {
    heroContacts.appendChild(createContactCard(item));
  });
  heroContacts.classList.toggle('hidden', heroContacts.childElementCount === 0);

  menuButtons.innerHTML = '';
  (clientConfig.featureButtons || []).forEach((item) => {
    menuButtons.appendChild(createMenuButton(item.icon, item.title));
  });
  menuButtons.classList.toggle('hidden', menuButtons.childElementCount === 0);
}

function showContactImage(item) {
  modalImage.src = normalizeAssetUrl(item.imageUrl) || '';
  modalLabel.textContent = item.label || '';
  modalDescription.textContent = item.description || '';
  imageModal.classList.remove('hidden');
}

function closeImageModal() {
  imageModal.classList.add('hidden');
}

async function handleSubmit(event) {
  if (event) {
    event.preventDefault();
  }

  const question = chatInput.value.trim();
  if (!question) {
    return;
  }

  appendMessage(question, 'user');
  chatInput.value = '';
  appendMessage('正在为你回答，请稍等...', 'ai');

  try {
    const response = await fetch(questionEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    const result = await response.json();
    chatHistory.lastChild.textContent = result.answer || '出错了，请稍后重试。';
    scrollToLatestMessage();
  } catch (error) {
    chatHistory.lastChild.textContent = '网络异常，请检查服务器是否已启动。';
    scrollToLatestMessage();
  }
}

if (window.MutationObserver && chatHistory) {
  const chatObserver = new MutationObserver(() => {
    scrollToLatestMessage();
  });
  chatObserver.observe(chatHistory, { childList: true, subtree: false });
}

chatForm.addEventListener('submit', handleSubmit);
modalBackdrop.addEventListener('click', closeImageModal);
modalClose.addEventListener('click', closeImageModal);

loadConfig().catch((error) => {
  appendMessage('加载配置失败，请检查服务器。', 'ai');
  console.error(error);
});
