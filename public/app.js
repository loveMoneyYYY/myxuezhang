const configEndpoint = '/api/config';
const questionEndpoint = '/api/question';
const chatHistory = document.getElementById('chatHistory');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const bottomBar = document.querySelector('.bottom-bar');
const heroContacts = document.getElementById('heroContacts');
const menuButtons = document.getElementById('menuButtons');
const heroInfoCards = document.getElementById('heroInfoCards');
const brandTitle = document.getElementById('brandTitle');
const brandSubtitle = document.getElementById('brandSubtitle');
const topbarWechatButton = document.getElementById('topbarWechatButton');
const topbarAppButton = document.getElementById('topbarAppButton');
const siteTitle = document.getElementById('siteTitle');
const heroTitle = document.getElementById('heroTitle');
const heroSubtitle = document.getElementById('heroSubtitle');
const heroDescription = document.getElementById('heroDescription');
const heroBadge = document.getElementById('heroBadge');
const schoolIntro = document.getElementById('schoolIntro');
const disclaimer = document.getElementById('disclaimer');
const siteLogo = document.getElementById('siteLogo');
const heroImage = document.getElementById('heroImage');
const qrImage = document.getElementById('qrImage');
const guideEntryTitle = document.getElementById('guideEntryTitle');
const guideEntryDesc = document.getElementById('guideEntryDesc');
const guideEntryButton = document.getElementById('guideEntryButton');
const imageModal = document.getElementById('imageModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalClose = document.getElementById('modalClose');
const modalImage = document.getElementById('modalImage');
const modalLabel = document.getElementById('modalLabel');
const modalDescription = document.getElementById('modalDescription');
const entryModal = document.getElementById('entryModal');
const entryModalBackdrop = document.getElementById('entryModalBackdrop');
const entryModalClose = document.getElementById('entryModalClose');
const entryModalImage = document.getElementById('entryModalImage');
const entryModalTitle = document.getElementById('entryModalTitle');
const downloadModal = document.getElementById('downloadModal');
const downloadModalBackdrop = document.getElementById('downloadModalBackdrop');
const downloadModalClose = document.getElementById('downloadModalClose');
const DEFAULT_ANSWER_TYPING_SPEED = 45;
const MIN_THINKING_DURATION_MS = 650;
let chatScrollTimer = 0;
let entryModalShown = false;

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
  answerTypingSpeed: DEFAULT_ANSWER_TYPING_SPEED,
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
  ],
  guidePage: {
    entryTitle: '报到、宿舍、生活分类帖文',
    entryDescription: '支持分类、折叠与附件预览，点击进入查看完整内容。'
  }
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

function updateChatSafeArea() {
  if (!bottomBar) {
    return;
  }

  const bottomBarHeight = Math.ceil(bottomBar.getBoundingClientRect().height);
  const safeBottom = Math.max(140, bottomBarHeight + 24);
  document.documentElement.style.setProperty('--chat-safe-bottom', `${safeBottom}px`);
}

function scrollToLatestMessage(behavior = 'smooth') {
  updateChatSafeArea();
  const latestMessage = chatHistory.lastElementChild;
  if (!latestMessage) {
    return;
  }

  if (chatScrollTimer) {
    window.clearTimeout(chatScrollTimer);
  }

  chatScrollTimer = window.setTimeout(() => {
    latestMessage.scrollIntoView({ behavior, block: 'end', inline: 'nearest' });
  }, 0);
}

function appendMessage(text, role) {
  const el = document.createElement('div');
  el.className = `chat-message ${role}`;
  el.textContent = text;
  chatHistory.appendChild(el);
  scrollToLatestMessage();
  return el;
}

function appendThinkingMessage() {
  const el = document.createElement('div');
  el.className = 'chat-message ai ai-thinking';
  el.setAttribute('aria-live', 'polite');

  const label = document.createElement('span');
  label.className = 'thinking-label';
  label.textContent = '正在思考';

  const dots = document.createElement('span');
  dots.className = 'thinking-dots';
  dots.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 3; index += 1) {
    const dot = document.createElement('span');
    dots.appendChild(dot);
  }

  el.append(label, dots);
  chatHistory.appendChild(el);
  scrollToLatestMessage();
  return el;
}

function getAnswerTypingSpeed() {
  const configuredSpeed = clientConfig && clientConfig.answerTypingSpeed;
  if (configuredSpeed === '' || configuredSpeed === null || typeof configuredSpeed === 'undefined') {
    return DEFAULT_ANSWER_TYPING_SPEED;
  }
  const value = Number(configuredSpeed);
  if (!Number.isFinite(value)) {
    return DEFAULT_ANSWER_TYPING_SPEED;
  }
  return Math.min(1000, Math.max(0, Math.round(value)));
}

function waitForTypingStep(delay) {
  return new Promise((resolve) => window.setTimeout(resolve, delay));
}

async function typeAnswer(messageElement, answer) {
  const normalizedAnswer = String(answer || '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\r\n?/g, '\n');
  const characters = Array.from(normalizedAnswer);
  const delay = getAnswerTypingSpeed();
  messageElement.textContent = '';
  messageElement.classList.add('is-typing');

  try {
    for (let index = 0; index < characters.length; index += 1) {
      messageElement.appendChild(document.createTextNode(characters[index]));
      scrollToLatestMessage('auto');
      if (delay > 0 && index < characters.length - 1) {
        await waitForTypingStep(delay);
      }
    }
  } finally {
    messageElement.classList.remove('is-typing');
  }
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

  const guidePageConfig = clientConfig.guidePage || defaultConfig.guidePage || {};
  if (guideEntryTitle) {
    guideEntryTitle.textContent = guidePageConfig.entryTitle || '报到、宿舍、生活分类帖文';
  }
  if (guideEntryDesc) {
    guideEntryDesc.textContent = guidePageConfig.entryDescription || '支持分类、折叠与附件预览，点击进入查看完整内容。';
  }
  if (guideEntryButton) {
    guideEntryButton.href = '/guide';
  }

  const entryModalContent = resolveEntryModalContent(clientConfig);
  if (entryModalTitle) {
    entryModalTitle.textContent = entryModalContent.title;
  }
  if (entryModalImage) {
    entryModalImage.src = entryModalContent.imageUrl;
  }

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

function showTopbarWechatModal() {
  const config = clientConfig || defaultConfig;
  const wechatContact = (config.stickyContacts || []).find((item) =>
    String(item.label || '').includes('学长微信')
  );
  const imageUrl =
    normalizeAssetUrl(wechatContact && wechatContact.imageUrl) ||
    normalizeAssetUrl(config.qrImageUrl) ||
    normalizeAssetUrl(defaultConfig.qrImageUrl);

  modalImage.src = imageUrl;
  modalImage.alt = '学长微信二维码';
  modalLabel.textContent = '学长微信';
  modalDescription.textContent =
    (wechatContact && wechatContact.description) || '扫码添加学长微信，获取专业、宿舍和生活建议。';
  imageModal.classList.remove('hidden');
}

function showDownloadModal() {
  if (downloadModal) {
    downloadModal.classList.remove('hidden');
  }
}

function closeDownloadModal() {
  if (downloadModal) {
    downloadModal.classList.add('hidden');
  }
}

function resolveEntryModalContent(config) {
  const fromContact = (config.stickyContacts || []).find((item) =>
    String(item.label || '').includes('新生群')
  );

  return {
    title: (fromContact && fromContact.label) || '26级权威新生群',
    imageUrl:
      normalizeAssetUrl(fromContact && fromContact.imageUrl) ||
      normalizeAssetUrl(config.qrImageUrl) ||
      '/pic/新生群.jpg'
  };
}

function showEntryModal() {
  if (!entryModal || entryModalShown) {
    return;
  }
  entryModalShown = true;
  entryModal.classList.remove('hidden');
}

function closeEntryModal() {
  if (!entryModal) {
    return;
  }
  entryModal.classList.add('hidden');
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
  const thinkingStartedAt = Date.now();
  const thinkingMessage = appendThinkingMessage();

  try {
    const response = await fetch(questionEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    if (!response.ok) {
      throw new Error(`Question request failed: ${response.status}`);
    }
    const result = await response.json();
    const thinkingRemaining = MIN_THINKING_DURATION_MS - (Date.now() - thinkingStartedAt);
    if (thinkingRemaining > 0) {
      await waitForTypingStep(thinkingRemaining);
    }
    const answerMessage = appendMessage('', 'ai');
    thinkingMessage.remove();
    await typeAnswer(answerMessage, result.answer || '出错了，请稍后重试。');
    scrollToLatestMessage();
  } catch (error) {
    thinkingMessage.classList.remove('ai-thinking');
    thinkingMessage.textContent = '网络异常，请检查服务器是否已启动。';
    scrollToLatestMessage();
  }
}

if (window.MutationObserver && chatHistory) {
  const chatObserver = new MutationObserver(() => {
    scrollToLatestMessage();
  });
  chatObserver.observe(chatHistory, { childList: true, subtree: false });
}

if (bottomBar) {
  updateChatSafeArea();
  window.addEventListener('resize', updateChatSafeArea);
  if (window.ResizeObserver) {
    const bottomBarObserver = new ResizeObserver(updateChatSafeArea);
    bottomBarObserver.observe(bottomBar);
  }
}

chatForm.addEventListener('submit', handleSubmit);
modalBackdrop.addEventListener('click', closeImageModal);
modalClose.addEventListener('click', closeImageModal);
if (topbarWechatButton) {
  topbarWechatButton.addEventListener('click', showTopbarWechatModal);
}
if (topbarAppButton) {
  topbarAppButton.addEventListener('click', showDownloadModal);
}
if (entryModalBackdrop) {
  entryModalBackdrop.addEventListener('click', closeEntryModal);
}
if (entryModalClose) {
  entryModalClose.addEventListener('click', closeEntryModal);
}
if (downloadModalBackdrop) {
  downloadModalBackdrop.addEventListener('click', closeDownloadModal);
}
if (downloadModalClose) {
  downloadModalClose.addEventListener('click', closeDownloadModal);
}

if (heroBadge) {
  heroBadge.addEventListener('click', () => {
    window.location.href = '/guide';
  });
  heroBadge.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      window.location.href = '/guide';
    }
  });
}

loadConfig().catch((error) => {
  appendMessage('加载配置失败，请检查服务器。', 'ai');
  console.error(error);
});

window.setTimeout(() => {
  showEntryModal();
}, 180);
