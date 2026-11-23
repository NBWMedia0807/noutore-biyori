export const resizeSanityThumbnail = (source) => {
  if (!source) return source;
  const absolute = source.startsWith('//') ? `https:${source}` : source;
  if (!URL.canParse(absolute)) return source;
  const url = new URL(absolute);
  if (
    url.hostname !== 'cdn.sanity.io' ||
    !['https:', 'http:'].includes(url.protocol) ||
    !url.pathname.startsWith('/images/')
  ) {
    return source;
  }

  // Request width alone so existing size and crop parameters cannot constrain it.
  for (const parameter of ['h', 'rect', 'fit', 'crop', 'min-w', 'max-w', 'min-h', 'max-h', 'dpr']) {
    url.searchParams.delete(parameter);
  }
  url.searchParams.set('w', '1200');
  if (!url.searchParams.has('fm')) url.searchParams.set('auto', 'format');
  return url.href;
};
