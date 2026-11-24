// 旧URL /privacy → /privacy-policy の転送先を決める（src/routes/privacy/+page.server.js から使う）。
// - サーバーの load では event.url.hash を読むと SvelteKit が例外を投げる（ハッシュはサーバーに届かない）。
//   以前は url.hash を読んでいたため /privacy が 500 になっていた。ハッシュはブラウザがリダイレクト後も引き継ぐ。
// - trailingSlash は既定の 'never'。/privacy/ は SvelteKit が先に /privacy へ 308 するので、
//   転送先は常にスラッシュなしの /privacy-policy にして二重リダイレクトを避ける。クエリはそのまま渡す。
export const PRIVACY_POLICY_PATH = '/privacy-policy';

/** @param {URL} url */
export const resolvePrivacyRedirect = (url) => `${PRIVACY_POLICY_PATH}${url.search}`;
