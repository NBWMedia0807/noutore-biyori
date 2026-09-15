// tests/helpers/stubs/sanity-client.mjs
//
// `$lib/sanity/client` の差し替え版。ネットワークに触れずに
// @sanity/image-url と同じ形の URL を返すだけのビルダーを提供する。

const CDN = 'https://cdn.sanity.io/images/quljge22/production';

const toFilename = (assetId) =>
  String(assetId ?? '')
    .replace(/^image-/, '')
    .replace(/-(jpg|jpeg|png|webp)$/, '.$1');

/** urlFor(source).width(800).auto('format').url() のチェーンを再現する */
const createBuilder = (source) => {
  const params = [];
  const builder = {
    width(value) {
      params.push(`w=${value}`);
      return builder;
    },
    height(value) {
      params.push(`h=${value}`);
      return builder;
    },
    fit(value) {
      params.push(`fit=${value}`);
      return builder;
    },
    auto(value) {
      params.push(`auto=${value}`);
      return builder;
    },
    url() {
      const assetId = source?.asset?._id ?? source?.asset?._ref;
      if (!assetId) throw new Error('image asset is missing');
      const query = params.length ? `?${params.join('&')}` : '';
      return `${CDN}/${toFilename(assetId)}${query}`;
    },
  };
  return builder;
};

export const client = {
  fetch: async () => [],
};

export function urlFor(source) {
  return createBuilder(source);
}
