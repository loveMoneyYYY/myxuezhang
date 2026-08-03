const configEndpoint = '/api/config';
const questionEndpoint = '/api/question';
const chatHistory = document.getElementById('chatHistory');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const heroContacts = document.getElementById('heroContacts');
const menuButtons = document.getElementById('menuButtons');
const siteTitle = document.getElementById('siteTitle');
const heroTitle = document.getElementById('heroTitle');
const heroSubtitle = document.getElementById('heroSubtitle');
const heroDescription = document.getElementById('heroDescription');
const schoolIntro = document.getElementById('schoolIntro');
const disclaimer = document.getElementById('disclaimer');
const siteLogo = document.getElementById('siteLogo');
const heroImage = document.getElementById('heroImage');
const qrImage = document.getElementById('qrImage');
const stickyBar = document.getElementById('stickyBar');
const imageModal = document.getElementById('imageModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalClose = document.getElementById('modalClose');
const modalImage = document.getElementById('modalImage');
const modalLabel = document.getElementById('modalLabel');
const modalDescription = document.getElementById('modalDescription');

let clientConfig = null;

function createContactCard(item) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'hero-card contact-card';
  card.innerHTML = `<strong>${item.label}</strong><p>${item.description || item.buttonText || ''}</p>`;
  card.addEventListener('click', () => showContactImage(item));
  return card;
}

function createMenuButton(icon, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'menu-button';
  button.innerHTML = `<div>${icon}</div><strong>${label}</strong>`;
  button.addEventListener('click', () => {
    chatInput.value = label;
    handleSubmit();
  });
  return button;
}

function createStickyItem(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sticky-item';
  button.innerHTML = `<span>${item.label}</span><strong>${item.buttonText}</strong>`;
  button.addEventListener('click', () => showContactImage(item));
  return button;
}

function appendMessage(text, role) {
  const el = document.createElement('div');
  el.className = `chat-message ${role}`;
  el.textContent = text;
  chatHistory.appendChild(el);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function loadConfig() {
  const response = await fetch(configEndpoint);
  clientConfig = await response.json();
  renderContent();
}

function renderContent() {
  schoolIntro.textContent = clientConfig.schoolIntro || '青岛滨海学院 · 26级新生答疑平台';
  disclaimer.textContent = clientConfig.disclaimer || 'AI 回答仅供参考，招生、收费、报到等动态信息以学校官方通知为准。';

  siteTitle.textContent = clientConfig.siteTitle || '青岛滨海学院';
  heroTitle.textContent = clientConfig.heroTitle || '入学答疑站';
  heroSubtitle.textContent = clientConfig.heroSubtitle || '小陈学长 · 新生专属智能问答';
  heroDescription.textContent = clientConfig.description || '';
  siteLogo.src = clientConfig.siteLogoUrl || 'https://qdbh2026.coze.site/school-logo.jpg';
  heroImage.style.backgroundImage = `url('${clientConfig.heroImageUrl || 'https://qdbh2026.coze.site/hero-bg.png'}')`;
  qrImage.style.backgroundImage = `url('${clientConfig.qrImageUrl || 'https://qdbh2026.coze.site/wechat-qr.png'}')`;

  heroContacts.innerHTML = '';
  (clientConfig.stickyContacts || []).forEach((item) => {
    heroContacts.appendChild(createContactCard(item));
  });

  menuButtons.innerHTML = '';
  (clientConfig.featureButtons || []).forEach((item) => {
    menuButtons.appendChild(createMenuButton(item.icon, item.title));
  });

  stickyBar.innerHTML = '';
  (clientConfig.stickyContacts || []).forEach((item) => {
    stickyBar.appendChild(createStickyItem(item));
  });

  if (stickyBar.childElementCount === 0) {
    stickyBar.classList.add('hidden');
  }
}

function showContactImage(item) {
  modalImage.src = item.imageUrl || '';
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
  } catch (error) {
    chatHistory.lastChild.textContent = '网络异常，请检查服务器是否已启动。';
  }
}

chatForm.addEventListener('submit', handleSubmit);
modalBackdrop.addEventListener('click', closeImageModal);
modalClose.addEventListener('click', closeImageModal);

loadConfig()
  .then(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        stickyBar.classList.toggle('hidden', visible);
      },
      { rootMargin: '-80px 0px 0px 0px' }
    );
    const heroContactsSection = document.getElementById('heroContacts');
    if (heroContactsSection) {
      observer.observe(heroContactsSection);
    }
  })
  .catch((error) => {
    appendMessage('加载配置失败，请检查服务器。', 'ai');
    console.error(error);
  });
