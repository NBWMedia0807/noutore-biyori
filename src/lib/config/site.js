export const SITE = {
  name: '脳トレ日和',
  tagline: '楽しく脳を鍛える無料の脳トレサイト',
  description:
    '脳トレ日和は、間違い探しや計算問題などの脳トレクイズを通じて、毎日の習慣づくりをサポートする無料のWebメディアです。高齢者の方でも安心して楽しめるシンプルな操作性と見やすいデザインが特徴です。',
  url: 'https://noutorebiyori.com',
  language: 'ja',
  locale: 'ja_JP',
  defaultOgImage: 'https://noutorebiyori.com/logo.svg',
  twitterHandle: '@noutorebiyori',
  /** JSON-LD の author.name に使う編集部名 */
  authorName: '脳トレ日和 編集部',
  organization: {
    id: 'https://noutorebiyori.com/#organization',
    name: '脳トレ日和',
    url: 'https://noutorebiyori.com',
    /** publisher.logo に使うPNG画像（SVGより確実）*/
    logo: 'https://noutorebiyori.com/logo.png',
    logoWidth: 1024,
    logoHeight: 1024,
    sameAs: ['https://noutorebiyori.com', 'https://x.com/noutorebiyori']
  }
};

export const HOME_BREADCRUMB = {
  name: 'ホーム',
  url: SITE.url
};
