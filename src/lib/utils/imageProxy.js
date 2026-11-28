export const SANITY_IMAGE_PATH = '/images/quljge22/production/';
export const SANITY_IMAGE_FILE = /^[a-f0-9]{40}-\d+x\d+\.(?:jpg|jpeg|png|webp|gif|svg|avif)$/;

export function toProxiedSanityImageUrl(url, flag = import.meta.env?.VITE_SANITY_IMAGE_PROXY) {
  if (!['on', '1', 'true'].includes(String(flag).trim().toLowerCase())) return url;

  const prefix = `https://cdn.sanity.io${SANITY_IMAGE_PATH}`;
  if (typeof url !== 'string' || !url.startsWith(prefix)) return url;
  if (!SANITY_IMAGE_FILE.test(url.slice(prefix.length).split(/[?#]/, 1)[0])) return url;
  return `https://noutorebiyori.com/img${url.slice('https://cdn.sanity.io'.length)}`;
}
