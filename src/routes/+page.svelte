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
      icon: '🧠',
      difficulty: '★★★',
      description: '数字を覚えて同じ順番で入力してください。レベルが上がると桁数が増えます。',
      color: 'memory',
      playCount: '12,540回'
    },
    {
      id: 'calculation',
      title: '計算ゲーム',
      icon: '🔢',
      difficulty: '★★',
      description: '簡単な計算問題に答えてください。足し算、引き算、掛け算があります。',
      color: 'calculation',
      playCount: '9,820回'
    },
    {
      id: 'color',
      title: '色判別ゲーム',
      icon: '🎨',
      difficulty: '★★★★',
      description: '文字の色と文字の内容が同じかどうか答えてください。集中力が試されます。',
      color: 'color',
      playCount: '7,650回'
    },
    {
      id: 'word',
      title: '文字並べゲーム',
      icon: '📝',
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
      icon: '🧠'
    },
    {
      date: '2024/01/10',
      category: 'ガイド',
      title: '脳トレ日和の効果的な使い方ガイド',
      description: '脳トレーニングをより効果的に行うためのコツをご紹介します。',
      icon: '📝'
    }
  ];
</script>

<svelte:head>
  <title>脳トレ日和 - 高齢者向け無料脳トレーニングサイト</title>
  <meta name="description" content="脳トレ日和は高齢者向けの無料脳トレーニングサイトです。記憶力、計算力、判断力を楽しく鍛える4つのゲームをご用意しています。">
</svelte:head>

<!-- ウェルカムセクション -->
<section class="welcome-section">
  <div class="welcome-content">
    <h2>🌟 毎日の脳トレで健康な生活を</h2>
    <p class="welcome-text">
      脳トレ日和では、高齢者の皆様に楽しく続けていただける脳トレーニングゲームを提供しています。<br>
      時間制限なし、自分のペースで安心してお楽しみください。
    </p>
    <div class="stats-row">
      <div class="stat-item">
        <span class="stat-number">750+</span>
        <span class="stat-label">問題数</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">15年</span>
        <span class="stat-label">運営実績</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">無料</span>
        <span class="stat-label">すべて無料</span>
      </div>
    </div>
  </div>
</section>

<!-- 新着記事セクション -->
<section class="news-section">
  <div class="section-header">
    <h2 class="section-title">📰 新着記事</h2>
  </div>
  <div class="news-container">
    {#each newsItems as item}
      <article class="news-card">
        <div class="news-header">
          <span class="news-date">{item.date}</span>
          <span class="news-category {item.category === 'ニュース' ? 'news-tag' : 'guide-tag'}">{item.category}</span>
        </div>
        <div class="news-content">
          <div class="news-icon">{item.icon}</div>
          <div class="news-text">
            <h3 class="news-title">{item.title}</h3>
            <p class="news-description">{item.description}</p>
          </div>
        </div>
        <button class="read-more-btn">続きを読む</button>
      </article>
    {/each}
  </div>
</section>

<!-- ゲームセクション -->
<section class="games-section">
  <div class="section-header">
    <h2 class="section-title">🎮 脳トレゲーム</h2>
    <p class="section-subtitle">お好きなゲームを選んで、楽しく脳を鍛えましょう</p>
  </div>
  <div class="games-grid">
    {#each gameCategories as game}
      <div class="game-card {game.color}">
        <div class="game-header">
          <div class="game-icon">{game.icon}</div>
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
          <button class="play-btn primary">🎮 プレイする</button>
          <button class="info-btn secondary">📖 詳細を見る</button>
        </div>
      </div>
    {/each}
  </div>
</section>

<!-- ランキングセクション -->
<section class="ranking-section">
  <div class="section-header">
    <h2 class="section-title">🏆 人気ゲームランキング</h2>
  </div>
  <div class="ranking-container">
    <div class="ranking-list">
      {#each gameCategories.slice(0, 3) as game, index}
        <div class="ranking-item">
          <div class="rank-number">{index + 1}位</div>
          <div class="rank-game">
            <span class="rank-icon">{game.icon}</span>
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
    <h2 class="section-title">✨ 脳トレ日和の特徴</h2>
  </div>
  <div class="features-grid">
    <div class="feature-card">
      <div class="feature-icon">⏰</div>
      <h3>時間制限なし</h3>
      <p>自分のペースで焦らず楽しく脳トレができます</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">👁️</div>
      <h3>見やすいデザイン</h3>
      <p>高齢者向けに大きな文字と見やすいイラストを使用</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">📱</div>
      <h3>スマホ対応</h3>
      <p>スマートフォンでもタブレットでも快適にご利用可能</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">💰</div>
      <h3>完全無料</h3>
      <p>すべてのゲームを無料でお楽しみいただけます</p>
    </div>
  </div>
</section>

<style>
  .welcome-section {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 3rem 1rem;
    text-align: center;
    margin-bottom: 2rem;
  }

  .welcome-content h2 {
    font-size: 2.2rem;
    margin-bottom: 1rem;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  .welcome-text {
    font-size: 1.1rem;
    line-height: 1.8;
    margin-bottom: 2rem;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }

  .stats-row {
    display: flex;
    justify-content: center;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    min-width: 120px;
  }

  .stat-number {
    font-size: 2rem;
    font-weight: bold;
    color: #ffd700;
  }

  .stat-label {
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }

  .news-section, .games-section, .ranking-section, .features-section {
    margin: 3rem 0;
  }

  .section-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .section-subtitle {
    font-size: 1.1rem;
    color: #666;
    margin-top: 0.5rem;
  }

  .news-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
    max-width: 1000px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .news-card {
    background: white;
    border-radius: 15px;
    padding: 1.5rem;
    box-shadow: 0 8px 32px rgba(108, 92, 231, 0.1);
    border: 2px solid rgba(108, 92, 231, 0.1);
    transition: all 0.3s ease;
  }

  .news-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 40px rgba(108, 92, 231, 0.2);
  }

  .news-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .news-date {
    font-size: 0.9rem;
    color: #666;
    font-weight: 500;
  }

  .news-category {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: bold;
  }

  .news-tag {
    background: #e74c3c;
    color: white;
  }

  .guide-tag {
    background: #3498db;
    color: white;
  }

  .news-content {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .news-icon {
    font-size: 2.5rem;
    flex-shrink: 0;
  }

  .news-title {
    font-size: 1.2rem;
    font-weight: bold;
    color: #2d3436;
    margin-bottom: 0.5rem;
    line-height: 1.4;
  }

  .news-description {
    color: #636e72;
    line-height: 1.6;
  }

  .read-more-btn {
    background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 25px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%;
  }

  .read-more-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
  }

  .games-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .game-card {
    background: white;
    border-radius: 20px;
    padding: 2rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    border: 3px solid transparent;
  }

  .game-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
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
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .game-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .game-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }

  .difficulty {
    font-size: 0.9rem;
    font-weight: bold;
    color: #f39c12;
  }

  .play-count {
    font-size: 0.8rem;
    color: #666;
  }

  .game-title {
    font-size: 1.4rem;
    font-weight: bold;
    color: #2d3436;
    margin-bottom: 0.75rem;
  }

  .game-description {
    color: #636e72;
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .game-actions {
    display: flex;
    gap: 0.75rem;
  }

  .play-btn, .info-btn {
    flex: 1;
    padding: 0.875rem 1rem;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.95rem;
  }

  .primary {
    background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
    color: white;
  }

  .primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 184, 148, 0.3);
  }

  .secondary {
    background: #f8f9fa;
    color: #2d3436;
    border: 2px solid #ddd;
  }

  .secondary:hover {
    background: #e9ecef;
    border-color: #6c5ce7;
  }

  .ranking-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .ranking-list {
    background: white;
    border-radius: 15px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(108, 92, 231, 0.1);
  }

  .ranking-item {
    display: flex;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #f1f3f4;
    transition: background 0.3s ease;
  }

  .ranking-item:last-child {
    border-bottom: none;
  }

  .ranking-item:hover {
    background: #f8f9fa;
  }

  .rank-number {
    font-size: 1.5rem;
    font-weight: bold;
    color: #ffd700;
    width: 60px;
    text-align: center;
  }

  .rank-game {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .rank-icon {
    font-size: 1.5rem;
  }

  .rank-title {
    font-weight: 600;
    color: #2d3436;
  }

  .rank-count {
    font-size: 0.9rem;
    color: #666;
    font-weight: 500;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    max-width: 1000px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .feature-card {
    background: white;
    padding: 2rem;
    border-radius: 15px;
    text-align: center;
    box-shadow: 0 8px 32px rgba(108, 92, 231, 0.1);
    transition: all 0.3s ease;
  }

  .feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 40px rgba(108, 92, 231, 0.15);
  }

  .feature-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .feature-card h3 {
    font-size: 1.3rem;
    font-weight: bold;
    color: #2d3436;
    margin-bottom: 0.75rem;
  }

  .feature-card p {
    color: #636e72;
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    .welcome-content h2 {
      font-size: 1.8rem;
    }

    .stats-row {
      gap: 1rem;
    }

    .stat-item {
      min-width: 100px;
      padding: 0.75rem;
    }

    .news-container {
      grid-template-columns: 1fr;
    }

    .games-grid {
      grid-template-columns: 1fr;
    }

    .game-actions {
      flex-direction: column;
    }

    .features-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

