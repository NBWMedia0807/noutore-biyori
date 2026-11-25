// src/lib/staging-host.js
//
// 試験ホスト（*.workers.dev）だけの制御。本番ホストでは何もしない。
// クライアント（AdSense の押し込み停止）とサーバー（noindex・広告ヒント除去）の
// 両方から使うので、$lib/server には置かない。
//
// 方針:
// - canonical / sitemap / RSS の URL は SITE.url（https://noutorebiyori.com）のまま。
// - *.workers.dev の応答には X-Robots-Tag: noindex を付け、robots.txt は Disallow。
// - AdSense の <ins> とパブリッシャー ID は HTML に残す（タグの存在確認用）。
//   adsbygoogle.js の取得と push はしない。未承認ホストへの広告リクエストを出さない。

export const STAGING_ROBOTS_TAG = 'noindex';

/** 試験ホストの robots.txt。Sitemap 行は付けない（本番 sitemap へ誘導しない）。 */
export const STAGING_ROBOTS_TXT = `User-agent: *
Disallow: /
`;

const AD_NETWORK_HINT =
  /(?:pagead2\.googlesyndication\.com|googlesyndication\.com|doubleclick\.net|googletagservices\.com|adservice\.google(?:\.com|\.co\.jp)?)/i;

/**
 * @param {string | undefined | null} hostname
 * @returns {boolean}
 */
export const isWorkersDevHost = (hostname) => {
  if (typeof hostname !== 'string') return false;
  const host = hostname.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
  if (!host || host.includes('/')) return false;
  return host === 'workers.dev' || host.endsWith('.workers.dev');
};

/**
 * *.workers.dev の応答に X-Robots-Tag: noindex を付ける。それ以外はそのまま返す。
 * @param {Response} response
 * @param {string | undefined | null} hostname
 */
export const applyWorkersDevRobots = (response, hostname) => {
  if (!response || !isWorkersDevHost(hostname)) return response;
  try {
    response.headers.set('x-robots-tag', STAGING_ROBOTS_TAG);
    return response;
  } catch {
    const copy = new Response(response.body, response);
    copy.headers.set('x-robots-tag', STAGING_ROBOTS_TAG);
    return copy;
  }
};

/**
 * app.html の広告ドメイン向け preconnect / dns-prefetch / preload を外す。
 * 実行される adsbygoogle.js の script が残っていた場合は type=text/plain にして取得させない。
 * <ins class="adsbygoogle"> は残す。
 * @param {string} html
 */
export const stripStagingAdNetworkHints = (html) => {
  if (typeof html !== 'string' || html.length === 0) return html;
  const withoutHints = html.replace(/<link\b[^>]*>/gi, (tag) =>
    AD_NETWORK_HINT.test(tag) ? '' : tag
  );
  return withoutHints.replace(
    /<script\b([^>]*?)\ssrc=(["'])([^"']*adsbygoogle\.js[^"']*)\2([^>]*)>\s*<\/script>/gi,
    (full, before, quote, src, after) => {
      if (/type\s*=\s*(["'])text\/plain\1/i.test(full)) return full;
      return `<script type="text/plain" data-adsense-staging="withheld" data-src=${quote}${src}${quote}${before}${after}></script>`;
    }
  );
};
