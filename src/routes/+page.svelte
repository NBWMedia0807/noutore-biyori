<script>
  import { onMount } from 'svelte';

  let currentTime = new Date();
  
  onMount(() => {
    const interval = setInterval(() => {
      currentTime = new Date();
    }, 1000);
    
    return () => clearInterval(interval);
  });

  const gameCategories = [
    {
      id: 'memory',
      title: '記憶力ゲーム',
      icon: '/icons/brain-icon.png',
      difficulty: '★★★',
      description: '数字を覚えて同じ順番で入力してください。レベルが上がると桁数が増えます。',
      color: 'memory',
      playCount: '12,540回'
    },
    {
      id: 'calculation',
      title: '計算ゲーム',
      icon: '/icons/calculator-icon.png',
      difficulty: '★★',
      description: '簡単な計算問題に答えてください。足し算、引き算、掛け算があります。',
      color: 'calculation',
      playCount: '9,820回'
    },
    {
      id: 'color',
      title: '色判別ゲーム',
      icon: '/icons/palette-icon.png',
      difficulty: '★★★★',
      description: '文字の色と文字の内容が同じかどうか答えてください。集中力が試されます。',
      color: 'color',
      playCount: '7,650回'
    },
    {
      id: 'word',
      title: '文字並べゲーム',
      icon: '/icons/text-icon.png',
      difficulty: '★★★',
      description: 'バラバラになった文字を正しく並べて単語を作ってください。語彙力が鍛えられます。',
      color: 'word',
      playCount: '5,430回'
    }
  ];

  const newsItems = [
    {
      date: '2024/01/15',
      category: 'ニュース',
      title: '記憶力ゲームの新しいモードを追加しました',
      description: 'より挑戦的な「ハードモード」を追加。上級者の方もお楽しみいただけます。',
      icon: '/icons/news-icon.png'
    },
    {
      date: '2024/01/10',
      category: 'ガイド',
      title: '脳トレ日和の効果的な使い方ガイド',
      description: '脳トレーニングをより効果的に行うためのコツをご紹介します。',
      icon: '/icons/text-icon.png'
    }
  ];
</script>

<svelte:head>
  <title>脳トレ日和 - 高齢者向け無料脳トレーニングサイト</title>
  <meta name="description" content="脳トレ日和は高齢者向けの無料脳トレーニングサイトです。記憶力、計算力、判断力を楽しく鍛える4つのゲームをご用意しています。">
</svelte:head>

<!-- 新着記事セクション -->
<section class="news-section">
  <div class="section-header">
    <h2 class="section-title"><img src="/icons/news-icon.png" alt="新着記事" class="section-icon" /> 新着記事</h2>
  </div>
  <div class="news-grid">
    {#each newsItems as item}
      <article class="news-card">
        <div class="news-header">
          <span class="news-date">{item.date}</span>
          <span class="news-category">{item.category}</span>
        </div>
        <h3 class="news-title">{item.title}</h3>
        <p class="news-description">{item.description}</p>
        <div class="news-icon">
          <img src="{item.icon}" alt="{item.category}" class="news-item-icon" />
        </div>
        <button class="read-more-btn">続きを読む</button>
      </article>
    {/each}
  </div>
</section>

<!-- ゲームセクション -->
<section class="games-section">
  <div class="section-header">
    <h2 class="section-title"><img src="/icons/game-icon.png" alt="脳トレゲーム" class="section-icon" /> 脳トレゲーム</h2>
    <p class="section-subtitle">お好きなゲームを選んで、楽しく脳を鍛えましょう</p>
  </div>
  <div class="games-grid">
    {#each gameCategories as game}
      <div class="game-card {game.color}">
        <div class="game-header">
          <div class="game-icon"><img src="{game.icon}" alt="{game.title}" class="game-item-icon" /></div>
          <div class="game-meta">
            <span class="difficulty">難易度 {game.difficulty}</span>
            <span class="play-count">{game.playCount}</span>
          </div>
        </div>
        <div class="game-content">
          <h3 class="game-title">{game.title}</h3>
          <p class="game-description">{game.description}</p>
        </div>
        <div class="game-actions">
          <button class="play-btn primary"><img src="/icons/game-icon.png" alt="プレイ" class="btn-icon" /> プレイする</button>
          <button class="info-btn secondary"><img src="/icons/news-icon.png" alt="詳細" class="btn-icon" /> 詳細を見る</button>
        </div>
      </div>
    {/each}
  </div>
</section>

<!-- ランキングセクション -->
<section class="ranking-section">
  <div class="section-header">
    <h2 class="section-title"><img src="/icons/trophy-icon.png" alt="人気ゲームランキング" class="section-icon" /> 人気ゲームランキング</h2>
  </div>
  <div class="ranking-container">
    <div class="ranking-list">
      {#each gameCategories.slice(0, 3) as game, index}
        <div class="ranking-item">
          <div class="rank-number">{index + 1}位</div>
          <div class="rank-game">
            <span class="rank-icon"><img src="{game.icon}" alt="{game.title}" class="rank-item-icon" /></span>
            <span class="rank-title">{game.title}</span>
          </div>
          <div class="rank-count">{game.playCount}</div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- 特徴セクション -->
<section class="features-section">
  <div class="section-header">
    <h2 class="section-title"><img src="/icons/features-icon.png" alt="脳トレ日和の特徴" class="section-icon" /> 脳トレ日和の特徴</h2>
  </div>
  <div class="features-grid">
    <div class="feature-card">
      <div class="feature-icon"><img src="/icons/clock-icon.png" alt="時間制限なし" class="feature-item-icon" /></div>
      <h3>時間制限なし</h3>
      <p>自分のペースで焦らず楽しく脳トレができます</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon"><img src="/icons/brain-icon.png" alt="見やすいデザイン" class="feature-item-icon" /></div>
      <h3>見やすいデザイン</h3>
      <p>高齢者向けに大きな文字と見やすいイラストを使用</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon"><img src="/icons/home-icon.png" alt="スマホ対応" class="feature-item-icon" /></div>
      <h3>スマホ対応</h3>
      <p>スマートフォンでもタブレットでも快適にご利用可能</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon"><img src="/icons/trophy-icon.png" alt="完全無料" class="feature-item-icon" /></div>
      <h3>完全無料</h3>
      <p>すべてのゲームを無料でお楽しみいただけます</p>
    </div>
  </div>
</section>

<style>
  /* アイコンスタイル */
  .section-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
    margin-right: 0.5rem;
  }

  .news-item-icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }

  .game-item-icon {
    width: 48px;
    height: 48px;
    object-fit: contain;
  }

  .btn-icon {
    width: 16px;
    height: 16px;
    object-fit: contain;
    margin-right: 0.5rem;
  }

  .rank-item-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }

  .feature-item-icon {
    width: 48px;
    height: 48px;
    object-fit: contain;
  }

  /* セクションスタイル */
  .section {
    margin-bottom: 2rem;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }

  .news-section, .games-section, .ranking-section, .features-section {
    padding: 2rem 1rem;
    margin-bottom: 3rem;
  }

  .section-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .section-title {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    color: #2d3436;
    margin-bottom: 0.5rem;
  }

  .section-subtitle {
    color: #636e72;
    font-size: 1.1rem;
  }

  /* 新着記事 */
  .news-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    max-width: 1000px;
    margin: 0 auto;
  }

  .news-card {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    position: relative;
  }

  .news-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  }

  .news-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .news-date {
    color: #636e72;
    font-size: 0.9rem;
  }

  .news-category {
    background: #ffc107;
    color: #856404;
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .news-title {
    font-size: 1.3rem;
    color: #2d3436;
    margin-bottom: 1rem;
    line-height: 1.4;
  }

  .news-description {
    color: #636e72;
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .news-icon {
    position: absolute;
    top: 1rem;
    right: 1rem;
    opacity: 0.3;
  }

  .read-more-btn {
    background: linear-gradient(135deg, #ffc107 0%, #ffeb3b 100%);
    color: #856404;
    border: none;
    padding: 0.8rem 1.5rem;
    border-radius: 25px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .read-more-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(255, 193, 7, 0.3);
  }

  /* ゲーム */
  .games-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .game-card {
    background: white;
    border-radius: 20px;
    padding: 2rem;
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    border: 3px solid transparent;
  }

  .game-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  }

  .game-card.memory {
    border-color: #e74c3c;
  }

  .game-card.calculation {
    border-color: #3498db;
  }

  .game-card.color {
    border-color: #9b59b6;
  }

  .game-card.word {
    border-color: #f39c12;
  }

  .game-header {
    display: flex;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .game-icon {
    margin-right: 1rem;
  }

  .game-meta {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .difficulty {
    color: #ffc107;
    font-weight: 600;
  }

  .play-count {
    color: #636e72;
    font-size: 0.9rem;
  }

  .game-content {
    margin-bottom: 2rem;
  }

  .game-title {
    font-size: 1.4rem;
    color: #2d3436;
    margin-bottom: 1rem;
  }

  .game-description {
    color: #636e72;
    line-height: 1.6;
  }

  .game-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .play-btn, .info-btn {
    display: flex;
    align-items: center;
    padding: 1rem 1.5rem;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    flex: 1;
    justify-content: center;
    min-width: 140px;
  }

  .play-btn {
    background: linear-gradient(135deg, #ffc107 0%, #ffeb3b 100%);
    color: #856404;
  }

  .info-btn {
    background: #f8f9fa;
    color: #636e72;
    border: 2px solid #dee2e6;
  }

  .play-btn:hover, .info-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }

  /* ランキング */
  .ranking-container {
    max-width: 600px;
    margin: 0 auto;
  }

  .ranking-list {
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .ranking-item {
    display: flex;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid #f1f3f4;
    transition: background-color 0.3s ease;
  }

  .ranking-item:last-child {
    border-bottom: none;
  }

  .ranking-item:hover {
    background-color: #f8f9fa;
  }

  .rank-number {
    font-size: 1.5rem;
    font-weight: bold;
    color: #ffc107;
    margin-right: 2rem;
    min-width: 60px;
  }

  .rank-game {
    display: flex;
    align-items: center;
    flex: 1;
    gap: 1rem;
  }

  .rank-title {
    font-size: 1.1rem;
    color: #2d3436;
  }

  .rank-count {
    color: #636e72;
    font-weight: 600;
  }

  /* 特徴 */
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    max-width: 1000px;
    margin: 0 auto;
  }

  .feature-card {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
  }

  .feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  }

  .feature-icon {
    margin-bottom: 1rem;
  }

  .feature-card h3 {
    font-size: 1.3rem;
    color: #2d3436;
    margin-bottom: 1rem;
  }

  .feature-card p {
    color: #636e72;
    line-height: 1.6;
  }

  /* レスポンシブ */
  @media (max-width: 768px) {
    .section-title {
      font-size: 1.6rem;
    }

    .games-grid {
      grid-template-columns: 1fr;
    }

    .game-actions {
      flex-direction: column;
    }

    .play-btn, .info-btn {
      flex: none;
    }

    .news-grid {
      grid-template-columns: 1fr;
    }

    .features-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

