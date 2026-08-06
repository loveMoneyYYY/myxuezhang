const loadConfigButton = document.getElementById('loadConfig');
const saveConfigButton = document.getElementById('saveConfig');
const statusEl = document.getElementById('status');
const refreshViewStatsButton = document.getElementById('refreshViewStats');
const totalViewsEl = document.getElementById('totalViews');
const todayViewsEl = document.getElementById('todayViews');
const homeViewsEl = document.getElementById('homeViews');
const guideViewsEl = document.getElementById('guideViews');
const viewStatsUpdatedEl = document.getElementById('viewStatsUpdated');
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

const guideEntryTitleInput = document.getElementById('guideEntryTitle');
const guideEntryDescriptionInput = document.getElementById('guideEntryDescription');
const guidePageTitleInput = document.getElementById('guidePageTitle');
const guidePageSubtitleInput = document.getElementById('guidePageSubtitle');
const guideHeroTitleInput = document.getElementById('guideHeroTitle');
const guideHeroSummaryInput = document.getElementById('guideHeroSummary');
const guideHeroImageUrlInput = document.getElementById('guideHeroImageUrl');
const guideCategoriesContainer = document.getElementById('guideCategories');
const addGuideCategoryButton = document.getElementById('addGuideCategory');
const guideUploadInput = document.getElementById('guideUploadInput');
const guideUploadButton = document.getElementById('guideUploadButton');
const guideUploadDropzone = document.getElementById('guideUploadDropzone');
const uploadResult = document.getElementById('uploadResult');
const previewModal = document.getElementById('previewModal');
const previewBackdrop = document.getElementById('previewBackdrop');
const closePreviewButton = document.getElementById('closePreview');
const previewTitle = document.getElementById('previewTitle');
const previewContent = document.getElementById('previewContent');

const baseUrl = window.location.origin;
let currentConfig = {};

function formatViewCount(value) {
  return new Intl.NumberFormat('zh-CN').format(Number(value || 0));
}

async function loadViewStats() {
  if (!totalViewsEl) return;
  viewStatsUpdatedEl.textContent = '正在加载统计数据…';
  try {
    const response = await fetch(`${baseUrl}/api/view-stats`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const stats = await response.json();
    totalViewsEl.textContent = formatViewCount(stats.totalViews);
    todayViewsEl.textContent = formatViewCount(stats.todayViews);
    homeViewsEl.textContent = formatViewCount(stats.pages && stats.pages['/'] && stats.pages['/'].totalViews);
    guideViewsEl.textContent = formatViewCount(stats.pages && stats.pages['/guide'] && stats.pages['/guide'].totalViews);
    viewStatsUpdatedEl.textContent = `统计已更新：${new Date().toLocaleString('zh-CN')}`;
  } catch (error) {
    totalViewsEl.textContent = '—';
    todayViewsEl.textContent = '—';
    homeViewsEl.textContent = '—';
    guideViewsEl.textContent = '—';
    viewStatsUpdatedEl.textContent = '统计数据加载失败，请稍后重试。';
    console.error('Load view stats failed:', error);
  }
}

const defaultGuideConfig = {
  entryTitle: '报到、宿舍、生活分类帖文',
  entryDescription: '支持分类、折叠与附件预览，点击进入查看完整内容。',
  pageTitle: '新生报到导览',
  pageSubtitle: '分类帖文 · 可折叠查看',
  heroTitle: '报到、宿舍、生活一站式导览',
  heroSummary: '按分类查看帖子内容，支持图片与 PDF 附件预览。',
  heroImageUrl: '/pic/学校校门.jpg',
  categories: []
};

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

function createToolbar(editor) {
  const toolbar = document.createElement('div');
  toolbar.className = 'editor-toolbar';

  const actions = [
    { label: 'H4', command: 'formatBlock', value: 'h4' },
    { label: 'H5', command: 'formatBlock', value: 'h5' },
    { label: '段落', command: 'formatBlock', value: 'p' },
    { label: '加粗', command: 'bold' },
    { label: '斜体', command: 'italic' },
    { label: '无序列表', command: 'insertUnorderedList' },
    { label: '有序列表', command: 'insertOrderedList' },
    { label: '引用', command: 'formatBlock', value: 'blockquote' }
  ];

  actions.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.label;
    button.addEventListener('click', () => {
      editor.focus();
      if (item.value) {
        document.execCommand(item.command, false, item.value);
      } else {
        document.execCommand(item.command, false, null);
      }
    });
    toolbar.appendChild(button);
  });

  return toolbar;
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

function createAttachmentRow(item = {}) {
  const row = document.createElement('div');
  row.className = 'attachment-row';

  const nameField = createInputField('附件名称', item.name || '', '例如 报到清单 PDF');
  const urlField = createInputField('附件 URL', item.url || '', '例如 /uploads/xxx.pdf');
  const typeField = createInputField('MIME 类型', item.mimeType || '', '例如 application/pdf');

  const actions = document.createElement('div');
  actions.className = 'attachment-actions';
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'remove-button';
  removeButton.textContent = '删除附件';
  removeButton.addEventListener('click', () => row.remove());
  actions.appendChild(removeButton);

  row.append(nameField.wrapper, urlField.wrapper, typeField.wrapper, actions);
  row.getData = () => ({
    name: nameField.input.value.trim(),
    url: urlField.input.value.trim(),
    mimeType: typeField.input.value.trim()
  });
  return row;
}

function createGuidePostCard(item = {}, getCategoryTitle = () => '') {
  const card = document.createElement('div');
  card.className = 'sub-item-card';

  const header = document.createElement('div');
  header.className = 'item-card-title';
  header.textContent = item.title || '帖子';
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'remove-button';
  removeButton.textContent = '删除帖子';
  removeButton.addEventListener('click', () => card.remove());
  const previewButton = document.createElement('button');
  previewButton.type = 'button';
  previewButton.className = 'preview-button';
  previewButton.textContent = '预览帖子';
  previewButton.addEventListener('click', () => showPostPreview(card.getData(), getCategoryTitle()));
  header.append(previewButton, removeButton);
  card.appendChild(header);

  const titleField = createInputField('帖子标题', item.title || '');
  const summaryField = createTextAreaField('帖子摘要', item.summary || '');
  const coverField = createInputField('封面图片 URL', item.coverImageUrl || '', '例如 /uploads/cover.jpg');

  const htmlField = document.createElement('div');
  htmlField.className = 'field-row';
  const htmlLabel = document.createElement('label');
  htmlLabel.textContent = '正文内容（富文本）';
  const editor = document.createElement('div');
  editor.className = 'rich-editor';
  editor.contentEditable = 'true';
  editor.innerHTML = item.contentHtml || '<p>请编辑正文内容...</p>';

  const toolbar = createToolbar(editor);
  htmlField.append(htmlLabel, toolbar, editor);

  const attachmentBlock = document.createElement('div');
  attachmentBlock.className = 'field-row';
  const attachmentLabel = document.createElement('label');
  attachmentLabel.textContent = '附件列表';
  const attachmentContainer = document.createElement('div');
  (item.attachments || []).forEach((att) => {
    attachmentContainer.appendChild(createAttachmentRow(att));
  });
  const addAttachmentButton = document.createElement('button');
  addAttachmentButton.type = 'button';
  addAttachmentButton.className = 'secondary';
  addAttachmentButton.textContent = '新增附件';
  addAttachmentButton.addEventListener('click', () => {
    attachmentContainer.appendChild(createAttachmentRow());
  });
  const postUploadArea = createPostUploadArea(attachmentContainer);
  attachmentBlock.append(attachmentLabel, attachmentContainer, postUploadArea, addAttachmentButton);

  card.append(titleField.wrapper, summaryField.wrapper, coverField.wrapper, htmlField, attachmentBlock);

  card.getData = () => ({
    title: titleField.input.value.trim(),
    summary: summaryField.textarea.value.trim(),
    coverImageUrl: coverField.input.value.trim(),
    contentHtml: editor.innerHTML.trim(),
    attachments: Array.from(attachmentContainer.children)
      .map((row) => row.getData())
      .filter((itemData) => itemData.url)
  });

  return card;
}

function createGuideCategoryCard(item = {}) {
  const card = createCard(item.title || '分类');
  const idField = createInputField('分类 ID（英文）', item.id || `category_${Date.now()}`);
  const titleField = createInputField('分类标题', item.title || '');
  const subtitleField = createInputField('分类副标题', item.subtitle || '');

  const postsWrap = document.createElement('div');
  const postsLabel = document.createElement('label');
  postsLabel.textContent = '分类帖子';
  postsWrap.appendChild(postsLabel);

  const postsContainer = document.createElement('div');
  (item.posts || []).forEach((post) => postsContainer.appendChild(createGuidePostCard(post, () => titleField.input.value.trim())));

  const addPostButton = document.createElement('button');
  addPostButton.type = 'button';
  addPostButton.className = 'secondary';
  addPostButton.textContent = '新增帖子';
  addPostButton.addEventListener('click', () => postsContainer.appendChild(createGuidePostCard({}, () => titleField.input.value.trim())));

  postsWrap.append(postsContainer, addPostButton);

  card.append(idField.wrapper, titleField.wrapper, subtitleField.wrapper, postsWrap);

  card.getData = () => ({
    id: idField.input.value.trim() || `category_${Date.now()}`,
    title: titleField.input.value.trim(),
    subtitle: subtitleField.input.value.trim(),
    posts: Array.from(postsContainer.children)
      .map((postCard) => postCard.getData())
      .filter((post) => post.title || post.summary || post.contentHtml)
  });

  return card;
}

function renderGuideConfig(config) {
  const guidePage = { ...defaultGuideConfig, ...(config.guidePage || {}) };

  guideEntryTitleInput.value = guidePage.entryTitle || '';
  guideEntryDescriptionInput.value = guidePage.entryDescription || '';
  guidePageTitleInput.value = guidePage.pageTitle || '';
  guidePageSubtitleInput.value = guidePage.pageSubtitle || '';
  guideHeroTitleInput.value = guidePage.heroTitle || '';
  guideHeroSummaryInput.value = guidePage.heroSummary || '';
  guideHeroImageUrlInput.value = guidePage.heroImageUrl || '';

  clearContainer(guideCategoriesContainer);
  (guidePage.categories || []).forEach((category) => {
    guideCategoriesContainer.appendChild(createGuideCategoryCard(category));
  });
}

function collectGuideConfig() {
  return {
    entryTitle: guideEntryTitleInput.value.trim(),
    entryDescription: guideEntryDescriptionInput.value.trim(),
    pageTitle: guidePageTitleInput.value.trim(),
    pageSubtitle: guidePageSubtitleInput.value.trim(),
    heroTitle: guideHeroTitleInput.value.trim(),
    heroSummary: guideHeroSummaryInput.value.trim(),
    heroImageUrl: guideHeroImageUrlInput.value.trim(),
    categories: Array.from(guideCategoriesContainer.children)
      .map((categoryCard) => categoryCard.getData())
      .filter((category) => category.id || category.title)
  };
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

  renderGuideConfig(config);
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
    faq: Array.from(faqItemsContainer.children).map((card) => card.getData()),
    guidePage: collectGuideConfig()
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
      showModal('配置已成功保存，可返回首页和导览页查看最新效果。');
    } else {
      setStatus('保存失败：' + (result.error || '未知错误。'));
    }
  } catch (error) {
    setStatus('保存失败，请检查输入内容是否正确。');
    console.error(error);
  }
}

function bindFileDropzone(dropzone, input, onFiles) {
  if (!dropzone || !input) return;

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (event) => {
    onFiles(event.dataTransfer.files);
  });

  dropzone.addEventListener('click', () => input.click());
  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  });
  input.addEventListener('change', () => {
    onFiles(input.files);
    input.value = '';
  });
}

async function uploadFiles(fileList, onUploaded, resultElement = uploadResult) {
  const files = Array.from(fileList || []);
  if (files.length === 0) {
    resultElement.textContent = '请先选择或拖入文件。';
    return;
  }

  let successCount = 0;
  const failures = [];
  const uploadedUrls = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const formData = new FormData();
    formData.append('file', file);
    resultElement.textContent = `正在上传 ${file.name}（${index + 1}/${files.length}）...`;

    try {
      const resp = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        body: formData
      });
      const result = await resp.json();

      if (!resp.ok || !result.ok || !result.file) {
        throw new Error(result.error || '上传失败');
      }

      successCount += 1;
      uploadedUrls.push(`${file.name}: ${result.file.url}`);
      if (onUploaded) {
        onUploaded(result.file);
      }
    } catch (error) {
      failures.push(`${file.name}：${error.message}`);
      console.error(error);
    }
  }

  const successText = uploadedUrls.length > 0 ? ` ${uploadedUrls.join('；')}` : '';
  resultElement.textContent = failures.length > 0
    ? `成功上传 ${successCount} 个，失败 ${failures.length} 个：${failures.join('；')}${successText}`
    : `成功上传 ${successCount} 个文件。${successText}`;
}

function createPostUploadArea(attachmentContainer) {
  const wrapper = document.createElement('div');
  wrapper.className = 'post-upload-area';

  const dropzone = document.createElement('div');
  dropzone.className = 'upload-dropzone';
  dropzone.tabIndex = 0;
  dropzone.setAttribute('role', 'button');

  const title = document.createElement('strong');
  title.textContent = '拖拽文件到此帖子';
  const hint = document.createElement('span');
  hint.className = 'post-upload-hint';
  hint.textContent = '上传成功后会自动加入附件列表';
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.style.display = 'none';
  dropzone.append(title, hint, input);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary';
  button.textContent = '选择附件上传';
  button.addEventListener('click', () => input.click());

  const handleFiles = (files) => uploadFiles(files, (file) => {
    attachmentContainer.appendChild(createAttachmentRow({
      name: file.originalName,
      url: file.url,
      mimeType: file.mimeType
    }));
  }, hint);

  bindFileDropzone(dropzone, input, handleFiles);
  wrapper.append(dropzone, button);
  return wrapper;
}

function normalizePreviewAssetUrl(value) {
  if (!value) return '';
  let url = String(value).trim().replace(/\\/g, '/');
  if (url.startsWith('public/')) url = url.slice(7);
  if (url.startsWith('./')) url = url.slice(2);
  if (url && !url.startsWith('/') && !url.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:/)) {
    url = `/${url}`;
  }
  return url;
}

function createPreviewAttachment(item) {
  const box = document.createElement('div');
  box.className = 'preview-attachment';

  const name = document.createElement('strong');
  name.textContent = item.name || '附件';
  box.appendChild(name);

  const url = normalizePreviewAssetUrl(item.url || '');
  const mime = String(item.mimeType || '').toLowerCase();
  if (!url) return box;

  if (mime.startsWith('image/')) {
    const image = document.createElement('img');
    image.src = url;
    image.alt = item.name || '图片附件';
    box.appendChild(image);
    return box;
  }

  if (mime.includes('pdf') || url.toLowerCase().endsWith('.pdf')) {
    const frame = document.createElement('iframe');
    frame.src = `${url}#toolbar=0&navpanes=0`;
    frame.title = item.name || 'PDF 附件';
    box.appendChild(frame);
  }

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = mime.includes('pdf') ? '新窗口打开 PDF' : '打开附件';
  box.appendChild(link);
  return box;
}

function showPostPreview(post, categoryTitle) {
  previewTitle.textContent = post.title ? `预览：${post.title}` : '帖子预览';
  previewContent.innerHTML = '';

  const article = document.createElement('article');
  article.className = 'preview-post';

  const header = document.createElement('header');
  header.className = 'preview-post-header';
  const tag = document.createElement('p');
  tag.className = 'preview-post-tag';
  tag.textContent = `${categoryTitle || '未命名分类'} · 帖子预览`;
  const title = document.createElement('h2');
  title.className = 'preview-post-title';
  title.textContent = post.title || '未命名帖子';
  const summary = document.createElement('p');
  summary.className = 'preview-post-summary';
  summary.textContent = post.summary || '暂无摘要';
  header.append(tag, title, summary);

  const body = document.createElement('div');
  body.className = 'preview-post-body';

  const coverUrl = normalizePreviewAssetUrl(post.coverImageUrl || '');
  if (coverUrl) {
    const cover = document.createElement('img');
    cover.className = 'preview-post-cover';
    cover.src = coverUrl;
    cover.alt = '帖子封面';
    body.appendChild(cover);
  }

  const content = document.createElement('div');
  content.className = 'preview-post-content';
  content.innerHTML = post.contentHtml || '<p>暂无正文内容。</p>';
  body.appendChild(content);

  const attachments = Array.isArray(post.attachments) ? post.attachments.filter((item) => item.url) : [];
  if (attachments.length > 0) {
    const section = document.createElement('section');
    section.className = 'preview-attachments';
    const heading = document.createElement('h4');
    heading.textContent = '附件资料';
    const list = document.createElement('div');
    attachments.forEach((item) => list.appendChild(createPreviewAttachment(item)));
    section.append(heading, list);
    body.appendChild(section);
  }

  article.append(header, body);
  previewContent.appendChild(article);
  previewModal.classList.remove('hidden');
}

function closePreview() {
  previewModal.classList.add('hidden');
  previewContent.innerHTML = '';
}

async function uploadFile() {
  if (!guideUploadInput.files || guideUploadInput.files.length === 0) {
    uploadResult.textContent = '请先选择文件。';
    return;
  }

  const formData = new FormData();
  formData.append('file', guideUploadInput.files[0]);

  uploadResult.textContent = '正在上传...';

  try {
    const resp = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      body: formData
    });
    const result = await resp.json();

    if (!result.ok || !result.file) {
      uploadResult.textContent = '上传失败：' + (result.error || '未知错误');
      return;
    }

    uploadResult.textContent = `上传成功：${result.file.url}（可复制到封面图或附件 URL）`;
  } catch (error) {
    uploadResult.textContent = '上传失败，请检查网络或后端。';
    console.error(error);
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}

function showModal(message) {
  saveModalMessage.textContent = message;
  saveModal.classList.remove('hidden');
}

loadConfigButton.addEventListener('click', loadConfig);
saveConfigButton.addEventListener('click', saveConfig);
refreshViewStatsButton.addEventListener('click', loadViewStats);
addStickyButton.addEventListener('click', () => stickyContactsContainer.appendChild(createStickyCard()));
addFeatureButton.addEventListener('click', () => featureButtonsContainer.appendChild(createFeatureCard()));
addFaqButton.addEventListener('click', () => faqItemsContainer.appendChild(createFaqCard()));
addGuideCategoryButton.addEventListener('click', () => guideCategoriesContainer.appendChild(createGuideCategoryCard()));
guideUploadButton.addEventListener('click', () => guideUploadInput.click());
bindFileDropzone(guideUploadDropzone, guideUploadInput, (files) => uploadFiles(files));

sectionButtons.forEach((button) => {
  button.addEventListener('click', () => selectSection(button.dataset.section));
});

closeModalButton.addEventListener('click', () => saveModal.classList.add('hidden'));
dialogBackdrop.addEventListener('click', () => saveModal.classList.add('hidden'));
closePreviewButton.addEventListener('click', closePreview);
previewBackdrop.addEventListener('click', closePreview);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !previewModal.classList.contains('hidden')) {
    closePreview();
  }
});
window.addEventListener('load', loadConfig);
window.addEventListener('load', loadViewStats);
