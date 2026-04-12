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

  <section class="section">
    <h2>運営会社</h2>
    <table class="info-table">
      <tbody>
        <tr>
          <th>会社名</th>
          <td>合同会社NBWMedia</td>
        </tr>
        <tr>
          <th>運営メディア</th>
          <td>脳トレ日和</td>
        </tr>
        <tr>
          <th>所在地</th>
          <td>東京都中央区銀座1丁目12番4号</td>
        </tr>
        <tr>
          <th>設立</th>
          <td>2026年4月</td>
        </tr>
        <tr>
          <th>事業内容</th>
          <td>Webメディア運営・コンテンツ制作</td>
        </tr>
      </tbody>
    </table>
    <p class="company-link">詳細は<a href="/about">会社概要ページ</a>をご覧ください。</p>
  </section>
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

  /* 会社情報テーブル */
  .info-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
  }

  .info-table th,
  .info-table td {
    padding: 0.65rem 1rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
    font-size: 0.9rem;
    vertical-align: top;
  }

  .info-table th {
    color: #1f2937;
    font-weight: 600;
    width: 35%;
    background: #fafafa;
  }

  .info-table td {
    color: #4b5563;
  }

  .company-link {
    font-size: 0.9rem;
    color: #6b7280;
    margin: 0;
  }

  .company-link a {
    color: #d97706;
    text-decoration: none;
  }

  .company-link a:hover {
    text-decoration: underline;
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

    .info-table th {
      width: 40%;
    }

    .info-table th,
    .info-table td {
      padding: 0.5rem 0.6rem;
      font-size: 0.85rem;
    }
  }
</style>
