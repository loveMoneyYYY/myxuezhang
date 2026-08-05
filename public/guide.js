const configEndpoint = '/api/config';
const categoryPanel = document.getElementById('categoryPanel');
const postPanel = document.getElementById('postPanel');
const postTemplate = document.getElementById('postTemplate');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const heroTitle = document.getElementById('heroTitle');
const heroSummary = document.getElementById('heroSummary');
const guideHero = document.getElementById('guideHero');

const defaultGuideConfig = {
  pageTitle: '新生报到导览',
  pageSubtitle: '分类帖文 · 可折叠查看',
  heroTitle: '报到、宿舍、生活一站式导览',
  heroSummary: '按分类查看帖子内容，支持图片与 PDF 附件预览。',
  heroImageUrl: '/pic/学校校门.jpg',
  categories: [
    {
      id: 'report',
      title: '报到指南',
      subtitle: '手续与材料',
      posts: [
        {
          title: '新生报到完整流程',
          summary: '按时间顺序整理，先做什么、后做什么，一看就清楚。',
          coverImageUrl: '/pic/学校校门.jpg',
          contentHtml: '<h4>报到当日流程</h4><ol><li>到迎新点核验录取信息。</li><li>办理住宿分配并领取钥匙。</li><li>提交档案与团组织关系材料。</li><li>完成校园卡激活和学费确认。</li></ol>',
          attachments: []
        }
      ]
    },
    {
      id: 'dorm',
      title: '宿舍介绍',
      subtitle: '设施与规范',
      posts: [
        {
          title: '宿舍配置与入住须知',
          summary: '从床位、用电、门禁到热水时间，入住前先掌握。',
          contentHtml: '<h4>重点提示</h4><ul><li>确认床位信息和宿舍楼栋。</li><li>熟悉宿舍作息与门禁时间。</li><li>准备必要生活用品，避免重复购买。</li></ul>',
          attachments: []
        }
      ]
    },
    {
      id: 'life',
      title: '校园生活',
      subtitle: '饮食交通社团',
      posts: [
        {
          title: '一周快速融入校园',
          summary: '食堂、快递、出行与社团活动的高频信息集合。',
          contentHtml: '<h4>建议安排</h4><p>前 3 天优先熟悉食堂、图书馆、快递点与校医院位置。</p><blockquote>先熟悉路线，再规划课程和社团，效率更高。</blockquote>',
          attachments: []
        }
      ]
    }
  ]
};

let guideConfig = defaultGuideConfig;
let activeCategoryId = '';

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

function escapeHtml(input) {
  return String(input || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getGuideConfig(rawConfig) {
  const merged = { ...defaultGuideConfig, ...(rawConfig.guidePage || {}) };
  if (!Array.isArray(merged.categories) || merged.categories.length === 0) {
    merged.categories = defaultGuideConfig.categories;
  }
  return merged;
}

function renderHead(config) {
  pageTitle.textContent = config.pageTitle;
  pageSubtitle.textContent = config.pageSubtitle;
  heroTitle.textContent = config.heroTitle;
  heroSummary.textContent = config.heroSummary;
  const heroImageUrl = normalizeAssetUrl(config.heroImageUrl);
  if (heroImageUrl) {
    guideHero.style.backgroundImage = `url('${heroImageUrl}')`;
  }
}

function renderCategories() {
  categoryPanel.innerHTML = '';
  guideConfig.categories.forEach((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'category-button';
    button.dataset.categoryId = category.id;
    button.innerHTML = `
      <strong>${escapeHtml(category.title || '未命名分类')}</strong>
      <small>${escapeHtml(category.subtitle || '')}</small>
    `;
    button.addEventListener('click', () => {
      activeCategoryId = category.id;
      renderCategories();
      renderPosts();
    });
    if (activeCategoryId === category.id) {
      button.classList.add('active');
    }
    categoryPanel.appendChild(button);
  });
}

function createAttachment(item) {
  const box = document.createElement('div');
  box.className = 'attachment-item';

  const mime = String(item.mimeType || '').toLowerCase();
  const url = normalizeAssetUrl(item.url || '');
  if (!url) {
    return box;
  }

  if (mime.startsWith('image/')) {
    const img = document.createElement('img');
    img.className = 'attachment-image';
    img.src = url;
    img.alt = '图片附件';
    box.appendChild(img);
    return box;
  }

  if (mime.includes('pdf') || url.toLowerCase().endsWith('.pdf')) {
    const frame = document.createElement('iframe');
    frame.className = 'attachment-pdf';
    frame.src = `${url}#toolbar=0&navpanes=0&zoom=100`;
    frame.title = 'PDF 附件';
    box.appendChild(frame);

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = '点击浏览完整版文件';
    box.appendChild(link);
    return box;
  }

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = '打开附件';
  box.appendChild(link);

  return box;
}

function renderPosts() {
  postPanel.innerHTML = '';
  const selected = guideConfig.categories.find((item) => item.id === activeCategoryId) || guideConfig.categories[0];
  if (!selected) {
    postPanel.innerHTML = '<p>暂无内容。</p>';
    return;
  }

  const posts = Array.isArray(selected.posts) ? selected.posts : [];
  if (posts.length === 0) {
    postPanel.innerHTML = '<p>该分类暂未发布帖子。</p>';
    return;
  }

  posts.forEach((post, index) => {
    const node = postTemplate.content.cloneNode(true);
    const article = node.querySelector('.guide-post');
    const header = node.querySelector('.post-header');
    const title = node.querySelector('.post-title');
    const summary = node.querySelector('.post-summary');
    const tag = node.querySelector('.post-tag');
    const toggle = node.querySelector('.post-toggle');
    const body = node.querySelector('.post-body');
    const coverWrap = node.querySelector('.post-cover-wrap');
    const cover = node.querySelector('.post-cover');
    const content = node.querySelector('.post-content');
    const attachmentSection = node.querySelector('.attachment-section');
    const attachmentList = node.querySelector('.attachment-list');

    title.textContent = post.title || '未命名帖子';
    summary.textContent = post.summary || '暂无摘要';
    tag.textContent = `${selected.title} · 帖子 ${index + 1}`;
    content.innerHTML = post.contentHtml || '<p>暂无正文内容。</p>';

    const coverImageUrl = normalizeAssetUrl(post.coverImageUrl || '');
    if (coverImageUrl) {
      cover.src = coverImageUrl;
    } else {
      coverWrap.classList.add('hidden');
    }

    const attachments = Array.isArray(post.attachments) ? post.attachments : [];
    if (attachments.length === 0) {
      attachmentSection.classList.add('hidden');
    } else {
      attachmentSection.classList.remove('hidden');
      attachments.forEach((item) => attachmentList.appendChild(createAttachment(item)));
    }

    // Start collapsed to avoid showing long content by default.
    body.classList.add('hidden');
    toggle.textContent = '展开';

    header.addEventListener('click', () => {
      const hidden = body.classList.toggle('hidden');
      toggle.textContent = hidden ? '展开' : '收起';
    });

    postPanel.appendChild(article);
  });
}

function lockPageZoom() {
  // Block browser zoom shortcuts (Ctrl + wheel / +/- / 0).
  document.addEventListener('wheel', (event) => {
    if (event.ctrlKey) {
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('keydown', (event) => {
    if (!event.ctrlKey) return;
    if (event.key === '+' || event.key === '-' || event.key === '=' || event.key === '0') {
      event.preventDefault();
    }
  });

  // Block pinch-zoom on touch devices.
  document.addEventListener('touchstart', (event) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('touchmove', (event) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  }, { passive: false });

  // Prevent double-tap zoom on mobile browsers.
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
}

async function initPage() {
  try {
    const response = await fetch(configEndpoint);
    const config = await response.json();
    guideConfig = getGuideConfig(config);
  } catch (error) {
    console.error('Load guide config failed:', error);
    guideConfig = defaultGuideConfig;
  }

  activeCategoryId = guideConfig.categories[0] && guideConfig.categories[0].id;
  renderHead(guideConfig);
  renderCategories();
  renderPosts();
}

lockPageZoom();
initPage();
