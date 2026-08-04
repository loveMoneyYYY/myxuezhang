const PROFANITY_PATTERNS = [
  /\b(?:操|肏|妈的|你妈|你娘|逼|屌|狗屎|尿|屁|贱人|骚货|婊子|嫖|娼)\b/iu,
  /(?:干|操|肏|屌)[你您]?/iu,
  /(?:他妈的|她妈的|我操|靠|卧槽)/iu
];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isProfane(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return false;
  }
  return PROFANITY_PATTERNS.some((pattern) => pattern.test(normalized));
}

function scoreMatch(query, source, exactScore, containsScore) {
  if (!source) {
    return 0;
  }

  const normalizedSource = normalizeText(source);
  if (!normalizedSource) {
    return 0;
  }

  if (query === normalizedSource) {
    return exactScore;
  }
  if (normalizedSource.includes(query) || query.includes(normalizedSource)) {
    return containsScore;
  }
  return 0;
}

function scoreFaqItem(item, query) {
  let score = 0;
  if (!item || !query) {
    return score;
  }

  score += scoreMatch(query, item.name, 16, 8);
  score += scoreMatch(query, item.question, 14, 7);

  if (Array.isArray(item.examples)) {
    for (const text of item.examples) {
      score += scoreMatch(query, text, 18, 10);
    }
  }

  if (Array.isArray(item.keywords)) {
    for (const keyword of item.keywords) {
      score += scoreMatch(query, keyword, 20, 12);
    }
  }

  return score;
}

function findAnswer(config, question) {
  const userText = normalizeText(question);
  if (!userText) {
    return config.defaultAnswer || '请输入您的问题。';
  }

  if (isProfane(userText)) {
    return config.defaultAnswer || '请输入您的问题。';
  }

  const candidates = (config.faq || [])
    .map((item) => ({
      item,
      score: scoreFaqItem(item, userText)
    }))
    .filter((entry) => entry.score > 0);

  if (candidates.length === 0) {
    return config.defaultAnswer || '这是一个常见问题，请稍后再试。';
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].item.answer || config.defaultAnswer || '这是一个常见问题，请稍后再试。';
}

module.exports = {
  normalizeText,
  isProfane,
  scoreMatch,
  scoreFaqItem,
  findAnswer
};
