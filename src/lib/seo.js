import { HOME_BREADCRUMB, SITE } from '$lib/config/site.js';

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
  return value.replace(/\s+/g, ' ').trim();
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
}) => ({
  '@type': 'BlogPosting',
  '@id': `${canonical}#blogposting`,
  mainEntityOfPage: canonical,
  headline: title,
  description,
  image: image ? [image] : undefined,
  datePublished,
  dateModified: dateModified ?? datePublished,
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
});

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
  breadcrumbs = [],
  article,
  appendSiteName = true,
  additionalJsonLd = []
} = {}) => {
  const canonical = toAbsoluteUrl(path);
  const sanitizedDescription = sanitizeText(description ?? SITE.description);
  const resolvedTitle = (() => {
    const baseTitle = title ? sanitizeText(title) : `${SITE.name}｜${SITE.tagline}`;
    if (!appendSiteName) return baseTitle;
    return `${baseTitle}｜${SITE.name}`;
  })();

  const ogImage = image ? toAbsoluteUrl(image) : SITE.defaultOgImage;

  const jsonld = [
    buildWebSiteSchema(),
    buildOrganizationSchema(),
    buildBreadcrumbSchema(breadcrumbs),
    ...(article
      ? [
          buildArticleSchema({
            canonical,
            title: sanitizeText(article.title ?? title ?? SITE.name),
            description: sanitizedDescription,
            image: ogImage,
            datePublished: article.datePublished,
            dateModified: article.dateModified,
            authorName: article.authorName,
            category: article.category
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
    jsonld
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
