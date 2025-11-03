// src/lib/rss/portableText.ts
import { getAbsoluteUrl } from './getAbsoluteUrl';
import { buildImageUrl } from './images';

type PortableChild = {
  _type?: string;
  text?: string;
  marks?: string[];
};

type PortableMarkDef = {
  _key?: string;
  _type?: string;
  href?: string;
  url?: string;
};

type PortableBlock = {
  _type?: string;
  style?: string;
  children?: PortableChild[];
  markDefs?: PortableMarkDef[];
  listItem?: string;
  level?: number;
  alt?: string;
  asset?: { url?: string };
  url?: string;
  embedUrl?: string;
  videoId?: string;
  title?: string;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttribute = (value: string): string => escapeHtml(value).replace(/`/g, '&#96;');

const normalizeText = (value: string): string => value.replace(/\r?\n/g, '\n');

const applyMarks = (text: string, marks: string[] | undefined, markDefs: PortableMarkDef[] | undefined) => {
  if (!Array.isArray(marks) || marks.length === 0) return text;
  return marks.reduce((acc, mark) => {
    if (!mark) return acc;
    if (mark === 'strong' || mark === 'em' || mark === 'underline' || mark === 'code') {
      return acc;
    }
    const def = markDefs?.find((item) => item?._key === mark);
    if (!def) return acc;
    if (def._type === 'link' || def.href || def.url) {
      const href = typeof def.href === 'string' ? def.href : def.url ?? '';
      if (!href) return acc;
      const absolute = getAbsoluteUrl(href);
      return `<a href="${escapeAttribute(absolute)}">${acc}</a>`;
    }
    return acc;
  }, text);
};

const renderChild = (child: PortableChild, markDefs: PortableMarkDef[] | undefined) => {
  if (!child) return '';
  if (child._type === 'break') return '<br />';
  const text = typeof child.text === 'string' ? normalizeText(child.text) : '';
  if (!text) return '';
  const escaped = escapeHtml(text).replace(/\n/g, '<br />');
  return applyMarks(escaped, child.marks, markDefs);
};

const renderChildren = (block: PortableBlock) => {
  const markDefs = Array.isArray(block?.markDefs) ? block.markDefs : [];
  const spans = Array.isArray(block?.children) ? block.children : [];
  return spans.map((child) => renderChild(child, markDefs)).join('');
};

const wrap = (tag: string, content: string) => `<${tag}>${content}</${tag}>`;

const renderParagraph = (block: PortableBlock) => {
  const content = renderChildren(block).trim();
  if (!content) return '';
  return wrap('p', content);
};

const renderHeading = (block: PortableBlock, level: 'h2' | 'h3' | 'h4') => {
  const content = renderChildren(block).trim();
  if (!content) return '';
  return wrap(level, content);
};

const renderListBuffer = (items: string[], type: 'bullet' | 'number') => {
  if (!items.length) return '';
  const joined = items
    .map((item, index) => {
      if (!item) return '';
      const prefix = type === 'number' ? `${index + 1}. ` : '・';
      return `${prefix}${item}`;
    })
    .filter(Boolean)
    .join('<br />');
  if (!joined) return '';
  return wrap('p', joined);
};

const extractYoutubeId = (source: PortableBlock): string | null => {
  if (!source) return null;
  if (typeof source.videoId === 'string' && source.videoId.trim()) {
    return source.videoId.trim();
  }
  const url = source.url || source.embedUrl || '';
  if (typeof url !== 'string' || !url.trim()) return null;
  const trimmed = url.trim();
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/i,
    /v=([a-zA-Z0-9_-]{6,})/i,
    /embed\/([a-zA-Z0-9_-]{6,})/i
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

const renderYoutube = (block: PortableBlock) => {
  const videoId = extractYoutubeId(block);
  if (!videoId) return '';
  const src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
  return `<iframe src="${escapeAttribute(src)}"></iframe>`;
};

const renderImageBlock = (block: PortableBlock) => {
  const url = buildImageUrl(block, { width: 1200 });
  if (!url) return '';
  const alt = typeof block?.alt === 'string' ? block.alt : '';
  return wrap('p', `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}" />`);
};

export const portableTextToHtml = (value: unknown): string => {
  if (!Array.isArray(value)) return '';
  const blocks = value as PortableBlock[];
  const parts: string[] = [];
  let listBuffer: string[] = [];
  let listType: 'bullet' | 'number' | null = null;

  const flushList = () => {
    if (!listType || listBuffer.length === 0) return;
    const rendered = renderListBuffer(listBuffer, listType);
    if (rendered) {
      parts.push(rendered);
    }
    listBuffer = [];
    listType = null;
  };

  for (const block of blocks) {
    if (!block) continue;
    if (block.listItem === 'bullet' || block.listItem === 'number') {
      const content = renderChildren(block).trim();
      if (!content) continue;
      const type = block.listItem === 'number' ? 'number' : 'bullet';
      if (listType && type !== listType) {
        flushList();
      }
      listType = type;
      listBuffer.push(content);
      continue;
    }

    flushList();

    if (block._type === 'block') {
      const style = block.style || 'normal';
      if (style === 'h2' || style === 'h3' || style === 'h4') {
        const rendered = renderHeading(block, style);
        if (rendered) parts.push(rendered);
        continue;
      }
      const rendered = renderParagraph(block);
      if (rendered) parts.push(rendered);
      continue;
    }

    if (block._type === 'image') {
      const rendered = renderImageBlock(block);
      if (rendered) parts.push(rendered);
      continue;
    }

    if (block._type === 'youtube' || block._type === 'video' || block._type === 'videoEmbed') {
      const rendered = renderYoutube(block);
      if (rendered) parts.push(rendered);
      continue;
    }
  }

  flushList();
  return parts.join('');
};

export const portableTextToPlain = (value: unknown): string => {
  if (!Array.isArray(value)) return '';
  const blocks = value as PortableBlock[];
  const texts: string[] = [];
  let listBuffer: string[] = [];
  let listType: 'bullet' | 'number' | null = null;

  const flushList = () => {
    if (!listType || listBuffer.length === 0) return;
    const joined = listBuffer
      .map((item, index) => {
        if (listType === 'number') {
          return `${index + 1}. ${item}`;
        }
        return `・${item}`;
      })
      .join(' ');
    if (joined) texts.push(joined);
    listBuffer = [];
    listType = null;
  };

  for (const block of blocks) {
    if (!block) continue;
    if (block.listItem === 'bullet' || block.listItem === 'number') {
      const content = renderChildren(block)
        .replace(/<br \/>/g, ' ')
        .replace(/<[^>]+>/g, '')
        .trim();
      if (!content) continue;
      const type = block.listItem === 'number' ? 'number' : 'bullet';
      if (listType && listType !== type) {
        flushList();
      }
      listType = type;
      listBuffer.push(content);
      continue;
    }

    flushList();

    if (block._type === 'block') {
      const content = renderChildren(block)
        .replace(/<br \/>/g, ' ')
        .replace(/<[^>]+>/g, '')
        .trim();
      if (content) texts.push(content);
      continue;
    }

    if (block._type === 'image') {
      const alt = typeof block.alt === 'string' ? block.alt.trim() : '';
      if (alt) texts.push(alt);
      continue;
    }
  }

  flushList();

  return texts.join(' ').replace(/\s+/g, ' ').trim();
};
