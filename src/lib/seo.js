import { HOME_BREADCRUMB, SITE } from '$lib/config/site.js';

const MIN_DESCRIPTION_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 160;
const SENTENCE_END_PATTERN = /[。.!?！？]$/;

const toAbsoluteUrl = (pathOrUrl) => {
  if (!pathOrUrl) return SITE.url;
  try {
    return new URL(pathOrUrl, SITE.url).href;
  } catch (error) {
    console.error('[seo] URL resolve failed:', error);
    return SITE.url;
  }
};

const sanitizeText = (value) => {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const uniqueNonEmpty = (values) => {
  const uniques = [];
  for (const value of values) {
    if (!value) continue;
    if (!uniques.includes(value)) {
      uniques.push(value);
    }
  }
  return uniques;
};

const composeDescription = (primary, extras = []) => {
  const normalizedExtras = Array.isArray(extras) ? extras : [extras];
  const segments = uniqueNonEmpty([primary, ...normalizedExtras].map((segment) => sanitizeText(segment ?? '')));
  if (segments.length === 0) return '';

  let description = segments.shift();

  for (const segment of segments) {
    if (description.length >= MIN_DESCRIPTION_LENGTH) break;
    const connector = SENTENCE_END_PATTERN.test(description) ? '' : '。';
    const appended = `${description}${connector}${segment}`.trim();
    description = appended.length ? appended : description;
    if (description.length >= MAX_DESCRIPTION_LENGTH) break;
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    const truncated = description.slice(0, MAX_DESCRIPTION_LENGTH);
    const punctuationMarks = ['。', '！', '!', '？', '?', '、', ',', '，', '．', '.'];
    const cutIndex = punctuationMarks.reduce((maxIndex, mark) => {
      const index = truncated.lastIndexOf(mark);
      return index > maxIndex ? index : maxIndex;
    }, -1);

    if (cutIndex >= MIN_DESCRIPTION_LENGTH / 2) {
      description = truncated.slice(0, cutIndex + 1);
    } else {
      const withoutTrailingWord = truncated.replace(/\s+\S*$/, '').trim();
      description = withoutTrailingWord || truncated.trim();
    }
  }

  return description;
};

const toIsoString = (value) => {
  if (!value) return undefined;
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString();
  } catch (error) {
    console.error('[seo] Failed to normalize date:', error);
    return undefined;
  }
};

const buildWebSiteSchema = () => ({
  '@type': 'WebSite',
  '@id': `${SITE.url}/#website`,
  url: SITE.url,
  name: SITE.name,
  description: SITE.description,
  inLanguage: SITE.locale,
  publisher: { '@id': SITE.organization.id }
});

const buildOrganizationSchema = () => ({
  '@type': 'Organization',
  '@id': SITE.organization.id,
  name: SITE.organization.name,
  url: SITE.organization.url,
  logo: {
    '@type': 'ImageObject',
    url: SITE.organization.logo
  },
  sameAs: SITE.organization.sameAs
});

const buildBreadcrumbSchema = (breadcrumbs = []) => {
  const list = [HOME_BREADCRUMB, ...breadcrumbs].reduce((acc, item) => {
    if (!item?.name) return acc;
    const url = toAbsoluteUrl(item.url ?? item.path ?? '/');
    if (acc.some((entry) => entry.item === url)) return acc;
    acc.push({ name: item.name, item: url });
    return acc;
  }, []);

  if (list.length === 0) {
    list.push({ name: HOME_BREADCRUMB.name, item: HOME_BREADCRUMB.url });
  }

  return {
    '@type': 'BreadcrumbList',
    itemListElement: list.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item
    }))
  };
};

const buildArticleSchema = ({
  canonical,
  title,
  description,
  image,
  datePublished,
  dateModified,
  authorName,
  category
}) => {
  const published = toIsoString(datePublished);
  const modified = toIsoString(dateModified) ?? published;

  return {
    '@type': 'BlogPosting',
    '@id': `${canonical}#blogposting`,
    mainEntityOfPage: canonical,
    headline: title,
    description,
    image: image ? [image] : undefined,
    datePublished: published,
    dateModified: modified,
    author: {
      '@type': 'Person',
      name: authorName ?? SITE.organization.name
    },
    publisher: {
      '@type': 'Organization',
      '@id': SITE.organization.id,
      name: SITE.organization.name,
      url: SITE.organization.url,
      logo: {
        '@type': 'ImageObject',
        url: SITE.organization.logo
      }
    },
    articleSection: category,
    inLanguage: SITE.locale
  };
};

const normalizeJsonLd = (schemas) => {
  if (!schemas) return [];
  if (!Array.isArray(schemas)) return [schemas];
  return schemas.filter(Boolean);
};

export const createPageSeo = ({
  title,
  description,
  path = '/',
  type = 'website',
  image,
  imageWidth,
  imageHeight,
  breadcrumbs = [],
  article,
  appendSiteName = true,
  additionalJsonLd = [],
  descriptionFallbacks = []
} = {}) => {
  const canonical = toAbsoluteUrl(path);
  const sanitizedDescription = composeDescription(description, [
    ...(Array.isArray(descriptionFallbacks) ? descriptionFallbacks : [descriptionFallbacks]),
    SITE.tagline,
    SITE.description
  ]);
  const resolvedTitle = (() => {
    const baseTitle = title ? sanitizeText(title) : `${SITE.name}｜${SITE.tagline}`;
    if (!appendSiteName) return baseTitle;
    return `${baseTitle}｜${SITE.name}`;
  })();

  const ogImage = image ? toAbsoluteUrl(image) : SITE.defaultOgImage;
  const normalizedImageWidth = typeof imageWidth === 'number' ? Math.max(Math.floor(imageWidth), 0) : undefined;
  const normalizedImageHeight = typeof imageHeight === 'number' ? Math.max(Math.floor(imageHeight), 0) : undefined;

  const articleTitle = sanitizeText(article?.title ?? title ?? SITE.name);
  const articlePublished = article ? toIsoString(article.datePublished) : undefined;
  const articleModified = article ? toIsoString(article.dateModified) ?? articlePublished : undefined;
  const articleAuthor = article?.authorName ? sanitizeText(article.authorName) : SITE.organization.name;
  const articleSection = article?.category ? sanitizeText(article.category) : undefined;

  const jsonld = [
    buildWebSiteSchema(),
    buildOrganizationSchema(),
    buildBreadcrumbSchema(breadcrumbs),
    ...(article
      ? [
          buildArticleSchema({
            canonical,
            title: articleTitle,
            description: sanitizedDescription,
            image: ogImage,
            datePublished: articlePublished,
            dateModified: articleModified,
            authorName: articleAuthor,
            category: articleSection
          })
        ]
      : []),
    ...normalizeJsonLd(additionalJsonLd)
  ];

  return {
    title: resolvedTitle,
    description: sanitizedDescription,
    canonical,
    type,
    image: ogImage,
    imageWidth: normalizedImageWidth,
    imageHeight: normalizedImageHeight,
    jsonld,
    article: article
      ? {
          title: articleTitle,
          publishedTime: articlePublished,
          modifiedTime: articleModified,
          author: articleAuthor,
          section: articleSection
        }
      : null
  };
};

export const createCategoryDescription = (title, fallback) => {
  const customDescription = sanitizeText(fallback ?? '');
  if (customDescription) return customDescription;
  const sanitized = sanitizeText(title ?? '');
  if (!sanitized) return SITE.description;
  return `${sanitized}の脳トレクイズ一覧ページです。最新の問題で楽しく頭の体操をしましょう。`;
};

export const portableTextToPlain = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((block) => portableTextToPlain(block))
      .filter(Boolean)
      .join('\n');
  }
  if (value?._type === 'block' && Array.isArray(value.children)) {
    return value.children
      .map((child) => (child?._type === 'span' ? child.text : ''))
      .filter(Boolean)
      .join('');
  }
  return '';
};

const sanitizeUrl = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed;
};

export const resolveQuizOgImage = (quiz, fallback = '/logo.svg') => {
  const candidates = [
    quiz?.problemImage?.asset?.url ?? quiz?.problemImage?.url,
    quiz?.mainImage?.asset?.url ?? quiz?.mainImage?.url,
    quiz?.answerImage?.asset?.url ?? quiz?.answerImage?.url,
    quiz?.thumbnailUrl,
    fallback,
    SITE.defaultOgImage
  ];

  for (const candidate of candidates) {
    const url = sanitizeUrl(candidate);
    if (url) return url;
  }

  return '/logo.svg';
};

export const resolveOgImageFromQuizzes = (quizzes, fallback = '/logo.svg') => {
  if (!Array.isArray(quizzes)) {
    return resolveQuizOgImage(null, fallback);
  }

  for (const quiz of quizzes) {
    const url = resolveQuizOgImage(quiz, '');
    const sanitized = sanitizeUrl(url);
    if (sanitized) {
      return sanitized;
    }
  }

  return resolveQuizOgImage(null, fallback);
};
