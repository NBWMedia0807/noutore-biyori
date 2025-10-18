<script>
  import ArticleCard from '$lib/components/ArticleCard.svelte';
  import ArticleGrid from '$lib/components/ArticleGrid.svelte';

  export let data;

  const heroChecklist = [
    'Sanityスタジオと完全同期',
    'カテゴリごとの厳選クイズ',
    '登録不要・すべて無料'
  ];

  const featureHighlights = [
    {
      icon: '🆕',
      title: '毎週追加される新着問題',
      description: '最新の脳トレをいち早くお届け。Sanityで公開するとすぐに反映されます。'
    },
    {
      icon: '🧠',
      title: 'ジャンル別で探しやすい',
      description: '計算力・記憶力・観察力など、目的別に最適なカテゴリをすぐに見つけられます。'
    },
    {
      icon: '🎯',
      title: 'やさしい解説付き',
      description: '高齢者の方にも読みやすいフォントと色使いで、安心して挑戦いただけます。'
    }
  ];

  const supportPoints = [
    {
      title: 'Sanityスタジオと完全連携',
      description:
        'スタジオで選択したカテゴリがそのまま本番環境に反映。新しいカテゴリも自動でグロナビに追加されます。'
    },
    {
      title: 'カテゴリページも自動生成',
      description:
        'カテゴリを追加すると専用の一覧ページを自動で作成。クイズの追加・更新もリアルタイムで反映します。'
    },
    {
      title: '高速な再検証フロー',
      description:
        'クイズやカテゴリを更新すると対象ページを的確に再生成し、常に最新の情報を表示します。'
    }
  ];

  const reassurancePoints = [
    {
      icon: '📱',
      title: 'スマホでも見やすい',
      description: '48px以上のタップターゲットと余白設計で、どのデバイスでも快適に利用できます。'
    },
    {
      icon: '🔁',
      title: 'カテゴリ切替もスムーズ',
      description: 'グローバルナビから別カテゴリへ移動しても、表示が即座に切り替わります。'
    },
    {
      icon: '🛡️',
      title: '広告レビューにも対応',
      description: 'レビューモードを切り替えるだけで、必要な箇所の表示制御が可能です。'
    }
  ];

  const colorTokens = ['sunrise', 'twilight', 'forest', 'ocean'];

  const normalizeSlug = (value) => (typeof value === 'string' ? value.trim() : '');
  const normalizeTitle = (value, slug) => {
    if (typeof value === 'string' && value.trim()) return value.trim();
    return slug ? slug.replace(/-/g, ' ') : 'カテゴリ';
  };

  const aggregateCategories = (quizzes) => {
    const map = new Map();
    if (!Array.isArray(quizzes)) return map;
    for (const quiz of quizzes) {
      const slug = normalizeSlug(quiz?.category?.slug ?? quiz?.categorySlug);
      if (!slug) continue;
      const title = normalizeTitle(quiz?.category?.title ?? quiz?.categoryTitle, slug);
      if (!map.has(slug)) {
        map.set(slug, { slug, title, count: 0 });
      }
      map.get(slug).count += 1;
    }
    return map;
  };

  const formatPublishedAt = (value) => {
    if (!value) return 0;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  };

  $: quizzes = Array.isArray(data?.quizzes) ? data.quizzes : [];
  $: visibleQuizzes = quizzes.filter((quiz) => normalizeSlug(quiz?.slug));
  $: sortedQuizzes = visibleQuizzes
    .slice()
    .sort((a, b) => formatPublishedAt(b?.publishedAt ?? b?._createdAt) - formatPublishedAt(a?.publishedAt ?? a?._createdAt));
  $: latestQuizzes = sortedQuizzes.slice(0, 6);
  $: categoryMap = aggregateCategories(sortedQuizzes);
  $: categoryShowcase = Array.from(categoryMap.values())
    .sort((a, b) => (b.count - a.count !== 0 ? b.count - a.count : a.title.localeCompare(b.title, 'ja')))
    .slice(0, 4)
    .map((entry, index) => ({ ...entry, tone: colorTokens[index % colorTokens.length] }));
  $: categoryCount = categoryMap.size;
  $: totalQuizCount = sortedQuizzes.length;

  const baseStats = [
    {
      label: '公開中の脳トレ',
      suffix: '問',
      fallback: '750+',
      description: 'Sanityで公開した瞬間に自動反映'
    },
    {
      label: '掲載カテゴリ',
      suffix: 'カテゴリ',
      fallback: '12',
      description: 'グローバルナビと常に同期'
    },
    {
      label: 'ご利用料金',
      suffix: '',
      fallback: '無料',
      description: '会員登録なしですぐに挑戦'
    }
  ];

  const resolveStatValue = (stat) => {
    if (stat.label === '公開中の脳トレ' && totalQuizCount > 0) {
      return `${totalQuizCount}`;
    }
    if (stat.label === '掲載カテゴリ' && categoryCount > 0) {
      return `${categoryCount}`;
    }
    if (stat.label === 'ご利用料金') {
      return '無料';
    }
    return stat.fallback;
  };

  $: stats = baseStats.map((stat) => ({
    ...stat,
    value: resolveStatValue(stat)
  }));
</script>

<section class="hero">
  <div class="hero__content">
    <p class="hero__kicker">脳トレ専門メディア</p>
    <h1 class="hero__title">毎日の「気づき」が見つかる脳トレ習慣を、ここから。</h1>
    <p class="hero__lead">
      脳トレ日和は、Sanityスタジオで入稿したクイズがそのまま本番環境に反映される最新の脳トレメディアです。
      シンプルだけど飽きない問題で、今日も脳を楽しくストレッチしましょう。
    </p>
    <ul class="hero__checklist" aria-label="サイトの特徴">
      {#each heroChecklist as item}
        <li>{item}</li>
      {/each}
    </ul>
    <div class="hero__actions">
      <a class="hero__cta" href="/quiz">クイズ一覧へ</a>
      <a class="hero__ghost" href="#latest">新着クイズを見る</a>
    </div>
  </div>
  <div class="hero__visual" aria-hidden="true">
    <div class="hero__bubble hero__bubble--primary"></div>
    <div class="hero__bubble hero__bubble--secondary"></div>
    <div class="hero__cards">
      <div class="mini-card">
        <span class="mini-card__icon">🧩</span>
        <p class="mini-card__label">カテゴリ連携</p>
      </div>
      <div class="mini-card mini-card--accent">
        <span class="mini-card__icon">⚡</span>
        <p class="mini-card__label">自動再生成</p>
      </div>
    </div>
  </div>
</section>

<section class="stats" aria-label="サイトのサマリー">
  {#each stats as stat (stat.label)}
    <div class="stat-card">
      <div class="stat-card__value">{stat.value}<span class="stat-card__suffix">{stat.suffix}</span></div>
      <p class="stat-card__label">{stat.label}</p>
      <p class="stat-card__description">{stat.description}</p>
    </div>
  {/each}
</section>

<section class="latest" id="latest" aria-labelledby="latest-heading">
  <div class="section-heading">
    <h2 id="latest-heading">新着クイズ</h2>
    <p>新しく公開されたクイズから、特に人気の6問をピックアップ。</p>
  </div>
  {#if latestQuizzes.length === 0}
    <p class="empty">Sanityでクイズを公開するとここに表示されます。現在は準備中です。</p>
  {:else}
    <ArticleGrid minWidth={260} gap={24}>
      {#each latestQuizzes as quiz (quiz.slug)}
        <ArticleCard {quiz} />
      {/each}
    </ArticleGrid>
  {/if}
</section>

<section class="categories" aria-labelledby="category-heading">
  <div class="section-heading">
    <h2 id="category-heading">人気カテゴリから選ぶ</h2>
    <p>Sanityのカテゴリと完全連携。新しいカテゴリを追加すると自動でここに登場します。</p>
  </div>
  {#if categoryShowcase.length === 0}
    <div class="categories__fallback">
      <p>カテゴリは現在準備中です。Sanityスタジオでカテゴリを作成すると自動で表示されます。</p>
    </div>
  {:else}
    <div class="category-grid">
      {#each categoryShowcase as category (category.slug)}
        <a
          class={`category-card category-card--${category.tone}`}
          href={`/category/${category.slug}`}
          aria-label={`${category.title}カテゴリの一覧を見る`}
        >
          <div class="category-card__meta">
            <span class="category-card__count">{category.count}問掲載</span>
          </div>
          <h3 class="category-card__title">{category.title}</h3>
          <span class="category-card__link">詳しく見る →</span>
        </a>
      {/each}
    </div>
  {/if}
</section>

<section class="features" aria-labelledby="features-heading">
  <div class="section-heading">
    <h2 id="features-heading">脳トレ日和が選ばれる理由</h2>
    <p>高齢者にも使いやすいデザインと、運営のしやすさを両立させています。</p>
  </div>
  <div class="feature-grid">
    {#each featureHighlights as feature (feature.title)}
      <article class="feature-card">
        <div class="feature-card__icon">{feature.icon}</div>
        <h3>{feature.title}</h3>
        <p>{feature.description}</p>
      </article>
    {/each}
  </div>
</section>

<section class="support" aria-labelledby="support-heading">
  <div class="section-heading">
    <h2 id="support-heading">運営に嬉しい3つの仕組み</h2>
    <p>Sanityでの入稿から本番反映まで、すべて自動化されています。</p>
  </div>
  <div class="support-grid">
    {#each supportPoints as point (point.title)}
      <article class="support-card">
        <h3>{point.title}</h3>
        <p>{point.description}</p>
      </article>
    {/each}
  </div>
</section>

<section class="reassurance" aria-labelledby="reassurance-heading">
  <div class="section-heading">
    <h2 id="reassurance-heading">安心して使えるポイント</h2>
    <p>現場の声を反映した細かな改善で、誰でも迷わず楽しめます。</p>
  </div>
  <div class="reassurance-grid">
    {#each reassurancePoints as point (point.title)}
      <article class="reassurance-card">
        <span class="reassurance-card__icon">{point.icon}</span>
        <h3>{point.title}</h3>
        <p>{point.description}</p>
      </article>
    {/each}
  </div>
</section>

<section class="cta" aria-labelledby="cta-heading">
  <div class="cta__content">
    <h2 id="cta-heading">最新のカテゴリとクイズを、いつでも自動で掲載。</h2>
    <p>
      Sanityスタジオでカテゴリとクイズを選ぶだけ。グローバルナビとカテゴリページが連動し、訪れた人に常に最新の体験を届けられます。
    </p>
    <div class="cta__actions">
      <a class="cta__primary" href="/contact">お問い合わせ</a>
      <a class="cta__secondary" href="/about">サイトについて</a>
    </div>
  </div>
</section>

<style>
  :global(main) {
    background: linear-gradient(180deg, rgba(255, 247, 214, 0.9) 0%, rgba(255, 255, 255, 1) 40%);
  }

  section {
    max-width: 1200px;
    margin: 0 auto;
    padding: 3.5rem 1.5rem;
  }

  .hero {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2.5rem;
    align-items: center;
    padding-top: 3rem;
  }

  .hero__content {
    display: grid;
    gap: 1.5rem;
  }

  .hero__kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-weight: 700;
    font-size: 0.95rem;
    color: #a16207;
    background: rgba(250, 204, 21, 0.25);
    padding: 0.4rem 0.9rem;
    border-radius: 999px;
    box-shadow: inset 0 0 0 1px rgba(250, 204, 21, 0.4);
    width: fit-content;
  }

  .hero__title {
    font-size: clamp(2.2rem, 5vw, 3.1rem);
    line-height: 1.2;
    color: var(--dark-gray, #1f2937);
    letter-spacing: 0.01em;
  }

  .hero__lead {
    font-size: 1.1rem;
    color: var(--medium-gray, #4b5563);
    line-height: 1.7;
  }

  .hero__checklist {
    list-style: none;
    display: grid;
    gap: 0.75rem;
    padding: 0;
  }

  .hero__checklist li {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: #fff7d6;
    border-radius: 16px;
    padding: 0.55rem 1rem;
    font-weight: 600;
    color: #92400e;
  }

  .hero__checklist li::before {
    content: '✔';
    font-size: 0.95rem;
  }

  .hero__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .hero__cta,
  .hero__ghost,
  .cta__primary,
  .cta__secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    font-weight: 700;
    padding: 0.85rem 1.8rem;
    text-decoration: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .hero__cta,
  .cta__primary {
    background: linear-gradient(135deg, #fbbf24, #f97316);
    color: #78350f;
    box-shadow: 0 16px 36px rgba(249, 115, 22, 0.25);
  }

  .hero__cta:hover,
  .hero__cta:focus-visible,
  .cta__primary:hover,
  .cta__primary:focus-visible {
    transform: translateY(-2px);
    box-shadow: 0 18px 40px rgba(249, 115, 22, 0.3);
  }

  .hero__ghost,
  .cta__secondary {
    background: #fff;
    color: #92400e;
    box-shadow: inset 0 0 0 2px rgba(250, 204, 21, 0.6);
  }

  .hero__ghost:hover,
  .hero__ghost:focus-visible,
  .cta__secondary:hover,
  .cta__secondary:focus-visible {
    transform: translateY(-2px);
    box-shadow: inset 0 0 0 2px rgba(248, 196, 113, 1);
  }

  .hero__visual {
    position: relative;
    min-height: 320px;
  }

  .hero__bubble {
    position: absolute;
    border-radius: 50%;
    filter: blur(0);
    opacity: 0.8;
  }

  .hero__bubble--primary {
    width: 220px;
    height: 220px;
    background: radial-gradient(circle at top left, rgba(250, 204, 21, 0.8), rgba(249, 115, 22, 0.55));
    top: 10%;
    right: 5%;
  }

  .hero__bubble--secondary {
    width: 160px;
    height: 160px;
    background: radial-gradient(circle at bottom right, rgba(253, 224, 71, 0.7), rgba(249, 115, 22, 0.4));
    bottom: 5%;
    left: 10%;
  }

  .hero__cards {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: grid;
    gap: 1rem;
  }

  .mini-card {
    background: rgba(255, 255, 255, 0.9);
    padding: 1rem 1.4rem;
    border-radius: 18px;
    box-shadow: 0 20px 45px rgba(15, 23, 42, 0.18);
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
  }

  .mini-card--accent {
    background: linear-gradient(135deg, rgba(249, 168, 212, 0.95), rgba(251, 191, 36, 0.9));
    color: #512c0f;
  }

  .mini-card__icon {
    font-size: 1.5rem;
  }

  .mini-card__label {
    font-weight: 700;
  }

  .stats {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .stat-card {
    background: #fff;
    border-radius: 24px;
    padding: 1.8rem;
    box-shadow: 0 16px 38px rgba(248, 196, 113, 0.25);
    border: 1px solid rgba(248, 196, 113, 0.4);
    display: grid;
    gap: 0.75rem;
  }

  .stat-card__value {
    font-size: 2.2rem;
    font-weight: 800;
    color: #92400e;
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
  }

  .stat-card__suffix {
    font-size: 1rem;
    font-weight: 600;
    color: #b45309;
  }

  .stat-card__label {
    font-weight: 700;
    color: #1f2937;
  }

  .stat-card__description {
    color: #4b5563;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .section-heading {
    display: grid;
    gap: 0.75rem;
    margin-bottom: 2rem;
    text-align: center;
  }

  .section-heading h2 {
    font-size: clamp(2rem, 4vw, 2.6rem);
    color: #1f2937;
  }

  .section-heading p {
    color: #4b5563;
    font-size: 1rem;
  }

  .latest {
    display: grid;
    gap: 2rem;
  }

  .empty {
    text-align: center;
    background: rgba(255, 255, 255, 0.85);
    border: 1px dashed rgba(248, 196, 113, 0.6);
    padding: 2.5rem 1.5rem;
    border-radius: 24px;
    color: #92400e;
    font-weight: 600;
  }

  .categories {
    display: grid;
    gap: 2rem;
  }

  .categories__fallback {
    background: rgba(255, 255, 255, 0.92);
    border-radius: 24px;
    padding: 2.5rem 1.5rem;
    text-align: center;
    border: 1px dashed rgba(248, 196, 113, 0.5);
    color: #78350f;
  }

  .category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.5rem;
  }

  .category-card {
    display: grid;
    gap: 1.25rem;
    padding: 1.75rem;
    border-radius: 24px;
    text-decoration: none;
    color: #1f2937;
    position: relative;
    overflow: hidden;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }

  .category-card::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.18);
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  .category-card:hover,
  .category-card:focus-visible {
    transform: translateY(-6px);
    box-shadow: 0 24px 40px rgba(15, 23, 42, 0.18);
  }

  .category-card:hover::after,
  .category-card:focus-visible::after {
    opacity: 1;
  }

  .category-card__meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: rgba(31, 41, 55, 0.85);
    font-size: 0.9rem;
    font-weight: 600;
  }

  .category-card__title {
    font-size: 1.6rem;
    margin: 0;
    font-weight: 800;
  }

  .category-card__link {
    font-weight: 700;
    color: rgba(31, 41, 55, 0.8);
  }

  .category-card--sunrise {
    background: linear-gradient(135deg, #fde68a, #f59e0b);
  }

  .category-card--twilight {
    background: linear-gradient(135deg, #fbcfe8, #f472b6);
  }

  .category-card--forest {
    background: linear-gradient(135deg, #bbf7d0, #34d399);
  }

  .category-card--ocean {
    background: linear-gradient(135deg, #bae6fd, #38bdf8);
  }

  .feature-grid,
  .support-grid,
  .reassurance-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.5rem;
  }

  .feature-card,
  .support-card,
  .reassurance-card {
    background: #fff;
    border-radius: 24px;
    padding: 1.75rem;
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
    border: 1px solid rgba(248, 196, 113, 0.3);
    display: grid;
    gap: 1rem;
  }

  .feature-card__icon,
  .reassurance-card__icon {
    font-size: 2rem;
  }

  .feature-card h3,
  .support-card h3,
  .reassurance-card h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #1f2937;
  }

  .feature-card p,
  .support-card p,
  .reassurance-card p {
    color: #4b5563;
    line-height: 1.6;
  }

  .cta {
    padding-bottom: 4rem;
  }

  .cta__content {
    background: linear-gradient(135deg, rgba(255, 214, 10, 0.95), rgba(255, 159, 10, 0.95));
    border-radius: 32px;
    padding: clamp(2rem, 5vw, 3.5rem);
    display: grid;
    gap: 1.5rem;
    text-align: center;
    color: #512c0f;
    box-shadow: 0 24px 50px rgba(251, 191, 36, 0.35);
  }

  .cta__content h2 {
    font-size: clamp(2rem, 4.5vw, 2.8rem);
    margin: 0;
  }

  .cta__content p {
    font-size: 1.05rem;
    line-height: 1.7;
  }

  .cta__actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  @media (max-width: 768px) {
    section {
      padding: 2.5rem 1.25rem;
    }

    .hero {
      padding-top: 2rem;
    }

    .hero__visual {
      order: -1;
    }

    .hero__checklist {
      grid-template-columns: 1fr;
    }

    .hero__cards {
      position: static;
      transform: none;
      justify-items: flex-start;
    }

    .category-grid,
    .feature-grid,
    .support-grid,
    .reassurance-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
