const loadConfigButton = document.getElementById('loadConfig');
const saveConfigButton = document.getElementById('saveConfig');
const statusEl = document.getElementById('status');
const siteTitleInput = document.getElementById('siteTitle');
const heroTitleInput = document.getElementById('heroTitle');
const heroSubtitleInput = document.getElementById('heroSubtitle');
const descriptionInput = document.getElementById('description');
const schoolIntroInput = document.getElementById('schoolIntro');
const disclaimerInput = document.getElementById('disclaimer');
const siteLogoInput = document.getElementById('siteLogoUrl');
const heroImageInput = document.getElementById('heroImageUrl');
const qrImageInput = document.getElementById('qrImageUrl');
const defaultAnswerInput = document.getElementById('defaultAnswer');
const stickyContactsContainer = document.getElementById('stickyContacts');
const featureButtonsContainer = document.getElementById('featureButtons');
const faqItemsContainer = document.getElementById('faqItems');
const addStickyButton = document.getElementById('addSticky');
const addFeatureButton = document.getElementById('addFeature');
const addFaqButton = document.getElementById('addFaq');
const sectionButtons = document.querySelectorAll('.sidebar button');
const sectionPanels = document.querySelectorAll('.section-panel');
const saveModal = document.getElementById('saveModal');
const dialogBackdrop = document.getElementById('dialogBackdrop');
const closeModalButton = document.getElementById('closeModal');
const saveModalMessage = document.getElementById('saveModalMessage');

let currentConfig = {};

const baseUrl = window.location.origin;

function createInputField(labelText, value = '', placeholder = '') {
  const wrapper = document.createElement('div');
  wrapper.className = 'field-row';
  const label = document.createElement('label');
  label.textContent = labelText;
  const input = document.createElement('input');
  input.value = value;
  input.placeholder = placeholder;
  wrapper.append(label, input);
  return { wrapper, input };
}

function createTextAreaField(labelText, value = '', placeholder = '') {
  const wrapper = document.createElement('div');
  wrapper.className = 'field-row';
  const label = document.createElement('label');
  label.textContent = labelText;
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.placeholder = placeholder;
  wrapper.append(label, textarea);
  return { wrapper, textarea };
}

function createCard(title) {
  const card = document.createElement('div');
  card.className = 'item-card';
  const titleEl = document.createElement('div');
  titleEl.className = 'item-card-title';
  titleEl.textContent = title;
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'remove-button';
  removeButton.textContent = '删除';
  removeButton.addEventListener('click', () => card.remove());
  titleEl.appendChild(removeButton);
  card.appendChild(titleEl);
  return card;
}

function createStickyCard(item = {}) {
  const card = createCard(item.label || '联系卡');
  const labelField = createInputField('名称', item.label || '');
  const buttonTextField = createInputField('按钮文本', item.buttonText || '');
  const imageUrlField = createInputField('图片 URL', item.imageUrl || '');
  const descField = createTextAreaField('描述', item.description || '');
  card.append(labelField.wrapper, buttonTextField.wrapper, imageUrlField.wrapper, descField.wrapper);
  card.getData = () => ({
    label: labelField.input.value.trim(),
    buttonText: buttonTextField.input.value.trim(),
    imageUrl: imageUrlField.input.value.trim(),
    description: descField.textarea.value.trim()
  });
  return card;
}

function createFeatureCard(item = {}) {
  const card = createCard(item.title || '功能按钮');
  const iconField = createInputField('图标', item.icon || '');
  const titleField = createInputField('标题', item.title || '');
  card.append(iconField.wrapper, titleField.wrapper);
  card.getData = () => ({
    icon: iconField.input.value.trim(),
    title: titleField.input.value.trim(),
    description: titleField.input.value.trim()
  });
  return card;
}

function createFaqCard(item = {}) {
  const card = createCard(item.name || '问答项');
  const nameField = createInputField('问题名称', item.name || '');
  const answerField = createTextAreaField('答案', item.answer || '');
  const examplesField = createTextAreaField('问法示例（每行一个）', (item.examples || []).join('\n'));
  const keywordsField = createTextAreaField('关键词（逗号分隔）', (item.keywords || []).join(','));
  card.append(nameField.wrapper, answerField.wrapper, examplesField.wrapper, keywordsField.wrapper);
  card.getData = () => ({
    name: nameField.input.value.trim(),
    answer: answerField.textarea.value.trim(),
    examples: examplesField.textarea.value
      .split('\n')
      .map((v) => v.trim())
      .filter(Boolean),
    keywords: keywordsField.textarea.value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  });
  return card;
}

function clearContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

function selectSection(section) {
  sectionButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.section === section);
  });
  sectionPanels.forEach((panel) => {
    panel.classList.toggle('hidden', panel.dataset.section !== section);
  });
}

function renderConfig(config) {
  siteTitleInput.value = config.siteTitle || '';
  heroTitleInput.value = config.heroTitle || '';
  heroSubtitleInput.value = config.heroSubtitle || '';
  descriptionInput.value = config.description || '';
  schoolIntroInput.value = config.schoolIntro || '';
  disclaimerInput.value = config.disclaimer || '';
  siteLogoInput.value = config.siteLogoUrl || '';
  heroImageInput.value = config.heroImageUrl || '';
  qrImageInput.value = config.qrImageUrl || '';
  defaultAnswerInput.value = config.defaultAnswer || '';

  clearContainer(stickyContactsContainer);
  (config.stickyContacts || []).forEach((item) => stickyContactsContainer.appendChild(createStickyCard(item)));

  clearContainer(featureButtonsContainer);
  (config.featureButtons || []).forEach((item) => featureButtonsContainer.appendChild(createFeatureCard(item)));

  clearContainer(faqItemsContainer);
  (config.faq || []).forEach((item) => faqItemsContainer.appendChild(createFaqCard(item)));
}

function collectConfig() {
  return {
    siteTitle: siteTitleInput.value.trim(),
    heroTitle: heroTitleInput.value.trim(),
    heroSubtitle: heroSubtitleInput.value.trim(),
    description: descriptionInput.value.trim(),
    schoolIntro: schoolIntroInput.value.trim(),
    disclaimer: disclaimerInput.value.trim(),
    siteLogoUrl: siteLogoInput.value.trim(),
    heroImageUrl: heroImageInput.value.trim(),
    qrImageUrl: qrImageInput.value.trim(),
    defaultAnswer: defaultAnswerInput.value.trim() || '您好，这是新生答疑助手，目前未找到精准答案，请换一种说法或参考官方通知。',
    stickyContacts: Array.from(stickyContactsContainer.children).map((card) => card.getData()),
    featureButtons: Array.from(featureButtonsContainer.children).map((card) => card.getData()),
    faq: Array.from(faqItemsContainer.children).map((card) => card.getData())
  };
}

async function loadConfig() {
  setStatus('正在加载配置...');
  try {
    const resp = await fetch(`${baseUrl}/api/config`);
    const config = await resp.json();
    currentConfig = config;
    renderConfig(config);
    selectSection('basic');
    setStatus('配置已加载，可编辑后保存。');
  } catch (error) {
    setStatus('加载失败，请检查后端是否已启动。');
    console.error(error);
  }
}

async function saveConfig() {
  setStatus('正在保存配置...');
  try {
    const config = { ...currentConfig, ...collectConfig() };
    const resp = await fetch(`${baseUrl}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    const result = await resp.json();
    if (result.ok) {
      currentConfig = config;
      setStatus('保存成功，前端和问答结果已更新。');
      showModal('配置已成功保存，可返回首页查看最新效果。');
    } else {
      setStatus('保存失败：' + (result.error || '未知错误。'));
    }
  } catch (error) {
    setStatus('保存失败，请检查输入内容是否正确。');
    console.error(error);
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}

loadConfigButton.addEventListener('click', loadConfig);
saveConfigButton.addEventListener('click', saveConfig);
addStickyButton.addEventListener('click', () => stickyContactsContainer.appendChild(createStickyCard()));
addFeatureButton.addEventListener('click', () => featureButtonsContainer.appendChild(createFeatureCard()));
addFaqButton.addEventListener('click', () => faqItemsContainer.appendChild(createFaqCard()));
sectionButtons.forEach((button) => {
  button.addEventListener('click', () => selectSection(button.dataset.section));
});
closeModalButton.addEventListener('click', () => saveModal.classList.add('hidden'));
dialogBackdrop.addEventListener('click', () => saveModal.classList.add('hidden'));
window.addEventListener('load', loadConfig);

function showModal(message) {
  saveModalMessage.textContent = message;
  saveModal.classList.remove('hidden');
}
