import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SanityClient } from '@sanity/client';
import { GET } from '../src/routes/rss/merkystyle.xml/+server.ts';

const cdn = 'https://cdn.sanity.io/images/quljge22/production';
const image = (name, width, height) => ({
  asset: {
    _id: `image-${name}-${width}x${height}-png`,
    extension: 'png',
    metadata: { dimensions: { width, height } },
  },
});

test('Merkystyle は記事・関連のサムネイルを1200pxで配信する', async (t) => {
  const external = 'https://example.com/thumbnail.png?w=300';
  t.mock.method(SanityClient.prototype, 'fetch', async () => [{
    slug: 'width-test',
    title: '幅の検証',
    publishedAt: new Date().toISOString(),
    mainImage: image('toosmall', 400, 225),
    problemImage: image('eligible', 800, 450),
    problemDescription: '問題文。',
    related: [
      { slug: 'asset', title: '画像付き', mainImage: image('related', 640, 360) },
      {
        slug: 'explicit',
        title: 'Sanity URL 指定',
        thumbnailUrl: `${cdn}/explicit-1280x720.png?w=300&h=200&rect=1,2,300,200&fit=max`,
      },
      { slug: 'external', title: '外部 URL 指定', thumbnailUrl: external },
    ],
  }]);

  const response = await GET({ setHeaders() {} });
  assert.equal(response.status, 200);
  const xml = await response.text();
  const [item] = xml.match(/<item>[\s\S]*?<\/item>/);
  const thumbnail = (name) => `${cdn}/${name}.png?w=1200&amp;auto=format`;
  assert.equal(item.match(/<media:thumbnail url="([^"]+)"/)?.[1], thumbnail('eligible-800x450'));
  assert.equal(
    item.match(/<enclosure url="([^"]+)"/)?.[1],
    `${cdn}/eligible-800x450.png?w=640&amp;auto=format`
  );
  const expected = [thumbnail('related-640x360'), thumbnail('explicit-1280x720'), external];
  assert.deepEqual([...item.matchAll(/<relatedlink [^>]* thumbnail="([^"]+)"/g)].map((m) => m[1]), expected);
  const relatedHtml = item.split('<h3>さらにもう一問！</h3>')[1];
  assert.deepEqual([...relatedHtml.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]), expected);
  assert.match(item, /<title>幅の検証<\/title>/);
  assert.match(item, /<description>問題文。<\/description>/);
});
