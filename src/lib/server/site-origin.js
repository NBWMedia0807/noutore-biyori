// src/lib/server/site-origin.js
//
// 本番ドメインの基点 URL を決める（SvelteKit 非依存）。
// IndexNow やキャッシュパージでは、*.vercel.app や *.workers.dev ではなく
// 本番ドメイン（noutorebiyori.com）の URL を使う必要がある。

export const DEFAULT_SITE_ORIGIN = 'https://noutorebiyori.com';

/**
 * PUBLIC_SITE_URL（任意）から https のオリジンを返す。不正・未設定なら既定値。
 * @param {string | undefined | null} value
 * @param {string} [fallback]
 */
export const resolveSiteOrigin = (value, fallback = DEFAULT_SITE_ORIGIN) => {
  if (typeof value === 'string' && value.trim()) {
    try {
      const url = new URL(value.trim());
      if (url.protocol === 'https:') return url.origin;
    } catch {
      // 不正な値は無視して既定値へ
    }
  }
  return fallback;
};

/**
 * IndexNow に送る URL の基点。IndexNow は body の host と urlList のホストが一致しないと
 * 拒否するため、host（SITE.url）と同じホストの場合だけ PUBLIC_SITE_URL を採用する。
 */
export const resolveIndexNowBase = (publicSiteUrl, siteUrl = DEFAULT_SITE_ORIGIN) => {
  const siteOrigin = resolveSiteOrigin(siteUrl);
  const candidate = resolveSiteOrigin(publicSiteUrl, siteOrigin);
  return new URL(candidate).hostname === new URL(siteOrigin).hostname ? candidate : siteOrigin;
};
