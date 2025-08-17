<script>
  // 一時的に準備中表示のみ
</script>

<svelte:head>
  <title>クイズ - 脳トレ日和</title>
  <meta name="description" content="脳トレ日和のクイズページです。現在準備中です。" />
</svelte:head>

<main>
  <div class="section-header">
    <h1 class="section-title">🧩 クイズ</h1>
  </div>

  <div class="coming-soon-container">
    <div class="coming-soon-content">
      <div class="icon">🚧</div>
      <h2>クイズ機能 準備中</h2>
      <p>現在、新しいクイズ機能を準備しております。</p>
      <p>マッチ棒クイズや間違い探しなど、楽しいクイズを近日公開予定です。</p>
      <p>もうしばらくお待ちください。</p>
      
      <div class="back-link">
        <a href="/" class="back-button">🏠 ホームに戻る</a>
      </div>
    </div>
  </div>
</main>

<style>
  main {
    max-width: 1000px;
    margin: 0 auto;
    padding: 1rem;
  }

  .coming-soon-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
    padding: 2rem;
  }

  .coming-soon-content {
    text-align: center;
    background: var(--white);
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    padding: 3rem 2rem;
    max-width: 500px;
    border-left: 4px solid var(--primary-yellow);
  }

  .icon {
    font-size: 4rem;
    margin-bottom: 1.5rem;
  }

  .coming-soon-content h2 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--dark-gray);
    margin-bottom: 1.5rem;
  }

  .coming-soon-content p {
    font-size: 1.1rem;
    line-height: 1.6;
    color: var(--medium-gray);
    margin-bottom: 1rem;
  }

  .back-link {
    margin-top: 2rem;
  }

  .back-button {
    background: var(--primary-yellow);
    color: #856404;
    text-decoration: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    transition: all 0.3s ease;
    display: inline-block;
  }

  .back-button:hover {
    background: var(--primary-amber);
    transform: translateY(-2px);
  }

  /* レスポンシブデザイン */
  @media (max-width: 768px) {
    .coming-soon-content {
      padding: 2rem 1.5rem;
      margin: 0 1rem;
    }

    .coming-soon-content h2 {
      font-size: 1.5rem;
    }

    .coming-soon-content p {
      font-size: 1rem;
    }

    .icon {
      font-size: 3rem;
    }
  }
</style>

