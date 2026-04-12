<div class="static-page">
  <h1 class="page-title">著者情報</h1>

  <section class="section author-section">
    <div class="author-header">
      <div class="author-avatar">
        <img src="/logo.svg" alt="脳トレ日和編集部" width="80" height="80" />
      </div>
      <div class="author-meta">
        <p class="author-name">脳トレ日和編集部</p>
        <p class="author-role">脳トレ日和 監修・制作チーム</p>
      </div>
    </div>

    <div class="author-bio">
      <p>Webメディアの広告運用・コンサルティング会社にて、メディアマネタイズの実務を経験後、大手通信会社にて脳トレ・クイズコンテンツの企画・制作に従事。その後、これまでの経験を活かし「脳トレ日和」を設立。</p>
      <p>毎日楽しく脳を鍛えられるコンテンツをお届けするため、計算・漢字・なぞなぞ・マッチ棒など幅広いジャンルのクイズを監修・制作しています。</p>
    </div>
  </section>

  <div class="back-to-home">
    <a href="/" class="back-button">TOPページに戻る</a>
  </div>
</div>

<style>
  .static-page {
    max-width: 760px;
    margin: 0 auto;
    padding: 2rem 1rem 3rem;
  }

  .page-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 2rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #ffc107;
  }

  .section {
    margin-bottom: 2.5rem;
    padding-bottom: 2.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .section:last-child {
    border-bottom: none;
  }

  .section h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 1rem;
    padding-left: 0.75rem;
    border-left: 3px solid #ffc107;
  }

  /* 著者カード */
  .author-header {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .author-avatar {
    flex-shrink: 0;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    overflow: hidden;
    background: #fef3c7;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fcd34d;
  }

  .author-avatar img {
    width: 52px;
    height: 52px;
    object-fit: contain;
  }

  .author-meta {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .author-name {
    font-size: 1.2rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
  }

  .author-role {
    font-size: 0.85rem;
    color: #6b7280;
    margin: 0;
  }

  .author-bio {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .author-bio p {
    color: #4b5563;
    line-height: 1.8;
    margin: 0;
  }

  .back-to-home {
    margin-top: 2.5rem;
    text-align: center;
  }

  .back-button {
    display: inline-block;
    padding: 0.65rem 2rem;
    border-radius: 999px;
    background: #fef3c7;
    color: #92400e;
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: none;
    border: 1px solid #fcd34d;
    transition: background 0.2s ease;
  }

  .back-button:hover {
    background: #fde68a;
  }

  @media (max-width: 600px) {
    .author-header {
      gap: 1rem;
    }

    .author-avatar {
      width: 60px;
      height: 60px;
    }

    .author-avatar img {
      width: 44px;
      height: 44px;
    }
  }
</style>
