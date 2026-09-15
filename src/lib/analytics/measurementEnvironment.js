// src/lib/analytics/measurementEnvironment.js
//
// 「この環境の閲覧を GA4 に送ってよいか」を判定する純粋関数。
//
// Vercel のプレビューデプロイ（*.vercel.app）やローカル開発でも同じビルドが動くため、
// 何もしないと本番プロパティに開発中のアクセスが混ざる。
// 本番ホスト名以外では計測しない。

/** 計測対象の本番ホスト名（www は本番へ301しているが念のため許可する） */
export const MEASURED_HOSTNAMES = ['noutorebiyori.com', 'www.noutorebiyori.com'];

/**
 * @param {string | undefined | null} hostname location.hostname
 * @returns {boolean} 計測してよいなら true
 */
export const shouldMeasureHostname = (hostname) =>
  typeof hostname === 'string' && MEASURED_HOSTNAMES.includes(hostname.toLowerCase());
