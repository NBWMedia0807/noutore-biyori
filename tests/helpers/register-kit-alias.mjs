// tests/helpers/register-kit-alias.mjs
//
// `node --import ./tests/helpers/register-kit-alias.mjs` で読み込むと
// `$lib/...` を解決できるようになる（詳細は kit-alias-loader.mjs のコメント）。

import { register } from 'node:module';

register('./kit-alias-loader.mjs', import.meta.url);
