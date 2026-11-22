import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DOC_QUERY,
  LOCK_TTL_MS,
  PAGE_SIZE,
  categorySliceQuery,
  claimCategoryRun,
  extractUpdateTargets,
  finishCategoryRun,
  handleUpdateRelatedPost,
  relatedForDocument,
  runRelatedHead,
  runRelatedPage,
} from '../src/lib/server/update-related.js';

const SECRET = 'test-secret';
const ENV = {
  SANITY_REVALIDATE_SECRET: SECRET,
  SANITY_WRITE_TOKEN: 'write-token',
  SANITY_PROJECT_ID: 'project',
  SANITY_DATASET: 'production',
  SANITY_API_VERSION: '2024-01-01',
};

const expectedRefs = (ids, index) => {
  const picked = [];
  for (let cursor = 0; cursor < ids.length && picked.length < 5; cursor += 1) {
    if (cursor === index) continue;
    picked.push(ids[cursor]);
  }
  return picked;
};

const createMemoryCache = () => {
  const store = new Map();
  return {
    async match(request) {
      const hit = store.get(request.url);
      return hit ? hit.clone() : undefined;
    },
    async put(request, response) {
      store.set(request.url, response.clone());
    },
    async delete(request) {
      return store.delete(request.url);
    },
  };
};

const visible = (doc) =>
  doc &&
  !String(doc._id).startsWith('drafts.') &&
  doc.isRepublished !== true &&
  doc.reviewStatus !== 'retracted';

const createClient = (groups) => {
  const commits = [];
  return {
    commits,
    async fetch(query, params) {
      if (query.includes('$start...$end')) {
        const docs = (groups[params.categoryKey] || []).filter(visible);
        return docs.slice(params.start, params.end).map((doc) => ({
          ...doc,
          relatedRefs: doc.relatedRefs ? [...doc.relatedRefs] : doc.relatedRefs,
        }));
      }
      if (query.includes('"categoryRef"')) {
        for (const docs of Object.values(groups)) {
          const found = docs.find((doc) => doc._id === params.id);
          if (found) return { ...found };
        }
        return null;
      }
      if (query.includes('_id == $id')) {
        const found = (groups[params.categoryKey] || [])
          .filter(visible)
          .find((doc) => doc._id === params.id);
        return found
          ? { _id: found._id, relatedRefs: found.relatedRefs ? [...found.relatedRefs] : undefined }
          : null;
      }
      throw new Error(`unexpected query: ${query}`);
    },
    transaction() {
      const batch = [];
      const tx = {
        patch(id, build) {
          const builder = {
            set(obj) {
              batch.push({ id, relatedArticles: obj.relatedArticles });
              return builder;
            },
          };
          build(builder);
          return tx;
        },
        async commit() {
          commits.push(batch.map((patch) => patch.id));
          for (const patch of batch) {
            for (const docs of Object.values(groups)) {
              const doc = docs.find((item) => item._id === patch.id);
              if (!doc) continue;
              doc.relatedRefs = patch.relatedArticles.map((ref) => ref._ref);
            }
          }
        },
      };
      return tx;
    },
  };
};

const docsFor = (categoryKey, count, { retractedAt = -1 } = {}) =>
  Array.from({ length: count }, (_, index) => ({
    _id: `${categoryKey}-${index}`,
    _type: 'quiz',
    slug: `${categoryKey}/article/${index}`,
    categoryRef: categoryKey,
    publishedAt: new Date(Date.UTC(2026, 0, count - index)).toISOString(),
    reviewStatus: index === retractedAt ? 'retracted' : 'approved',
  }));

test('category query keeps the published-quiz filters and a bounded slice', () => {
  const query = categorySliceQuery('ref');
  assert.match(query, /drafts\.\*\*/);
  assert.match(query, /isRepublished != true/);
  assert.match(query, /retracted/);
  assert.match(query, /category\._ref == \$categoryKey/);
  assert.match(query, /\$start\.\.\.\$end/);
  assert.match(DOC_QUERY, /_id == \$id/);
  assert.equal(PAGE_SIZE <= 40, true);
});

test('related refs are the five newer siblings, and older docs share the top five', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  assert.deepEqual(
    relatedForDocument('a', ids).map((ref) => ref._ref),
    ['b', 'c', 'd', 'e', 'f']
  );
  assert.deepEqual(
    relatedForDocument('b', ids.slice(0, 6)).map((ref) => ref._ref),
    ['a', 'c', 'd', 'e', 'f']
  );
  assert.deepEqual(
    relatedForDocument('g', ids.slice(0, 5)).map((ref) => ref._ref),
    ['a', 'b', 'c', 'd', 'e']
  );
  assert.equal(relatedForDocument('only', ['only']), null);
});

test('paged updates match a full category walk and skip unchanged docs', async () => {
  const catA = docsFor('catA', 12);
  catA.push({
    _id: 'catA-retracted',
    _type: 'quiz',
    slug: 'catA/article/retracted',
    categoryRef: 'catA',
    publishedAt: '2026-11-22T00:00:00.000Z',
    reviewStatus: 'retracted',
  });
  const groups = { catA, catB: docsFor('catB', 4) };
  const client = createClient(groups);

  let offset = 0;
  let guard = 0;
  while (guard < 10) {
    const page = await runRelatedPage(client, {
      keyType: 'ref',
      categoryKey: 'catA',
      offset,
      pageSize: 4,
    });
    if (page.done) break;
    assert.equal(page.examined <= 4, true);
    offset = page.nextOffset;
    guard += 1;
  }

  const visibleIds = catA.filter(visible).map((doc) => doc._id);
  for (const [index, doc] of catA.filter(visible).entries()) {
    assert.deepEqual(doc.relatedRefs, expectedRefs(visibleIds, index));
  }
  assert.equal(
    groups.catB.every((doc) => doc.relatedRefs == null),
    true
  );
  assert.equal(catA.find((doc) => doc._id === 'catA-retracted').relatedRefs, undefined);

  const commitsBefore = client.commits.length;
  const again = await runRelatedPage(client, {
    keyType: 'ref',
    categoryKey: 'catA',
    offset: 0,
    pageSize: 4,
  });
  assert.equal(again.updated, 0);
  assert.equal(client.commits.length, commitsBefore);
});

test('head refresh patches the published document without walking the tail', async () => {
  const catA = docsFor('catA', 9);
  const client = createClient({ catA });
  const result = await runRelatedHead(client, {
    keyType: 'ref',
    categoryKey: 'catA',
    documentId: 'catA-8',
  });
  assert.equal(result.updated, 7);
  assert.deepEqual(catA[8].relatedRefs, ['catA-0', 'catA-1', 'catA-2', 'catA-3', 'catA-4']);
  assert.equal(catA[7].relatedRefs, undefined);
});

test('a running category coalesces the next publish and still records a newer generation', async () => {
  const cache = createMemoryCache();
  const now = 1_000;
  const first = await claimCategoryRun(cache, 'ref:catA', now);
  assert.equal(first.start, true);
  const second = await claimCategoryRun(cache, 'ref:catA', now);
  assert.equal(second.coalesced, true);
  const finished = await finishCategoryRun(cache, 'ref:catA', first.gen, now);
  assert.equal(finished.again, true);
  assert.equal(finished.gen, second.gen);

  const quiet = await finishCategoryRun(cache, 'ref:catA', second.gen, now);
  assert.equal(quiet.again, false);
  const restarted = await claimCategoryRun(cache, 'ref:catA', now + LOCK_TTL_MS + 5);
  assert.equal(restarted.start, true);
});

const call = (body, { headers = {}, search = '', cache, invoke, waitUntil, client } = {}) => {
  const pending = [];
  const hold = waitUntil || ((promise) => pending.push(promise));
  const request = new Request(`https://noutorebiyori.com/api/update-related${search}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const responsePromise = handleUpdateRelatedPost(
    { request, url: new URL(request.url), platform: {} },
    {
      env: ENV,
      createClient: () => client,
      cache,
      waitUntil: hold,
      invoke,
    }
  );
  return { responsePromise, pending, hold };
};

const drain = async (pending) => {
  for (let turn = 0; turn < 30; turn += 1) {
    if (pending.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (pending.length === 0) return;
    }
    const batch = pending.splice(0, pending.length);
    await Promise.all(batch);
  }
  throw new Error('continuation did not finish');
};

test('webhook returns 200 before the category walk and updates only that category', async () => {
  const groups = { catA: docsFor('catA', 8), catB: docsFor('catB', 3) };
  const client = createClient(groups);
  const cache = createMemoryCache();
  const pending = [];
  const invoke = (request) =>
    handleUpdateRelatedPost(
      { request, url: new URL(request.url), platform: {} },
      {
        env: ENV,
        createClient: () => client,
        cache,
        waitUntil: (promise) => pending.push(promise),
        invoke,
      }
    );

  const { responsePromise } = call(
    { _id: 'catA-0', _type: 'quiz', category: { _ref: 'catA' } },
    {
      headers: { 'x-sanity-webhook-secret': SECRET },
      cache,
      client,
      invoke,
      waitUntil: (promise) => pending.push(promise),
    }
  );
  const response = await responsePromise;
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.queued, true);
  assert.equal(body.started, 1);

  await drain(pending);

  const ids = groups.catA.map((doc) => doc._id);
  for (const [index, doc] of groups.catA.entries()) {
    assert.deepEqual(doc.relatedRefs, expectedRefs(ids, index));
  }
  assert.equal(
    groups.catB.every((doc) => doc.relatedRefs == null),
    true
  );
  assert.equal(Math.max(...client.commits.map((batch) => batch.length)) <= PAGE_SIZE, true);
});

test('secret header and query are required, and non-quiz payloads do not write', async () => {
  const client = createClient({ catA: docsFor('catA', 2) });
  const missing = await handleUpdateRelatedPost(
    {
      request: new Request('https://noutorebiyori.com/api/update-related', {
        method: 'POST',
        body: '{}',
      }),
      url: new URL('https://noutorebiyori.com/api/update-related'),
      platform: {},
    },
    { env: {}, createClient: () => client }
  );
  assert.equal(missing.status, 500);

  const denied = await call({ _type: 'quiz', _id: 'catA-0' }, { client }).responsePromise;
  assert.equal(denied.status, 401);

  const query = await call(
    { _type: 'quiz', _id: 'catA-0', category: { _ref: 'catA' } },
    {
      search: `?secret=${SECRET}`,
      client,
      cache: createMemoryCache(),
      invoke: async () => new Response(null, { status: 204 }),
    }
  ).responsePromise;
  assert.equal(query.status, 200);

  const skipped = await call(
    { _type: 'author', _id: 'author-1' },
    {
      headers: { 'x-sanity-webhook-secret': SECRET },
      client,
      invoke: async () => {
        throw new Error('should not continue');
      },
    }
  ).responsePromise;
  assert.equal(skipped.status, 200);
  assert.match((await skipped.json()).message, /Skipped/);
  assert.equal(client.commits.length, 0);
});

test('document id without a category is resolved, and a second publish while running only refreshes the head', async () => {
  const groups = { catA: docsFor('catA', 9) };
  const client = createClient(groups);
  const cache = createMemoryCache();
  const seen = [];
  const pending = [];
  const invoke = async (request) => {
    const body = await request.clone().json();
    seen.push(body._updateRelated.phase);
    return handleUpdateRelatedPost(
      { request, url: new URL(request.url), platform: {} },
      {
        env: ENV,
        createClient: () => client,
        cache,
        waitUntil: (promise) => pending.push(promise),
        invoke,
      }
    );
  };

  await claimCategoryRun(cache, 'ref:catA', Date.now());
  const response = await call(
    { _id: 'catA-8', _type: 'quiz' },
    {
      headers: { 'x-sanity-webhook-secret': SECRET },
      cache,
      client,
      invoke,
      waitUntil: (promise) => pending.push(promise),
    }
  ).responsePromise;
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.queued, true);
  assert.equal(payload.coalesced, 0);
  assert.equal(payload.started, 1);

  await drain(pending);
  assert.equal(seen.includes('page'), false);
  assert.ok(seen.includes('resolve') || seen.includes('head'));
  assert.deepEqual(groups.catA[8].relatedRefs, ['catA-0', 'catA-1', 'catA-2', 'catA-3', 'catA-4']);
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
  assert.ok(quiz.ids.includes('doc-1'));
  assert.ok(quiz.ids.includes('doc-9'));

  const other = extractUpdateTargets({ _type: 'category', _id: 'cat' }, new Headers());
  assert.equal(other.skip, true);
});
