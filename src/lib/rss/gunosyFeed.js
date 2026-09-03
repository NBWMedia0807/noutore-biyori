// src/lib/rss/gunosyFeed.js
//
// GunosyFeed（仕様書 ver 3.2.4 準拠）の XML 組み立てロジック。
// このフィード1本で「グノシー」「ニュースライト」「auサービスToday」に配信される。
//
// SvelteKit 固有の import（$lib / $env）を持たない純粋なモジュールにしてあるため、
// scripts/validate-gunosy-feed.mjs や tests/gunosy-feed.test.mjs から
// そのまま import して検証できる。外部依存（画像URL生成・公開日解決）は引数で渡す。
//
// ── 仕様の要点 ──────────────────────────────────────────────
//   - RSS 2.0 + gnf / content / dc / media の4名前空間（xmlns 指定漏れに注意）
//   - URL はすべて HTTPS、文字コードは UTF-8
//   - channel: title / link / description(35文字以内) / image / gnf:wide_image_link / item が必須
//   - item: title / link / guid / content:encoded / media:status / pubDate が必須
//   - guid は「記事URLが変更されても不変」かつ URL 形式不可 → Sanity の _id を使う
//   - pubDate / gnf:modified は RFC822（例: Mon, 15 Jun 2015 09:00:00 +0900）
//   - pubDate が10日より過去の記事は取り込まれない
//   - link / enclosure の URL が256文字以上の記事はグノシーで取り込めない
//
// ── コンテンツ掲載ガイドライン対応 ────────────────────────────
//   - 本文中のリンクは「1段落目と2段落目の間に1本のみ」という制約があるため、
//     本文（content:encoded）にはリンクを一切出力しない（リンクはテキスト化する）。
//     関連記事は gnf:relatedLink 要素だけで配信する。
//   - 本文と補完関係のない画像（サイトロゴ・NO IMAGE 等）は enclosure にも本文にも入れない。
//     画像が無い記事は enclosure ごと省略する。
//   - 広告・記事広告・アプリDL等への誘導リンクは出力しない
//     （SmartNews 用フィードの snf:advertisement に相当するものは載せない）。

export const SITE_NAME = '脳トレ日和';
export const SITE_URL = 'https://noutorebiyori.com';
export const DEFAULT_CREATOR = '脳トレ日和 編集部';

export const CHANNEL = {
  title: SITE_NAME,
  link: `${SITE_URL}/`,
  // GunosyFeed 仕様：channel.description は35文字以内
  description: '毎日更新。楽しく脳を鍛える無料の脳トレクイズ',
  language: 'ja',
  // 正方形ロゴ（120×120px 以上を推奨 / 実体は 1024×1024 の PNG）
  imageUrl: `${SITE_URL}/logo.png`,
  // 横長ロゴ（縦44px 必須 / 横100〜550px 推奨 / 実体は 192×44 の PNG）
  wideImageUrl: `${SITE_URL}/logo-wide.png`,
  ttl: 15,
};

// pubDate が10日より過去の記事は取り込まれない（仕様書 item ※1）。
export const MAX_ARTICLE_AGE_DAYS = 10;
// 10日以内の記事が極端に少ない場合でもフィードを空にしないための下限。
export const MIN_ITEMS = 5;
export const MAX_ITEMS = 30;
// グノシーの取り込み上限（記事URL・画像URLともに256文字未満）
export const MAX_URL_LENGTH = 256;
// gnf:relatedLink は1 item につき最大3件
export const MAX_RELATED_LINKS = 3;

// アプリ内ビューアで読まれたPVに付ける GA4 のコンテンツグループ。
// サイト本体のPV（$lib/analytics/traffic-source.js の SITE_CONTENT_GROUP）と
// 同じ値にしないこと。この2つを分けるのがフェーズAの目的。
export const IN_APP_CONTENT_GROUP = 'gunosy_inapp';

// gnf:analytics 系の各要素がどのアプリ向けかの対応表。
// 仕様書の要素名（_gn / 無印 / _st）に対応する。
export const ANALYTICS_PARTNERS = {
  gn: 'gunosy', // グノシー
  np: 'newspass', // ニュースライト
  st: 'au_service_today', // auサービスToday
};

// ---- 日付 ----

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const pad2 = (value) => String(value).padStart(2, '0');

const toDate = (value) => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

/**
 * RFC822（後継 RFC5322）形式の日付文字列を日本時間（+0900）で返す。
 * 例: Mon, 15 Jun 2015 09:00:00 +0900
 */
export const toRfc822Jst = (input) => {
  const base = toDate(input);
  if (!base) return '';
  const jst = new Date(base.getTime() + JST_OFFSET_MS);
  return (
    `${DAYS[jst.getUTCDay()]}, ${pad2(jst.getUTCDate())} ${MONTHS[jst.getUTCMonth()]} ` +
    `${jst.getUTCFullYear()} ${pad2(jst.getUTCHours())}:${pad2(jst.getUTCMinutes())}:` +
    `${pad2(jst.getUTCSeconds())} +0900`
  );
};

// ---- XML ユーティリティ ----

// XML で許可されていない制御文字を除去する
const sanitizeXml = (value) =>
  typeof value === 'string'
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    : '';

/**
 * CDATA で囲まない箇所（title / description / 各属性値）用のエスケープ。
 * 仕様書に従い & " ' < > の5文字を実体参照へ置換する。
 */
export const escapeXml = (value) =>
  sanitizeXml(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const wrapCdata = (value) => {
  const text = sanitizeXml(value);
  if (!text) return '<![CDATA[]]>';
  // 本文中に ]]> があると CDATA が途中で閉じてしまうため分割する
  return `<![CDATA[${text.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
};

// gnf:analytics 内の JavaScript 文字列リテラルとして安全に埋め込む
const toJsString = (value) =>
  JSON.stringify(sanitizeXml(value)).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttr = (value) => escapeHtml(value).replace(/`/g, '&#96;');

// ---- URL ヘルパー ----

const normalizeSlug = (value) => {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.current === 'string') return value.current.trim();
  return '';
};

/**
 * クイズ記事の canonical URL。
 * サイト側は /quiz/[slug] を /category/[cat]/[slug] へ 308 リダイレクトしているため、
 * フィードには最初から canonical URL を出力してリダイレクトを挟まない。
 */
export const buildQuizUrl = (slug, categorySlug) => {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return '';
  const category = normalizeSlug(categorySlug);
  if (category && !normalizedSlug.includes('/')) {
    return `${SITE_URL}/category/${category}/${normalizedSlug}`;
  }
  return `${SITE_URL}/quiz/${normalizedSlug}`;
};

/**
 * guid は「記事URLが変更されても不変」かつ URL 形式不可（仕様書 item）。
 * Sanity のドキュメントID はスラッグやカテゴリを変更しても変わらないためこれを使う。
 */
export const buildGuid = (doc, slug) => {
  const raw = typeof doc?._id === 'string' && doc._id.trim() ? doc._id.trim() : slug;
  const normalized = String(raw)
    .replace(/[^A-Za-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `noutorebiyori-${normalized}`;
};

// ---- Portable Text → GunosyFeed 本文 HTML ----
//
// 仕様書「本文領域内での HTML タグの使用について」への対応：
//   - 文章はすべて <p> で囲む
//   - <script> と style 属性（width 指定等）は使わない
//   - 画像は <figure><img><figcaption> 形式
//   - <br /> は連続させない（グノシーでは2つ目以降が無視される）
// ガイドライン対応：本文にはリンクを出力しない（リンクマークはテキスト化）。

const renderChild = (child) => {
  if (!child) return '';
  if (child._type === 'break') return '<br />';
  const raw = typeof child.text === 'string' ? child.text : '';
  if (!raw) return '';
  const text = escapeHtml(raw).replace(/(\r?\n)+/g, '<br />');
  if (!Array.isArray(child.marks) || child.marks.length === 0) return text;
  // link マークは意図的に無視する（本文からリンクを出さないガイドライン対応）
  if (child.marks.includes('strong')) return `<strong>${text}</strong>`;
  if (child.marks.includes('em')) return `<em>${text}</em>`;
  return text;
};

const renderChildren = (block) => (block?.children || []).map(renderChild).join('');

const extractYoutubeId = (block) => {
  if (typeof block?.videoId === 'string' && block.videoId.trim()) return block.videoId.trim();
  const url = block?.url || block?.embedUrl || '';
  if (typeof url !== 'string' || !url.trim()) return null;
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/i,
    /v=([a-zA-Z0-9_-]{6,})/i,
    /embed\/([a-zA-Z0-9_-]{6,})/i,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
};

const renderFigure = (source, fallbackAlt, buildImageUrl) => {
  if (!source) return '';
  const url = buildImageUrl(source, { width: 1200, format: 'jpg' });
  if (!url) return '';
  const caption = typeof source?.alt === 'string' ? source.alt.trim() : '';
  const alt = caption || fallbackAlt;
  // figcaption は画像に説明が設定されているときだけ出す
  // （ニュースライト・auサービスToday でキャプションとして表示される）
  const captionHtml = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : '';
  return `<figure><img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" />${captionHtml}</figure>`;
};

export const portableToGunosyHtml = (value, buildImageUrl) => {
  if (!Array.isArray(value)) return '';
  const parts = [];
  let listBuffer = [];
  let listType = null;

  // 箇条書きは <ul><li> ではなく、行頭に記号を付けた <p> として出力する。
  // 仕様書の「文章は全て <p> タグで囲んでください」に対し、<li> 直下のテキストは
  // バリデータチェックツールで「<p>タグで囲まれていないテキストが存在します」と
  // 指摘されるため（実測）。Merkystyle 用フィードの本文変換と同じ方針。
  const flushList = () => {
    if (!listType || listBuffer.length === 0) return;
    listBuffer.forEach((item, index) => {
      const prefix = listType === 'number' ? `${index + 1}. ` : '・';
      parts.push(`<p>${prefix}${item}</p>`);
    });
    listBuffer = [];
    listType = null;
  };

  for (const block of value) {
    if (!block) continue;

    if (block.listItem === 'bullet' || block.listItem === 'number') {
      const content = renderChildren(block).trim();
      if (!content) continue;
      const type = block.listItem === 'number' ? 'number' : 'bullet';
      if (listType && type !== listType) flushList();
      listType = type;
      listBuffer.push(content);
      continue;
    }

    flushList();

    if (block._type === 'block') {
      const content = renderChildren(block).trim();
      if (!content) continue;
      const style = block.style || 'normal';
      // 記事の大見出しは buildContentHtml 側の h2 なので、本文内の見出しは h3/h4 に寄せる
      if (style === 'h2' || style === 'h3') {
        parts.push(`<h3>${content}</h3>`);
        continue;
      }
      if (style === 'h4' || style === 'h5' || style === 'h6') {
        parts.push(`<h4>${content}</h4>`);
        continue;
      }
      if (style === 'blockquote') {
        parts.push(`<blockquote><p>${content}</p></blockquote>`);
        continue;
      }
      parts.push(`<p>${content}</p>`);
      continue;
    }

    if (block._type === 'image') {
      const figure = renderFigure(block, '', buildImageUrl);
      if (figure) parts.push(figure);
      continue;
    }

    if (block._type === 'youtube' || block._type === 'video' || block._type === 'videoEmbed') {
      const videoId = extractYoutubeId(block);
      if (!videoId) continue;
      const src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
      parts.push(`<iframe src="${escapeAttr(src)}"></iframe>`);
      continue;
    }
  }

  flushList();
  return parts.join('');
};

// ---- item の組み立て ----

const buildContentHtml = (doc, title, buildImageUrl) => {
  const parts = [];

  const problemFigure = renderFigure(doc?.problemImage, `${title}の問題画像`, buildImageUrl);
  const problemHtml = portableToGunosyHtml(doc?.problemDescription, buildImageUrl);
  if (problemFigure || problemHtml) {
    parts.push('<h2>問題</h2>');
    if (problemFigure) parts.push(problemFigure);
    if (problemHtml) parts.push(problemHtml);
  }

  const hintsHtml = portableToGunosyHtml(doc?.hints, buildImageUrl);
  if (hintsHtml) {
    parts.push('<h2>ヒント</h2>');
    parts.push(hintsHtml);
  }

  const answerFigure = renderFigure(doc?.answerImage, `${title}の解答画像`, buildImageUrl);
  const answerHtml = portableToGunosyHtml(doc?.answerExplanation, buildImageUrl);
  const closingHtml = portableToGunosyHtml(doc?.closingMessage, buildImageUrl);
  if (answerFigure || answerHtml || closingHtml) {
    parts.push('<h2>解答</h2>');
    if (answerFigure) parts.push(answerFigure);
    if (answerHtml) parts.push(answerHtml);
    if (closingHtml) parts.push(closingHtml);
  }

  parts.push(
    '<p>※複数の正解を持つ場合もございます。あくまでも一例のご紹介に留まることを、ご了承ください。</p>'
  );

  return parts.join('');
};

/**
 * gnf:relatedLink（アプリ内の本文下に出る関連記事枠・最大3件）を組み立てる。
 *
 * この3枠は、グノシー / ニュースライト / auサービスToday のアプリ内で本文を
 * 読み終えた人を自サイトへ連れてくる唯一の導線なので、
 * 「空き枠を作らない」ことを最優先にしている。
 *
 * 採用の優先順位:
 *   1. 編集部が明示した関連記事（manualRelated / 順序も指定どおり）
 *   2. 同カテゴリの新着 → 全カテゴリの新着 のうち、サムネイルがあるもの
 *   3. 同上（サムネイルが無いものも含めて残り枠を埋める）
 *
 * サムネイル付きを先に拾うのは、アプリ内の関連記事枠が画像ありきの
 * 見え方をするため（画像が無い行はクリック率が落ちる）。
 */
const buildRelatedLinks = (doc, buildImageUrl) => {
  const seen = new Set();
  const result = [];

  const push = (entry, { requireThumbnail = false } = {}) => {
    if (result.length >= MAX_RELATED_LINKS || !entry) return;
    const slug = normalizeSlug(entry.slug);
    const title = typeof entry.title === 'string' ? entry.title.trim() : '';
    if (!slug || !title) return;
    const categorySlug = normalizeSlug(entry.categorySlug) || normalizeSlug(doc?.category?.slug);
    const link = buildQuizUrl(slug, categorySlug);
    if (!link || link.length >= MAX_URL_LENGTH || seen.has(link)) return;
    // gnf:relatedLink の thumbnail は 4:3 / 320×240px 推奨
    const thumbnail = entry.image
      ? buildImageUrl(entry.image, { width: 320, height: 240, format: 'jpg' })
      : null;
    if (requireThumbnail && !thumbnail) return;
    seen.add(link);
    result.push({ title, link, thumbnail: thumbnail || '' });
  };

  const manual = (Array.isArray(doc?.manualRelated) ? doc.manualRelated : []).filter(
    (entry) => entry?.visible !== false
  );
  // 同カテゴリの新着 → 全カテゴリの新着 の順に補充する。
  // 後者は、カテゴリの記事数が少ない・カテゴリ未設定で3枠が埋まらない記事の受け皿。
  const supplements = [
    ...(Array.isArray(doc?.autoRelated) ? doc.autoRelated : []),
    ...(Array.isArray(doc?.fallbackRelated) ? doc.fallbackRelated : []),
  ];

  for (const entry of manual) push(entry);
  for (const entry of supplements) push(entry, { requireThumbnail: true });
  for (const entry of supplements) push(entry);

  return result;
};

/**
 * アプリ内ビューアで動く GA4 の計測スニペット。
 *
 * ── なぜアプリごとに出し分けるか ────────────────────────────
 * 従来は同じスニペットを gnf:analytics_gn / gnf:analytics / gnf:analytics_st の
 * 3要素にそのまま使い回していたため、GA4 側でどのアプリで読まれたのかを
 * 区別する手がかりが無く、これらのPVは (not set) に落ちていた。
 *
 * ── フェーズA の方針 ───────────────────────────────────────
 * セッションの参照元 / メディアは **書き換えない**（gtag('set','campaign',...) は使わない）。
 * content_group と traffic_partner を足すだけにして、
 * 「アプリ内で読まれたPV」と「サイトのPV」を分離できるようにする。
 * 既存レポートの数値と時系列は変わらない。
 *
 * @param {string} articleUrl 元記事の URL（中間URLで集計されないよう page_location に渡す）
 * @param {string} title 記事タイトル
 * @param {string} measurementId GA4 の測定ID
 * @param {string} partner 配信先アプリの識別子（gunosy / newspass / au_service_today）
 */
const buildAnalyticsSnippet = (articleUrl, title, measurementId, partner) => {
  // 未設定・プレースホルダ（G-XXXXXXXXXX）のときは計測タグを出さない
  if (!measurementId || /X{4,}/.test(measurementId)) return '';
  const id = toJsString(measurementId);
  // JavaScript で動く計測コードは1要素につき1つまで。
  // page_location / page_title に元記事の情報を渡し、
  // /v1/xxxx のような中間URLで集計されないようにする。
  return (
    `<script>(function(){` +
    `var s=document.createElement('script');s.async=true;` +
    `s.src='https://www.googletagmanager.com/gtag/js?id='+${id};` +
    `document.head.appendChild(s);` +
    `window.dataLayer=window.dataLayer||[];` +
    `function gtag(){window.dataLayer.push(arguments);}` +
    `gtag('js',new Date());` +
    `gtag('config',${id},{page_location:${toJsString(articleUrl)},page_title:${toJsString(title)},` +
    `content_group:${toJsString(IN_APP_CONTENT_GROUP)},traffic_partner:${toJsString(partner)}});` +
    `})();</script>`
  );
};

/**
 * gnf:modified に出す日時。
 *
 * Sanity の _updatedAt は「最後に編集した時刻」なので、前日に記事を作って翌朝に公開する
 * 運用だと _updatedAt < publishedAt となり「更新日が公開日より前」という不自然な値になる。
 * 公開日より前にはならないよう publishedAt でクランプする。
 * 公開後に記事を直した場合は _updatedAt がそれより後になるので、更新の検知には影響しない。
 */
export const resolveModifiedDate = (updatedAt, publishedAt) => {
  const updated = toDate(updatedAt);
  const published = toDate(publishedAt);
  if (!updated) return published ?? null;
  if (!published) return updated;
  return updated.getTime() >= published.getTime() ? updated : published;
};

/**
 * Sanity ドキュメント1件をフィード item の中間表現へ変換する。
 * 配信できない記事（スラッグ無し・公開日不正・URLが長すぎる）は null を返す。
 */
export const toGunosyItem = (doc, { buildImageUrl, resolvePublishedDate, gaMeasurementId }) => {
  const slug = normalizeSlug(doc?.slug);
  if (!slug) return null;

  const title = (typeof doc?.title === 'string' ? doc.title.trim() : '') || '脳トレ問題';
  const link = buildQuizUrl(slug, doc?.category?.slug);
  // グノシーは link が256文字以上の記事を取り込めない
  if (!link || link.length >= MAX_URL_LENGTH) return null;

  const publishedIso =
    (typeof resolvePublishedDate === 'function'
      ? resolvePublishedDate(doc, doc?._id ?? slug)
      : null) ||
    doc?.publishedAt ||
    doc?._createdAt;
  const pubDate = toRfc822Jst(publishedIso);
  if (!pubDate) return null;

  // 記事リストのサムネイル（enclosure）。
  // 本文と補完関係のない画像は使えないため、記事画像が無い場合はサイトロゴで代替せず省略する。
  const enclosureSource = doc?.problemImage ?? doc?.mainImage ?? doc?.answerImage ?? null;
  const enclosureUrlRaw = enclosureSource
    ? buildImageUrl(enclosureSource, { width: 1200, format: 'jpg' })
    : null;
  // グノシーは enclosure の URL が256文字以上の画像を取り込めない
  const enclosureUrl =
    enclosureUrlRaw && enclosureUrlRaw.length < MAX_URL_LENGTH ? enclosureUrlRaw : '';

  return {
    title,
    link,
    guid: buildGuid(doc, slug),
    contentHtml: buildContentHtml(doc, title, buildImageUrl),
    pubDate,
    modified: toRfc822Jst(resolveModifiedDate(doc?._updatedAt, publishedIso)),
    creator: (typeof doc?.author?.name === 'string' && doc.author.name.trim()) || DEFAULT_CREATOR,
    enclosureUrl,
    enclosureCaption: typeof enclosureSource?.alt === 'string' ? enclosureSource.alt.trim() : '',
    related: buildRelatedLinks(doc, buildImageUrl),
    analytics: {
      // 要素ごとに配信先アプリが違うので、traffic_partner を変えて出し分ける
      gn: buildAnalyticsSnippet(link, title, gaMeasurementId, ANALYTICS_PARTNERS.gn),
      np: buildAnalyticsSnippet(link, title, gaMeasurementId, ANALYTICS_PARTNERS.np),
      st: buildAnalyticsSnippet(link, title, gaMeasurementId, ANALYTICS_PARTNERS.st),
    },
    publishedAtMs: publishedIso ? new Date(publishedIso).getTime() : Number.NaN,
  };
};

// 要素の並びは仕様書 item の表の順に合わせている。
// ver 3.2 で item から description / gnf:category / gnf:keyword が削除されたため、
// 仕様書に載っている要素だけを出力する（余計な要素を足さない）。
const buildItemXml = (item) => {
  const lines = [
    '  <item>',
    `    <title>${escapeXml(item.title)}</title>`,
    `    <link>${escapeXml(item.link)}</link>`,
    `    <guid isPermaLink="false">${escapeXml(item.guid)}</guid>`,
    `    <content:encoded>${wrapCdata(item.contentHtml)}</content:encoded>`,
    '    <media:status state="active" />',
    `    <pubDate>${escapeXml(item.pubDate)}</pubDate>`,
    `    <dc:creator>${escapeXml(item.creator)}</dc:creator>`,
  ];

  if (item.modified) {
    lines.push(`    <gnf:modified>${escapeXml(item.modified)}</gnf:modified>`);
  }

  if (item.enclosureUrl) {
    const caption = item.enclosureCaption ? ` caption="${escapeXml(item.enclosureCaption)}"` : '';
    lines.push(
      `    <enclosure url="${escapeXml(item.enclosureUrl)}" type="image/jpeg" length="0"${caption} />`
    );
  }

  for (const related of item.related) {
    const thumbnail = related.thumbnail ? ` thumbnail="${escapeXml(related.thumbnail)}"` : '';
    lines.push(
      `    <gnf:relatedLink title="${escapeXml(related.title)}" link="${escapeXml(related.link)}"${thumbnail} />`
    );
  }

  // グノシー / ニュースライト / auサービスToday でそれぞれ専用の要素が必要。
  // 中身は traffic_partner だけが異なる（どのアプリで読まれたか を GA4 で分けるため）。
  if (item.analytics?.gn) {
    lines.push(`    <gnf:analytics_gn>${wrapCdata(item.analytics.gn)}</gnf:analytics_gn>`);
    lines.push(`    <gnf:analytics>${wrapCdata(item.analytics.np)}</gnf:analytics>`);
    lines.push(`    <gnf:analytics_st>${wrapCdata(item.analytics.st)}</gnf:analytics_st>`);
  }

  lines.push('  </item>');
  return lines.join('\n');
};

/**
 * pubDate が10日より過去の記事はそもそも取り込まれないので配信対象から外す。
 * ただし公開が途切れてフィードが空になる方が危険なため、
 * 10日以内が MIN_ITEMS 件未満のときは新しい順に MIN_ITEMS 件まで残す。
 */
export const selectGunosyItems = (items, nowMs) => {
  const threshold = nowMs - MAX_ARTICLE_AGE_DAYS * 24 * 60 * 60 * 1000;
  const fresh = items.filter(
    (item) => Number.isFinite(item.publishedAtMs) && item.publishedAtMs >= threshold
  );
  const selected = fresh.length >= MIN_ITEMS ? fresh : items.slice(0, MIN_ITEMS);
  return selected.slice(0, MAX_ITEMS);
};

/**
 * GunosyFeed の XML 全体を組み立てる。
 * @param {Array<object>} docs Sanity から取得したクイズ記事
 * @param {{buildImageUrl: Function, resolvePublishedDate?: Function, gaMeasurementId?: string, now?: Date}} deps
 * @returns {string} RSS 2.0 XML
 */
export const buildGunosyFeed = (docs, deps) => {
  const now = deps?.now instanceof Date ? deps.now : new Date();
  const seenGuids = new Set();

  const items = (Array.isArray(docs) ? docs : [])
    .map((doc) => toGunosyItem(doc, deps))
    .filter(Boolean)
    // 同一記事の重複（再公開などでドキュメントが重なるケース）を1件に寄せる
    .filter((item) => {
      if (seenGuids.has(item.guid)) return false;
      seenGuids.add(item.guid);
      return true;
    });

  const itemsXml = selectGunosyItems(items, now.getTime()).map(buildItemXml).join('\n');

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0"',
    '  xmlns:gnf="http://assets.gunosy.com/media/gnf"',
    '  xmlns:content="http://purl.org/rss/1.0/modules/content/"',
    '  xmlns:dc="http://purl.org/dc/elements/1.1/"',
    '  xmlns:media="http://search.yahoo.com/mrss/">',
    '<channel>',
    `  <title>${escapeXml(CHANNEL.title)}</title>`,
    `  <link>${escapeXml(CHANNEL.link)}</link>`,
    `  <description>${escapeXml(CHANNEL.description)}</description>`,
    `  <language>${escapeXml(CHANNEL.language)}</language>`,
    `  <copyright>© ${now.getFullYear()} ${escapeXml(SITE_NAME)}</copyright>`,
    `  <ttl>${CHANNEL.ttl}</ttl>`,
    `  <lastBuildDate>${escapeXml(toRfc822Jst(now))}</lastBuildDate>`,
    '  <image>',
    `    <url>${escapeXml(CHANNEL.imageUrl)}</url>`,
    `    <title>${escapeXml(CHANNEL.title)}</title>`,
    `    <link>${escapeXml(CHANNEL.link)}</link>`,
    '  </image>',
    `  <gnf:wide_image_link>${escapeXml(CHANNEL.wideImageUrl)}</gnf:wide_image_link>`,
  ];

  if (itemsXml) lines.push(itemsXml);
  lines.push('</channel>', '</rss>');

  return lines.join('\n');
};
