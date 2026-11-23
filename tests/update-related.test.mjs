import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import {
  CATEGORY_WINDOW,
  MAX_CATEGORY_KEYS,
  MAX_DOCUMENT_IDS,
  REFERENCING_LIMIT,
  RELATED_LIMIT,
  TARGET_DOCS_QUERY,
  categoryMemberQuery,
  categoryWindowQuery,
  extractUpdateTargets,
  handleUpdateRelatedPost,
  referencingQuery,
  relatedForDocument,
} from '../src/lib/server/update-related.js';

const SECRET = 'test-secret';
const ENV = {
  SANITY_REVALIDATE_SECRET: SECRET,
  SANITY_WRITE_TOKEN: 'write-token',
  SANITY_PROJECT_ID: 'project',
  SANITY_DATASET: 'production',
  SANITY_API_VERSION: '2024-01-01',
};

// update-related は Sanity client 以外の通信をしない（自己 fetch を含む）。
const realFetch = globalThis.fetch;
let fetchCalls = 0;
beforeEach(() => {
  fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('network is not allowed');
  };
});
afterEach(() => {
  globalThis.fetch = realFetch;
  assert.equal(fetchCalls, 0);
});

const visible = (doc) =>
  !doc._id.startsWith('drafts.') &&
  doc.isRepublished !== true &&
  doc.reviewStatus !== 'retracted';

const inCategory = (doc, keyType, key) =>
  keyType === 'ref'
    ? doc.categoryRef === key
    : !doc.categoryRef && (doc.slug === key || doc.slug.startsWith(`${key}/`));

const descending = (left, right) => (left < right ? 1 : left > right ? -1 : 0);
const newestFirst = (left, right) =>
  descending(left.publishedAt, right.publishedAt) || descending(left._id, right._id);

// GROQ は実行せず、モジュールが出すクエリごとに同じ意味の結果を返す。想定外のクエリは落とす。
const createClient = (docs, { failCommits = 0 } = {}) => {
  const commits = [];
  const queries = [];
  const writes = [];
  let failuresLeft = failCommits;

  const answer = (query, params) => {
    if (query === TARGET_DOCS_QUERY) return docs.filter((doc) => params.ids.includes(doc._id));
    for (const keyType of ['ref', 'prefix', undefined]) {
      if (query === referencingQuery(keyType)) {
        return docs
          .filter(visible)
          .filter((doc) => doc.relatedRefs?.includes(params.id))
          .filter((doc) => !keyType || !inCategory(doc, keyType, params.categoryKey))
          .sort(newestFirst)
          .slice(0, REFERENCING_LIMIT);
      }
      if (!keyType) continue;
      const members = () =>
        docs.filter(visible).filter((doc) => inCategory(doc, keyType, params.categoryKey));
      if (query === categoryWindowQuery(keyType)) {
        return members().sort(newestFirst).slice(0, CATEGORY_WINDOW);
      }
      if (query === categoryMemberQuery(keyType)) {
        return members().filter((doc) => params.ids.includes(doc._id));
      }
    }
    throw new Error(`unexpected query: ${query}`);
  };

  return {
    commits,
    queries,
    writes,
    async fetch(query, params) {
      const rows = structuredClone(answer(query, params));
      queries.push({ query, params, size: rows.length });
      return rows;
    },
    transaction() {
      const batch = [];
      const tx = {
        patch(id, build) {
          const builder = {
            set(fields) {
              batch.push({ id, fields });
              return builder;
            },
          };
          build(builder);
          return tx;
        },
        async commit() {
          if (failuresLeft > 0) {
            failuresLeft -= 1;
            throw new Error('commit failed');
          }
          commits.push(batch.map((patch) => patch.id));
          writes.push(...batch);
          for (const { id, fields } of batch) {
            docs.find((doc) => doc._id === id).relatedRefs = fields.relatedArticles.map(
              (ref) => ref._ref
            );
          }
        },
      };
      return tx;
    },
  };
};

// index 0 が一番新しい。
const docsFor = (category, count) =>
  Array.from({ length: count }, (_, index) => ({
    _id: `${category}-${index}`,
    _type: 'quiz',
    slug: `${category}/article/${index}`,
    categoryRef: category,
    publishedAt: new Date(Date.UTC(2026, 5, 1) - index * 86_400_000).toISOString(),
    reviewStatus: 'approved',
  }));

// 更新済みのカテゴリを作る。
const settle = (docs) => {
  const ids = docs.map((doc) => doc._id);
  for (const doc of docs) {
    doc.relatedRefs = ids.filter((id) => id !== doc._id).slice(0, RELATED_LIMIT);
  }
  return docs;
};

const assertNewestFive = (docs) => {
  const ids = docs.map((doc) => doc._id);
  for (const doc of docs) {
    assert.deepEqual(
      doc.relatedRefs,
      ids.filter((id) => id !== doc._id).slice(0, RELATED_LIMIT),
      doc._id
    );
  }
};

const post = (
  client,
  body,
  { env = ENV, headers = { 'x-sanity-webhook-secret': SECRET }, search = '', raw } = {}
) => {
  const request = new Request(`https://noutorebiyori.com/api/update-related${search}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: raw ?? JSON.stringify(body),
  });
  return handleUpdateRelatedPost(
    {
      request,
      url: new URL(request.url),
      platform: {
        ctx: { waitUntil: () => assert.fail('work must finish inside the request') },
      },
    },
    { env, createClient: () => client }
  );
};

const publish = async (client, body) => {
  const response = await post(client, body);
  assert.equal(response.status, 200);
  return response.json();
};

test('category queries keep the filters, the bound and the second sort key', () => {
  assert.ok(CATEGORY_WINDOW > RELATED_LIMIT && CATEGORY_WINDOW <= 16);
  for (const keyType of ['ref', 'prefix']) {
    for (const build of [categoryWindowQuery, categoryMemberQuery, referencingQuery]) {
      const query = build(keyType);
      assert.ok(query.includes('!(_id in path("drafts.**"))'));
      assert.ok(query.includes('isRepublished != true'));
      assert.ok(query.includes('coalesce(reviewStatus, "approved") != "retracted"'));
    }
    const window = categoryWindowQuery(keyType);
    assert.ok(window.includes(`order(publishedAt desc, _id desc) [0...${CATEGORY_WINDOW}]`));
    const referencing = referencingQuery(keyType);
    assert.ok(referencing.includes(`order(publishedAt desc, _id desc) [0...${REFERENCING_LIMIT}]`));
  }
  assert.match(categoryWindowQuery('ref'), /category\._ref == \$categoryKey/);
  assert.match(referencingQuery('ref'), /coalesce\(category\._ref, ""\) != \$categoryKey/);
  assert.doesNotMatch(referencingQuery(), /\$categoryKey/);
});

test('related refs are the five newest siblings other than the document itself', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const refs = (id, list = ids) => relatedForDocument(id, list).map((ref) => ref._ref);
  assert.deepEqual(refs('a'), ['b', 'c', 'd', 'e', 'f']);
  assert.deepEqual(refs('b'), ['a', 'c', 'd', 'e', 'f']);
  assert.deepEqual(refs('g'), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(refs('only', ['only']), []);
});

test('missing or wrong secret is rejected before any query', async () => {
  const client = createClient(docsFor('catA', 2));
  const body = { _id: 'catA-0', _type: 'quiz' };

  assert.equal((await post(client, body, { env: {} })).status, 500);
  assert.equal((await post(client, body, { headers: {} })).status, 401);
  const wrongHeader = { 'x-sanity-webhook-secret': 'wrong' };
  assert.equal((await post(client, body, { headers: wrongHeader })).status, 401);
  assert.equal((await post(client, body, { headers: {}, search: '?secret=wrong' })).status, 401);
  assert.equal(client.queries.length, 0);
  assert.equal(client.commits.length, 0);
});

test('header, query and the fallback secret variable are all accepted', async () => {
  const body = { _id: 'catA-0', _type: 'quiz' };
  const accepted = [
    {},
    { headers: {}, search: `?secret=${SECRET}` },
    { env: { ...ENV, SANITY_REVALIDATE_SECRET: '', VERCEL_REVALIDATE_TOKEN: SECRET } },
  ];
  for (const options of accepted) {
    const client = createClient(docsFor('catA', 2));
    assert.equal((await post(client, body, options)).status, 200);
  }
});

test('missing configuration and bad bodies do not write', async () => {
  const client = createClient(docsFor('catA', 2));
  const body = { _id: 'catA-0', _type: 'quiz' };
  for (const name of ['SANITY_WRITE_TOKEN', 'SANITY_PROJECT_ID']) {
    assert.equal((await post(client, body, { env: { ...ENV, [name]: '' } })).status, 500);
  }
  for (const raw of ['{', '[]', 'null']) {
    assert.equal((await post(client, null, { raw })).status, 400);
  }
  assert.equal(client.queries.length, 0);
});

test('non-quiz and id-less payloads, including old continuation jobs, do nothing', async () => {
  const client = createClient(docsFor('catA', 2));
  assert.match((await publish(client, { _type: 'author', _id: 'author-1' })).message, /Skipped/);
  assert.equal((await publish(client, {})).skipped, true);
  const oldJob = { _updateRelated: { v: 1, phase: 'page', keyType: 'ref', categoryKey: 'catA' } };
  assert.equal((await publish(client, oldJob)).skipped, true);
  assert.equal(client.queries.length, 0);
});

test('a publish updates only the category window before it responds', async () => {
  const catA = docsFor('catA', 40);
  const catB = docsFor('catB', 4);
  const client = createClient([...catA, ...catB]);

  const body = await publish(client, { _id: 'catA-0', _type: 'quiz' });

  assert.equal(body.updated, CATEGORY_WINDOW);
  assert.equal(client.commits.length, 1);
  assertNewestFive(catA.slice(0, CATEGORY_WINDOW));
  for (const doc of [...catA.slice(CATEGORY_WINDOW), ...catB]) {
    assert.equal(doc.relatedRefs, undefined, doc._id);
  }
  assert.ok(client.queries.every(({ size }) => size <= CATEGORY_WINDOW));
  for (const { fields } of client.writes) assert.deepEqual(Object.keys(fields), ['relatedArticles']);
});

test('the same related refs are not written again', async () => {
  const client = createClient(settle(docsFor('catA', 8)));
  assert.equal((await publish(client, { _id: 'catA-0', _type: 'quiz' })).updated, 0);
  assert.equal(client.commits.length, 0);
});

test('only documents whose value differs are written', async () => {
  const catA = settle(docsFor('catA', 8));
  catA[3].relatedRefs = ['catA-7'];
  const client = createClient(catA);
  await publish(client, { _id: 'catA-0', _type: 'quiz' });
  assert.deepEqual(client.commits, [['catA-3']]);
});

test('a published document outside the window is fixed without touching its neighbours', async () => {
  const catA = docsFor('catA', 40);
  settle(catA.slice(0, CATEGORY_WINDOW));
  const client = createClient(catA);

  await publish(client, { _id: 'catA-30', _type: 'quiz' });

  assert.deepEqual(client.commits, [['catA-30']]);
  assert.deepEqual(catA[30].relatedRefs, ['catA-0', 'catA-1', 'catA-2', 'catA-3', 'catA-4']);
});

test('every publish starts from the newest documents again', async () => {
  const catA = settle(docsFor('catA', 100));
  const client = createClient(catA);
  for (const day of [2, 3, 4]) {
    const doc = {
      _id: `new-${day}`,
      _type: 'quiz',
      slug: `catA/article/new-${day}`,
      categoryRef: 'catA',
      publishedAt: new Date(Date.UTC(2026, 5, day)).toISOString(),
    };
    catA.unshift(doc);
    await publish(client, { _id: doc._id, _type: 'quiz' });
    assertNewestFive(catA.slice(0, CATEGORY_WINDOW));
  }
});

test('a failed commit returns 500 and the next webhook redoes the same work', async () => {
  const catA = docsFor('catA', 8);
  const client = createClient(catA, { failCommits: 1 });
  const body = { _id: 'catA-0', _type: 'quiz' };

  assert.equal((await post(client, body)).status, 500);
  assert.equal(client.commits.length, 0);
  assert.equal((await post(client, body)).status, 200);
  assertNewestFive(catA);
});

test('the same publishedAt is ordered by _id descending', async () => {
  const docs = ['b', 'g', 'a', 'f', 'c', 'e', 'd'].map((id) => ({
    _id: id,
    _type: 'quiz',
    slug: `catA/${id}`,
    categoryRef: 'catA',
    publishedAt: '2026-11-22',
  }));
  await publish(createClient(docs), { _id: 'a', _type: 'quiz' });
  const refs = Object.fromEntries(docs.map((doc) => [doc._id, doc.relatedRefs]));
  assert.deepEqual(refs.a, ['g', 'f', 'e', 'd', 'c']);
  assert.deepEqual(refs.g, ['f', 'e', 'd', 'c', 'b']);
});

test('previous category is updated without searching for referencing documents', async () => {
  for (const slot of ['previous', 'before']) {
    const catA = docsFor('catA', 7);
    const catB = docsFor('catB', 7);
    const client = createClient([...catA, ...catB]);

    await publish(client, {
      _id: 'catA-0',
      _type: 'quiz',
      [slot]: { _type: 'quiz', category: { _ref: 'catB' } },
    });

    assertNewestFive(catA);
    assertNewestFive(catB);
    assert.equal(client.commits.length, 1);
    assert.ok(!client.queries.some(({ query }) => query === referencingQuery('ref')));
  }
});

const moveNewestFromAToB = () => {
  const catA = settle(docsFor('catA', 40));
  const catB = settle(docsFor('catB', 8));
  const moved = catA[0];
  moved.categoryRef = 'catB';
  moved.publishedAt = '2026-07-01T00:00:00.000Z';
  return { oldSide: catA.slice(1), newSide: [moved, ...catB], docs: [...catA, ...catB] };
};

test('without previous, the old category is found through referencing documents', async () => {
  const { oldSide, newSide, docs } = moveNewestFromAToB();
  const client = createClient(docs);

  await publish(client, { _id: 'catA-0', _type: 'quiz' });

  assertNewestFive(oldSide.slice(0, CATEGORY_WINDOW));
  assertNewestFive(newSide);
  // ウィンドウより古い参照元は直さない。
  assert.ok(oldSide[20].relatedRefs.includes('catA-0'));
});

test('a previous without a category still searches referencing documents', async () => {
  const { oldSide, docs } = moveNewestFromAToB();
  const previous = { _type: 'quiz', slug: { current: 'catA/article/0' } };
  await publish(createClient(docs), { _id: 'catA-0', _type: 'quiz', previous });
  assertNewestFive(oldSide.slice(0, CATEGORY_WINDOW));
});

test('referencing siblings in the current category do not hide the old category', async () => {
  const catA = settle(docsFor('catA', 30));
  const old = { ...docsFor('catB', 1)[0], publishedAt: '2020-01-01', relatedRefs: ['catA-0'] };
  await publish(createClient([...catA, old]), { _id: 'catA-0', _type: 'quiz' });
  assert.deepEqual(old.relatedRefs, []);
});

test('moving into an empty category clears refs to the old category', async () => {
  const catA = settle(docsFor('catA', 4));
  catA[0].categoryRef = 'catEmpty';
  await publish(createClient(catA), { _id: 'catA-0', _type: 'quiz' });
  assert.deepEqual(catA[0].relatedRefs, []);
  assertNewestFive(catA.slice(1));
});

test('the stored category wins over an incomplete payload', async () => {
  const catA = docsFor('catA', 7);
  const uncategorised = docsFor('loose', 7).map((doc) => ({
    ...doc,
    categoryRef: null,
    slug: doc.slug.replace('loose/', 'catA/'),
  }));
  await publish(createClient([...catA, ...uncategorised]), {
    _id: 'catA-0',
    _type: 'quiz',
    slug: { current: 'catA/article/0' },
  });
  assertNewestFive(catA);
  for (const doc of uncategorised) assert.equal(doc.relatedRefs, undefined);
});

test('documents without a category are grouped by slug prefix', async () => {
  const loose = docsFor('loose', 8).map((doc) => ({ ...doc, categoryRef: null }));
  await publish(createClient(loose), { _id: 'loose-0', _type: 'quiz' });
  assertNewestFive(loose);
});

test('retracted, republished and draft documents are neither written nor linked', async () => {
  const catA = settle(docsFor('catA', 10));
  catA[0].reviewStatus = 'retracted';
  catA[1].isRepublished = true;
  catA[2]._id = 'drafts.catA-2';
  const untouched = structuredClone(catA.slice(0, 3));

  await publish(createClient(catA), { _id: 'catA-0', _type: 'quiz' });

  assertNewestFive(catA.slice(3));
  assert.deepEqual(catA.slice(0, 3), untouched);
});

test('a deleted document still refreshes the category in its payload', async () => {
  const catA = docsFor('catA', 6);
  const client = createClient(catA);
  await publish(client, { _id: 'gone', _type: 'quiz', category: { _ref: 'catA' } });
  assertNewestFive(catA);
});

test('work per webhook is bounded', async () => {
  const groups = Array.from({ length: 10 }, (_, index) => docsFor(`cat${index}`, 30));
  const client = createClient(groups.flat());

  await publish(client, { ids: { updated: groups.map((docs) => docs[20]._id) } });

  assert.ok(client.queries.length <= 1 + MAX_DOCUMENT_IDS + 2 * MAX_CATEGORY_KEYS);
  assert.equal(client.commits.length, 1);
  assert.ok(client.writes.length <= CATEGORY_WINDOW * MAX_CATEGORY_KEYS + MAX_DOCUMENT_IDS);
});

test('extractUpdateTargets keeps quiz categories and ignores other types', () => {
  const quiz = extractUpdateTargets(
    {
      _type: 'quiz',
      _id: 'drafts.doc-1',
      category: { _ref: 'catA' },
      previous: { _type: 'quiz', category: { _ref: 'catB' }, slug: { current: 'old/a' } },
    },
    new Headers({ 'sanity-document-id': 'doc-9' })
  );
  assert.deepEqual(quiz.keys, [
    { keyType: 'ref', categoryKey: 'catA' },
    { keyType: 'ref', categoryKey: 'catB' },
  ]);
  assert.deepEqual(quiz.previousKeys, [{ keyType: 'ref', categoryKey: 'catB' }]);
  assert.equal(quiz.hasPreviousCategory, true);
  assert.deepEqual(quiz.ids, ['doc-1', 'doc-9']);

  const other = extractUpdateTargets({ _type: 'category', _id: 'cat' }, new Headers());
  assert.equal(other.skip, true);
});
