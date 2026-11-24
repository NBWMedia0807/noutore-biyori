import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SITE_AD_USAGE,
  FOOTER_AD_TEXT,
  FOOTER_TEXT_ADSENSE_ONLY,
  FOOTER_TEXT_AFFILIATE_AND_ADSENSE,
  AD_SLOT_LABEL,
  ARTICLE_AFFILIATE_TEXT,
  ARTICLE_SPONSORED_TEXT,
  ARTICLE_PROVIDED_TEXT,
  ARTICLE_PR_FALLBACK_TEXT,
  getFooterAdText,
  formatSponsorName,
  isAffiliateUrl,
  containsAffiliateLink,
  resolveArticleAdDisclosure,
} from '../src/lib/config/ad-disclosure.js';

test('文言は法務文案どおり（一字一句）', () => {
  assert.equal(
    FOOTER_TEXT_AFFILIATE_AND_ADSENSE,
    '当サイトはアフィリエイト広告およびGoogle AdSenseを利用しています。広告リンクを経由した購入や申込みなどにより、当社が報酬を受け取る場合があります。'
  );
  assert.equal(FOOTER_TEXT_ADSENSE_ONLY, '当サイトはGoogle AdSenseによる広告を掲載しています。');
  assert.equal(AD_SLOT_LABEL, '広告');
  assert.equal(ARTICLE_AFFILIATE_TEXT, '広告：この記事にはアフィリエイト広告が含まれます。');
  assert.equal(
    ARTICLE_SPONSORED_TEXT('A'),
    'PR（広告）：この記事はA社の依頼を受けて制作しました。'
  );
  assert.equal(
    ARTICLE_PROVIDED_TEXT('A'),
    'PR（広告）：この記事はA社から商品の提供を受けて作成しました。'
  );
});

test('脳トレ日和は AdSense のみ → フッターは AdSense のみの文', () => {
  assert.equal(SITE_AD_USAGE, 'adsense');
  assert.equal(FOOTER_AD_TEXT, FOOTER_TEXT_ADSENSE_ONLY);
});

test('使用状況でフッター文が切り替わる', () => {
  assert.equal(getFooterAdText('adsense'), FOOTER_TEXT_ADSENSE_ONLY);
  assert.equal(getFooterAdText('affiliate+adsense'), FOOTER_TEXT_AFFILIATE_AND_ADSENSE);
  assert.equal(getFooterAdText('none'), null);
  assert.equal(getFooterAdText('unknown'), null);
});

test('会社名の「社」を重複させない', () => {
  assert.equal(formatSponsorName('A'), 'A社');
  assert.equal(formatSponsorName(' Google '), 'Google社');
  assert.equal(formatSponsorName('A社'), 'A社');
  assert.equal(formatSponsorName('株式会社A'), '株式会社A');
  assert.equal(formatSponsorName('A株式会社'), 'A株式会社');
  assert.equal(formatSponsorName('一般社団法人A'), '一般社団法人A');
  assert.equal(formatSponsorName('A財団'), 'A財団');
  assert.equal(formatSponsorName(''), null);
  assert.equal(formatSponsorName(null), null);
  assert.equal(
    ARTICLE_SPONSORED_TEXT('株式会社A'),
    'PR（広告）：この記事は株式会社Aの依頼を受けて制作しました。'
  );
  assert.equal(ARTICLE_SPONSORED_TEXT(''), null);
});

test('アフィリエイトURLの判定', () => {
  const yes = [
    'https://px.a8.net/svt/ejp?a8mat=xxx',
    'https://af.moshimo.com/af/c/click?a_id=1',
    'https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=1',
    'https://h.accesstrade.net/sp/cc?rk=1',
    'https://t.afi-b.com/visit.php?guid=1',
    'https://www.felmat.net/fmcl?ak=1',
    'https://www.rentracks.jp/adx/r.html?idx=1',
    'https://click.linksynergy.com/deeplink?id=1',
    'https://hb.afl.rakuten.co.jp/hgc/xxx/',
    'https://amzn.to/abc',
    'https://www.amazon.co.jp/dp/B000?tag=foo-22',
    'https://ad.presco.asia/cp/1',
    'https://www.tcs-asp.net/alink?AC=1',
    '//px.a8.net/svt/ejp',
  ];
  for (const u of yes) assert.equal(isAffiliateUrl(u), true, u);
  const no = [
    'https://www.amazon.co.jp/dp/B000',
    'https://noutorebiyori.com/quiz/a',
    'https://nota8.net/',
    'https://a8.net.example.com/',
    'mailto:info@a8.net',
    'not a url',
    '',
  ];
  for (const u of no) assert.equal(isAffiliateUrl(u), false, u);
});

test('Portable Text の href と本文中のURLを見る', () => {
  const pt = [
    {
      _type: 'block',
      markDefs: [{ _key: 'k', _type: 'link', href: 'https://px.a8.net/svt/ejp?a8mat=1' }],
      children: [{ _type: 'span', text: 'こちら', marks: ['k'] }],
    },
  ];
  assert.equal(containsAffiliateLink(pt), true);
  const textOnly = [
    { _type: 'block', children: [{ _type: 'span', text: '詳しくは https://amzn.to/xyz へ' }] },
  ];
  assert.equal(containsAffiliateLink(textOnly), true);
  const plain = [{ _type: 'block', children: [{ _type: 'span', text: 'マッチ棒を1本動かそう' }] }];
  assert.equal(containsAffiliateLink(plain), false);
});

test('記事の表記：フラグ優先、無ければ自動判定、none なら出さない', () => {
  const affBody = [{ _type: 'block', children: [{ _type: 'span', text: 'https://amzn.to/x' }] }];
  assert.equal(resolveArticleAdDisclosure(null), null);
  assert.equal(resolveArticleAdDisclosure({ title: 'a', body: [] }), null);
  assert.deepEqual(resolveArticleAdDisclosure({ body: affBody }), {
    type: 'affiliate',
    text: ARTICLE_AFFILIATE_TEXT,
    source: 'auto',
  });
  assert.deepEqual(resolveArticleAdDisclosure({ answerExplanation: affBody }), {
    type: 'affiliate',
    text: ARTICLE_AFFILIATE_TEXT,
    source: 'auto',
  });
  assert.equal(resolveArticleAdDisclosure({ adDisclosure: 'none', body: affBody }), null);
  assert.equal(resolveArticleAdDisclosure({ adDisclosure: 'affiliate' }).source, 'flag');
  assert.equal(
    resolveArticleAdDisclosure({ adDisclosure: 'sponsored', sponsorName: 'A' }).text,
    'PR（広告）：この記事はA社の依頼を受けて制作しました。'
  );
  assert.equal(
    resolveArticleAdDisclosure({ adDisclosure: 'provided', sponsorName: '株式会社B' }).text,
    'PR（広告）：この記事は株式会社Bから商品の提供を受けて作成しました。'
  );
  // 会社名が未入力でも PR 表記は消さない
  assert.equal(
    resolveArticleAdDisclosure({ adDisclosure: 'sponsored' }).text,
    ARTICLE_PR_FALLBACK_TEXT
  );
});
