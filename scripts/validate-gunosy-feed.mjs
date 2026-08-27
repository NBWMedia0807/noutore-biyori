#!/usr/bin/env node
// scripts/validate-gunosy-feed.mjs
//
// GunosyFeed（仕様書 ver 3.2.4）+ Gunosyコンテンツ掲載ガイドライン のセルフチェッカー。
//
// このスクリプトは仕様書の各条件をローカルで先に潰しておくためのもので、
// 公式バリデータの代わりではなく「公式バリデータに投げる前の関門」として使う。
//
// 公式のバリデータチェックツール（https://feed-validator.newspass.jp/）には
// 「RSSのURLを入力してチェックする」と「XMLを直接チェックする」の2つの入力欄がある。
// デプロイ前は後者に XML を貼り付ければ検証できるので、最終確認は必ずそちらで行う。
//
// 使い方:
//   node scripts/validate-gunosy-feed.mjs https://noutorebiyori.com/feed/gunosy
//   node scripts/validate-gunosy-feed.mjs ./feed.xml
//   node scripts/validate-gunosy-feed.mjs --fixture     # サンプル記事から生成して検証
//
// 終了コード: エラー0件なら 0、1件以上なら 1（警告のみなら 0）。

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// ---- 仕様上の定数 ----

const NAMESPACES = {
  'xmlns:gnf': 'http://assets.gunosy.com/media/gnf',
  'xmlns:content': 'http://purl.org/rss/1.0/modules/content/',
  'xmlns:dc': 'http://purl.org/dc/elements/1.1/',
  'xmlns:media': 'http://search.yahoo.com/mrss/',
};

// 仕様書 channel / item の表に載っている要素。ここに無い要素は警告する。
const KNOWN_CHANNEL_ELEMENTS = new Set([
  'title',
  'link',
  'description',
  'ttl',
  'image',
  'gnf:wide_image_link',
  'language',
  'copyright',
  'lastBuildDate',
  'item',
]);

const KNOWN_ITEM_ELEMENTS = new Set([
  'title',
  'link',
  'guid',
  'content:encoded',
  'media:status',
  'pubDate',
  'dc:creator',
  'gnf:modified',
  'enclosure',
  'gnf:relatedLink',
  'gnf:analytics',
  'gnf:analytics_gn',
  'gnf:analytics_st',
]);

// ver 3.2 で item の要素から削除されたもの
const REMOVED_ITEM_ELEMENTS = new Set(['description', 'gnf:category', 'gnf:keyword']);

const MAX_CHANNEL_DESCRIPTION_LENGTH = 35;
const MAX_URL_LENGTH = 256;
const MAX_RELATED_LINKS = 3;
const MAX_ARTICLE_AGE_DAYS = 10;

// 仕様書「利用可能なHTMLタグ」に載っている範囲＋埋め込みで使うタグ。
// 一覧に無いタグは警告（実機で表現されない可能性があるため）。
const ALLOWED_HTML_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'caption',
  'cite',
  'code',
  'div',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'i',
  'iframe',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  'q',
  's',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

// 本文で使うと記事が止まる／レイアウトが崩れるタグ
const FORBIDDEN_HTML_TAGS = new Set([
  'script',
  'style',
  'link',
  'meta',
  'form',
  'input',
  'video',
  'audio',
  'object',
  'embed',
]);

const RFC822_PATTERN =
  /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} [+-]\d{4}$/;

// ---- 最小限の XML パーサ（整形式チェックを兼ねる） ----

const NAMED_ENTITIES = new Set(['amp', 'lt', 'gt', 'quot', 'apos']);

class XmlError extends Error {}

const isEntityValid = (entity) =>
  NAMED_ENTITIES.has(entity) || /^#\d+$/.test(entity) || /^#x[0-9a-fA-F]+$/.test(entity);

/** テキストノード中のエスケープ漏れを検出する（仕様書「エスケープ漏れ」対応） */
const assertEscaped = (text, where) => {
  const pattern = /&([^;\s]*);?/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const raw = match[0];
    if (!raw.endsWith(';') || !isEntityValid(match[1])) {
      throw new XmlError(`${where}: エスケープされていない "&" があります（${raw.slice(0, 20)}）`);
    }
  }
  if (text.includes('<')) {
    throw new XmlError(`${where}: エスケープされていない "<" があります`);
  }
};

const parseAttributes = (source, where) => {
  const attrs = {};
  const pattern = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    const value = match[3] !== undefined ? match[3] : match[4];
    assertEscaped(value, `${where} の属性 ${match[1]}`);
    attrs[match[1]] = value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
      .replace(/&amp;/g, '&');
  }
  const leftovers = source.replace(pattern, '').replace(/[\s/]/g, '');
  if (leftovers) {
    throw new XmlError(
      `${where}: 属性として解釈できない文字列があります（${leftovers.slice(0, 30)}）`
    );
  }
  return attrs;
};

/** 開始タグの終端 ">" を探す。引用符で囲まれた属性値の中の ">" は無視する。 */
const findTagEnd = (xml, start) => {
  let quote = null;
  for (let i = start + 1; i < xml.length; i += 1) {
    const char = xml[i];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '>') return i;
  }
  return -1;
};

/**
 * XML を解析して要素ツリーを返す。整形式でなければ XmlError を投げる。
 * ノード: { name, attrs, children, text, cdata: boolean }
 */
const parseXml = (xml) => {
  let index = 0;
  const stack = [];
  let root = null;
  let declaration = null;

  const currentPath = () => stack.map((node) => node.name).join('/') || '(root)';

  while (index < xml.length) {
    const next = xml.indexOf('<', index);

    if (next === -1) {
      const tail = xml.slice(index);
      if (tail.trim())
        throw new XmlError(`ルート要素の外にテキストがあります: ${tail.trim().slice(0, 30)}`);
      break;
    }

    if (next > index) {
      const text = xml.slice(index, next);
      const node = stack[stack.length - 1];
      if (node) {
        assertEscaped(text, currentPath());
        node.text += text;
      } else if (text.trim()) {
        throw new XmlError(`ルート要素の外にテキストがあります: ${text.trim().slice(0, 30)}`);
      }
      index = next;
      continue;
    }

    if (xml.startsWith('<?xml', index)) {
      const end = xml.indexOf('?>', index);
      if (end === -1) throw new XmlError('XML 宣言が閉じられていません');
      declaration = xml.slice(index, end + 2);
      index = end + 2;
      continue;
    }

    if (xml.startsWith('<!--', index)) {
      const end = xml.indexOf('-->', index);
      if (end === -1) throw new XmlError('コメントが閉じられていません');
      index = end + 3;
      continue;
    }

    if (xml.startsWith('<![CDATA[', index)) {
      const end = xml.indexOf(']]>', index);
      if (end === -1) throw new XmlError('CDATA セクションが閉じられていません');
      const node = stack[stack.length - 1];
      if (!node) throw new XmlError('ルート要素の外に CDATA があります');
      node.text += xml.slice(index + 9, end);
      node.cdata = true;
      index = end + 3;
      continue;
    }

    if (xml.startsWith('</', index)) {
      const end = xml.indexOf('>', index);
      if (end === -1) throw new XmlError('終了タグが閉じられていません');
      const name = xml.slice(index + 2, end).trim();
      const node = stack.pop();
      if (!node) throw new XmlError(`対応する開始タグのない終了タグ </${name}> があります`);
      if (node.name !== name) {
        throw new XmlError(
          `タグの対応が取れていません: <${node.name}> に </${name}> が閉じています`
        );
      }
      index = end + 1;
      continue;
    }

    const end = findTagEnd(xml, index);
    if (end === -1) throw new XmlError('開始タグが閉じられていません');
    const inner = xml.slice(index + 1, end);
    const selfClosing = inner.endsWith('/');
    const body = selfClosing ? inner.slice(0, -1) : inner;
    const nameMatch = body.match(/^([A-Za-z_:][-A-Za-z0-9_:.]*)/);
    if (!nameMatch) throw new XmlError(`要素名として解釈できません: <${body.slice(0, 30)}>`);
    const name = nameMatch[1];
    const attrs = parseAttributes(body.slice(name.length), `<${name}>`);
    const node = { name, attrs, children: [], text: '', cdata: false };

    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(node);
    else if (root) throw new XmlError(`ルート要素が複数あります: <${name}>`);
    else root = node;

    if (!selfClosing) stack.push(node);
    index = end + 1;
  }

  if (stack.length > 0)
    throw new XmlError(`閉じられていない要素があります: <${stack[stack.length - 1].name}>`);
  if (!root) throw new XmlError('ルート要素が見つかりません');
  return { root, declaration };
};

// ---- ノード操作ヘルパー ----

const childrenNamed = (node, name) => node.children.filter((child) => child.name === name);
const childNamed = (node, name) => childrenNamed(node, name)[0] ?? null;
const textOf = (node) => (node ? node.text.trim() : '');

// ---- チェック本体 ----

const createReporter = () => {
  const errors = [];
  const warnings = [];
  return {
    errors,
    warnings,
    error: (where, message) => errors.push({ where, message }),
    warn: (where, message) => warnings.push({ where, message }),
  };
};

const isHttpsUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const checkRfc822 = (report, where, label, value) => {
  if (!RFC822_PATTERN.test(value)) {
    report.error(
      where,
      `${label} が RFC822 形式ではありません: "${value}"（例: Mon, 15 Jun 2015 09:00:00 +0900）`
    );
    return null;
  }
  const offset = value.slice(-5);
  if (offset !== '+0900' && offset !== '+0000') {
    report.warn(where, `${label} のタイムゾーンは +0900 か +0000 を指定してください: "${offset}"`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    report.error(where, `${label} を日時として解釈できません: "${value}"`);
    return null;
  }
  return parsed;
};

const checkUrlValue = (report, where, label, value, { required = true } = {}) => {
  if (!value) {
    if (required) report.error(where, `${label} が空です`);
    return;
  }
  if (!isHttpsUrl(value)) {
    report.error(where, `${label} は HTTPS の絶対URLで指定してください: "${value}"`);
    return;
  }
  if (value.length >= MAX_URL_LENGTH) {
    report.error(
      where,
      `${label} が ${MAX_URL_LENGTH} 文字以上のため取り込まれません（${value.length} 文字）`
    );
  }
};

/** content:encoded の HTML を仕様書・ガイドラインに照らして確認する */
const checkContentHtml = (report, where, html) => {
  if (!html.trim()) {
    report.error(where, 'content:encoded が空です（記事全文が必須）');
    return;
  }

  const tagPattern = /<\s*\/?\s*([A-Za-z][A-Za-z0-9]*)([^>]*)>/g;
  const unknown = new Set();
  let match;
  while ((match = tagPattern.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const attrs = match[2] ?? '';

    if (FORBIDDEN_HTML_TAGS.has(tag)) {
      report.error(where, `content:encoded で使用できないタグ <${tag}> が含まれています`);
      continue;
    }
    if (!ALLOWED_HTML_TAGS.has(tag)) unknown.add(tag);

    if (/\sstyle\s*=/i.test(attrs)) {
      report.error(
        where,
        `<${tag}> に style 属性があります（レイアウト崩れの原因になるため使用不可）`
      );
    }
    if (/\son[a-z]+\s*=/i.test(attrs)) {
      report.error(where, `<${tag}> にインラインイベントハンドラがあります`);
    }
    if (tag === 'img') {
      const src = attrs.match(/\ssrc\s*=\s*"([^"]*)"/i)?.[1] ?? '';
      if (!isHttpsUrl(src)) {
        report.error(where, `本文中の img src が HTTPS の絶対URLではありません: "${src}"`);
      }
      if (/\s(data-src|data-lazy|loading)\s*=/i.test(attrs)) {
        report.warn(where, 'JavaScript による画像の遅延ロードには対応していません');
      }
    }
    if (tag === 'a') {
      // ガイドライン 2.3.1 ⑤：本文中のリンクは1段落目と2段落目の間に1本のみ。
      // 本フィードは本文にリンクを出さない方針のため、見つかったら要確認。
      report.warn(
        where,
        '本文中にリンクがあります（ガイドライン 2.3.1 の制約に該当しないか要確認）'
      );
    }
  }

  if (unknown.size > 0) {
    report.warn(
      where,
      `仕様書の対応タグ一覧に無いタグが含まれています: ${[...unknown].join(', ')}`
    );
  }

  if (/<br\s*\/?>\s*<br\s*\/?>/i.test(html)) {
    report.warn(where, '<br> が連続しています（グノシーでは2つ目以降が反映されません）');
  }

  // 「文章は全て <p> タグで囲んでください」
  //
  // 公式バリデータは「<p>タグで囲まれていないテキストが存在します」を、
  // テキストの直近の親要素が本文コンテナでない場合に出す。<li> 直下のテキストも
  // 対象になることを実測で確認済み（<ul><li>ヒント</li></ul> が指摘された）。
  // ここでも同じ判定にして、公式バリデータに投げる前に潰せるようにする。
  const TEXT_CONTAINERS = new Set([
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'figcaption',
    'caption',
    'td',
    'th',
  ]);
  const voidTags = new Set(['br', 'img', 'hr', 'source', 'col']);
  const stack = [];
  let cursor = 0;
  const strayTexts = [];

  const collectText = (text) => {
    if (!text.trim()) return;
    const parent = stack[stack.length - 1];
    if (parent && TEXT_CONTAINERS.has(parent)) return;
    strayTexts.push({ text: text.trim(), parent: parent ?? '(直下)' });
  };

  tagPattern.lastIndex = 0;
  while ((match = tagPattern.exec(html)) !== null) {
    collectText(html.slice(cursor, match.index));
    cursor = tagPattern.lastIndex;
    const tag = match[1].toLowerCase();
    if (voidTags.has(tag) || /\/\s*>$/.test(match[0])) continue;
    if (match[0].startsWith('</')) {
      if (stack[stack.length - 1] === tag) stack.pop();
      continue;
    }
    stack.push(tag);
  }
  collectText(html.slice(cursor));

  for (const { text, parent } of strayTexts) {
    report.warn(
      where,
      `<${parent}> 直下に <p> で囲まれていないテキストがあります: "${text.slice(0, 30)}"`
    );
  }

  if (!html.replace(/<[^>]*>/g, '').trim()) {
    report.warn(where, 'content:encoded にテキストがありません');
  }
};

const checkChannel = (report, channel) => {
  const where = 'channel';

  const title = textOf(childNamed(channel, 'title'));
  if (!title) report.error(where, 'title が空です（必須）');

  const link = textOf(childNamed(channel, 'link'));
  checkUrlValue(report, where, 'link', link);

  const description = textOf(childNamed(channel, 'description'));
  if (!description) {
    report.error(where, 'description が空です（必須）');
  } else if ([...description].length > MAX_CHANNEL_DESCRIPTION_LENGTH) {
    report.error(
      where,
      `description は ${MAX_CHANNEL_DESCRIPTION_LENGTH} 文字以内にしてください（現在 ${[...description].length} 文字）`
    );
  }

  const image = childNamed(channel, 'image');
  if (!image) {
    report.error(where, 'image が指定されていません（必須：正方形ロゴ 120×120px 以上）');
  } else {
    checkUrlValue(report, 'channel/image', 'url', textOf(childNamed(image, 'url')));
    if (!textOf(childNamed(image, 'title'))) report.error('channel/image', 'title が空です');
    checkUrlValue(report, 'channel/image', 'link', textOf(childNamed(image, 'link')));
  }

  const wide = textOf(childNamed(channel, 'gnf:wide_image_link'));
  if (!wide) {
    report.error(where, 'gnf:wide_image_link が指定されていません（必須：縦44px の横長ロゴ）');
  } else {
    checkUrlValue(report, where, 'gnf:wide_image_link', wide);
  }

  const ttl = textOf(childNamed(channel, 'ttl'));
  if (!ttl) {
    report.warn(where, 'ttl が指定されていません（更新間隔の目安・最短1分）');
  } else if (!/^\d+$/.test(ttl) || Number(ttl) < 1) {
    report.error(where, `ttl は1以上の整数（分）で指定してください: "${ttl}"`);
  }

  if (!textOf(childNamed(channel, 'language'))) report.warn(where, 'language が指定されていません');
  if (!textOf(childNamed(channel, 'copyright')))
    report.warn(where, 'copyright が指定されていません');

  const lastBuildDate = textOf(childNamed(channel, 'lastBuildDate'));
  if (!lastBuildDate) {
    report.warn(where, 'lastBuildDate が指定されていません');
  } else {
    checkRfc822(report, where, 'lastBuildDate', lastBuildDate);
  }

  const unknown = new Set(
    channel.children.map((child) => child.name).filter((name) => !KNOWN_CHANNEL_ELEMENTS.has(name))
  );
  if (unknown.size > 0) {
    report.warn(where, `仕様書の channel 要素一覧に無い要素があります: ${[...unknown].join(', ')}`);
  }

  const items = childrenNamed(channel, 'item');
  if (items.length === 0) report.error(where, 'item が1件もありません（必須）');
  return items;
};

const checkItem = (report, item, index, seen, now) => {
  const title = textOf(childNamed(item, 'title'));
  const where = `item[${index + 1}]${title ? ` "${title.slice(0, 24)}"` : ''}`;

  if (!title) report.error(where, 'title が空です（必須）');

  const removed = new Set(
    item.children.map((child) => child.name).filter((name) => REMOVED_ITEM_ELEMENTS.has(name))
  );
  if (removed.size > 0) {
    report.warn(where, `ver 3.2 で item から削除された要素があります: ${[...removed].join(', ')}`);
  }
  const unknown = new Set(
    item.children
      .map((child) => child.name)
      .filter((name) => !KNOWN_ITEM_ELEMENTS.has(name) && !REMOVED_ITEM_ELEMENTS.has(name))
  );
  if (unknown.size > 0) {
    report.warn(where, `仕様書の item 要素一覧に無い要素があります: ${[...unknown].join(', ')}`);
  }

  const link = textOf(childNamed(item, 'link'));
  checkUrlValue(report, where, 'link', link);
  if (link) {
    if (seen.links.has(link)) report.error(where, `link が他の item と重複しています: ${link}`);
    seen.links.add(link);
  }

  const guidNode = childNamed(item, 'guid');
  const guid = textOf(guidNode);
  if (!guid) {
    report.error(where, 'guid が空です（必須）');
  } else {
    if (/^https?:\/\//i.test(guid) || guid.startsWith('//')) {
      report.error(where, `guid に URL 形式は使えません: "${guid}"`);
    }
    if (guidNode?.attrs?.isPermaLink === 'true') {
      report.error(where, 'guid が URL でないため isPermaLink="false" にしてください');
    }
    if (seen.guids.has(guid)) report.error(where, `guid が他の item と重複しています: ${guid}`);
    seen.guids.add(guid);
  }

  const pubDateText = textOf(childNamed(item, 'pubDate'));
  let pubDate = null;
  if (!pubDateText) {
    report.error(where, 'pubDate が空です（必須）');
  } else {
    pubDate = checkRfc822(report, where, 'pubDate', pubDateText);
    if (pubDate) {
      const ageDays = (now.getTime() - pubDate.getTime()) / (24 * 60 * 60 * 1000);
      if (ageDays > MAX_ARTICLE_AGE_DAYS) {
        report.warn(
          where,
          `pubDate が${MAX_ARTICLE_AGE_DAYS}日より前のため取り込まれません（約${Math.floor(ageDays)}日前）`
        );
      }
      if (ageDays < -0.02) {
        report.warn(where, 'pubDate が未来の日時になっています');
      }
    }
  }

  const modifiedText = textOf(childNamed(item, 'gnf:modified'));
  if (!modifiedText) {
    report.warn(where, 'gnf:modified がありません（記事の更新に追随できない場合があります）');
  } else {
    const modified = checkRfc822(report, where, 'gnf:modified', modifiedText);
    if (modified && pubDate && modified.getTime() < pubDate.getTime()) {
      report.warn(where, 'gnf:modified が pubDate より前の日時になっています');
    }
  }

  const status = childNamed(item, 'media:status');
  if (!status) {
    report.error(where, 'media:status がありません（必須）');
  } else if (!['active', 'deleted'].includes(status.attrs.state)) {
    report.error(
      where,
      `media:status の state は active か deleted です: "${status.attrs.state ?? ''}"`
    );
  }

  if (!textOf(childNamed(item, 'dc:creator'))) {
    report.warn(where, 'dc:creator がありません（記事の著者）');
  }

  const contentNode = childNamed(item, 'content:encoded');
  if (!contentNode) {
    report.error(where, 'content:encoded がありません（必須・記事全文）');
  } else {
    if (!contentNode.cdata) {
      report.error(where, 'content:encoded は <![CDATA[ ]]> で囲んでください');
    }
    checkContentHtml(report, where, contentNode.text);
  }

  const enclosures = childrenNamed(item, 'enclosure');
  if (enclosures.length === 0) {
    report.warn(where, 'enclosure がありません（記事リストのサムネイルに使われます）');
  } else if (enclosures.length > 1) {
    report.error(where, `enclosure は1 item につき1件です（${enclosures.length} 件あります）`);
  }
  for (const enclosure of enclosures) {
    checkUrlValue(report, `${where}/enclosure`, 'url', enclosure.attrs.url ?? '');
    if (!enclosure.attrs.type) report.error(`${where}/enclosure`, 'type 属性がありません');
    if (enclosure.attrs.length === undefined) {
      report.error(`${where}/enclosure`, 'length 属性がありません（不明な場合は 0）');
    }
  }

  const related = childrenNamed(item, 'gnf:relatedLink');
  if (related.length > MAX_RELATED_LINKS) {
    report.error(
      where,
      `gnf:relatedLink は最大${MAX_RELATED_LINKS}件です（${related.length} 件あります）`
    );
  }
  const relatedSeen = new Set();
  for (const node of related) {
    const relWhere = `${where}/gnf:relatedLink`;
    if (!node.attrs.title) report.error(relWhere, 'title 属性がありません');
    checkUrlValue(report, relWhere, 'link', node.attrs.link ?? '');
    if (node.attrs.link === link) report.error(relWhere, '自分自身の記事が関連記事に入っています');
    if (node.attrs.link) {
      if (relatedSeen.has(node.attrs.link))
        report.error(relWhere, `関連記事が重複しています: ${node.attrs.link}`);
      relatedSeen.add(node.attrs.link);
    }
    if (node.attrs.thumbnail) {
      checkUrlValue(report, relWhere, 'thumbnail', node.attrs.thumbnail);
    }
  }

  for (const name of ['gnf:analytics', 'gnf:analytics_gn', 'gnf:analytics_st']) {
    const nodes = childrenNamed(item, name);
    if (nodes.length > 1) report.error(where, `${name} が複数あります`);
    for (const node of nodes) {
      if (!node.cdata) report.error(where, `${name} は <![CDATA[ ]]> で囲んでください`);
      const scripts = node.text.match(/<script\b/gi) ?? [];
      if (scripts.length > 1) {
        report.error(
          where,
          `${name}: JavaScript の計測コードは1つまでです（${scripts.length} 個あります）`
        );
      }
      if (node.text.includes('http://')) {
        report.error(
          where,
          `${name}: 計測タグ内に http:// のURLがあります（HTTPS で指定してください）`
        );
      }
    }
  }
};

/**
 * GunosyFeed の XML を検証する。
 * @param {string} xml
 * @param {{now?: Date}} [options]
 * @returns {{errors: Array<{where: string, message: string}>, warnings: Array<{where: string, message: string}>, itemCount: number}}
 */
export const validateGunosyFeed = (xml, { now = new Date() } = {}) => {
  const report = createReporter();

  if (typeof xml !== 'string' || !xml.trim()) {
    report.error('feed', 'フィードが空です');
    return { ...report, itemCount: 0 };
  }

  if (xml.charCodeAt(0) === 0xfeff) {
    report.error('feed', 'ファイル先頭に BOM があります（UTF-8 / BOM なしで出力してください）');
  }

  let parsed;
  try {
    parsed = parseXml(xml.replace(/^﻿/, ''));
  } catch (err) {
    report.error('feed', `XML として解析できません: ${err.message}`);
    return { ...report, itemCount: 0 };
  }

  const { root, declaration } = parsed;

  if (!declaration) {
    report.error('feed', '<?xml version="1.0" encoding="UTF-8" ?> の宣言がありません');
  } else if (!/encoding\s*=\s*["']utf-?8["']/i.test(declaration)) {
    report.error('feed', `XML 宣言の encoding は UTF-8 にしてください: ${declaration}`);
  }

  if (root.name !== 'rss') {
    report.error('feed', `ルート要素は <rss> です（現在: <${root.name}>）`);
    return { ...report, itemCount: 0 };
  }
  if (root.attrs.version !== '2.0') {
    report.error(
      'rss',
      `version は "2.0" を指定してください（現在: "${root.attrs.version ?? ''}"）`
    );
  }

  for (const [attr, uri] of Object.entries(NAMESPACES)) {
    if (!root.attrs[attr]) {
      report.error('rss', `${attr} の指定がありません（指定漏れが多い項目です）`);
    } else if (root.attrs[attr] !== uri) {
      report.error('rss', `${attr} は "${uri}" を指定してください（現在: "${root.attrs[attr]}"）`);
    }
  }

  const channel = childNamed(root, 'channel');
  if (!channel) {
    report.error('rss', '<channel> がありません');
    return { ...report, itemCount: 0 };
  }

  const items = checkChannel(report, channel);
  const seen = { links: new Set(), guids: new Set() };
  items.forEach((item, index) => checkItem(report, item, index, seen, now));

  return { errors: report.errors, warnings: report.warnings, itemCount: items.length };
};

// ---- CLI ----

const FIXTURE_DOCS_PATH = new URL('./fixtures/gunosy-feed-docs.mjs', import.meta.url);

const buildFixtureFeed = async () => {
  const [{ buildGunosyFeed }, { createFixtureDocs }] = await Promise.all([
    import('../src/lib/rss/gunosyFeed.js'),
    import(FIXTURE_DOCS_PATH.href),
  ]);
  const { docs, buildImageUrl } = createFixtureDocs();
  return buildGunosyFeed(docs, { buildImageUrl, gaMeasurementId: 'G-855Y7S6M95' });
};

const loadFeed = async (target) => {
  if (!target || target === '--fixture') return buildFixtureFeed();
  if (/^https?:\/\//i.test(target)) {
    const response = await fetch(target, { headers: { 'User-Agent': 'Gunosy/1.0 (self-check)' } });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    const contentType = response.headers.get('content-type') ?? '';
    if (!/xml/i.test(contentType)) {
      console.warn(`⚠️  Content-Type が XML ではありません: ${contentType}`);
    }
    return response.text();
  }
  return readFile(target, 'utf8');
};

const main = async () => {
  const target = process.argv[2];
  let xml;
  try {
    xml = await loadFeed(target);
  } catch (err) {
    console.error(`フィードを取得できませんでした: ${err.message}`);
    process.exit(1);
  }

  const { errors, warnings, itemCount } = validateGunosyFeed(xml);
  const label = target && target !== '--fixture' ? target : 'サンプル記事から生成したフィード';

  console.log(`GunosyFeed セルフチェック: ${label}`);
  console.log(`  item 件数: ${itemCount}`);
  console.log(`  エラー: ${errors.length} / 警告: ${warnings.length}`);

  for (const { where, message } of errors) console.log(`  ✗ [${where}] ${message}`);
  for (const { where, message } of warnings) console.log(`  ! [${where}] ${message}`);

  if (errors.length === 0 && warnings.length === 0) {
    console.log('  ✓ 仕様書 ver 3.2.4 のセルフチェック項目はすべて通過しました。');
    console.log('  → 公開後に https://feed-validator.newspass.jp/ でも必ず確認してください。');
  }

  process.exit(errors.length > 0 ? 1 : 0);
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
