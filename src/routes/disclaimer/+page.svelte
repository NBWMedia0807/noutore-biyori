<script>
  import SectionIcon from '$lib/components/SectionIcon.svelte';
</script>

<div class="content-page">
  <section class="page-content">
    <h2 class="page-title">免責事項</h2>

    <div class="policy-intro">
      <p>脳トレ日和（以下「当サイト」）のコンテンツおよび広告をご利用いただく際の注意事項と責任範囲について定めています。ご利用の前に必ずご一読ください。</p>
      <p class="last-updated">最終更新日：2025年9月1日</p>
    </div>

    <div class="policy-section">
      <h3><SectionIcon name="news-icon" className="section-icon" /> 広告掲載について</h3>
      <div class="policy-content">
        <p>当サイトでは、第三者の広告配信サービスを利用して広告を掲載しています。広告の内容や表示方法は広告配信事業者が管理しており、当サイトは広告内容の正確性・信頼性・合法性を保証するものではありません。</p>
        <ul>
          <li>広告から表示される商品・サービスの品質や提供条件を保証いたしません。</li>
          <li>広告表示によって生じるいかなる損害についても責任を負いかねます。</li>
          <li>広告に関するお問い合わせは、直接広告主または広告配信事業者へご連絡ください。</li>
        </ul>
      </div>
    </div>

    <div class="policy-section">
      <h3><SectionIcon name="features-icon" className="section-icon" /> 広告の閲覧・クリック後の責任</h3>
      <div class="policy-content">
        <p>広告をクリックした後の閲覧・利用・購入などの行為は、ユーザーご自身の判断と責任において行ってください。当サイトはユーザーと広告主との間で発生した取引やトラブルに一切関与いたしません。</p>
        <ul>
          <li>購入や申込を行う前に、広告主の利用規約や個人情報保護方針をご確認ください。</li>
          <li>広告経由で発生した金銭的損害、紛争、契約上の問題について当サイトは責任を負いません。</li>
          <li>広告先で入力する個人情報や決済情報の取扱いについては、各広告主の責任で管理されています。</li>
        </ul>
      </div>
    </div>

    <div class="policy-section">
      <h3><SectionIcon name="home-icon" className="section-icon" /> 外部リンクについて</h3>
      <div class="policy-content">
        <p>当サイトのコンテンツ内には外部サイトへのリンクが含まれる場合があります。リンク先のサイトは当サイトの管理下にないため、掲載情報の正確性、安全性、合法性を保証するものではありません。</p>
        <ul>
          <li>外部リンク先で提供される商品・サービス・情報の利用により生じたいかなる損害についても責任を負いかねます。</li>
          <li>リンク先の利用規約やプライバシーポリシーを必ずご確認ください。</li>
          <li>リンク先の情報が変更・削除されている場合がありますので、最新の情報をご自身でご確認ください。</li>
        </ul>
      </div>
    </div>

    <div class="policy-section">
      <h3><SectionIcon name="clock-icon" className="section-icon" /> 情報の正確性と更新について</h3>
      <div class="policy-content">
        <p>当サイトでは、正確で最新の情報を提供するよう努めていますが、掲載内容の完全性・正確性・最新性を保証するものではありません。</p>
        <ul>
          <li>コンテンツの情報が最新でない場合や誤りが含まれる場合があります。</li>
          <li>予告なく情報の更新・修正・削除を行うことがあります。</li>
          <li>当サイトの情報を利用した結果生じた損害については、当サイトでは責任を負いません。</li>
        </ul>
        <p>誤りや不明点を発見された場合は、<a href="/contact">お問い合わせフォーム</a>よりお知らせいただけますと幸いです。</p>
      </div>
    </div>

    <div class="policy-section">
      <h3><SectionIcon name="text-icon" className="section-icon" /> 免責事項の変更</h3>
      <div class="policy-content">
        <p>本免責事項の内容は、必要に応じて予告なく変更することがあります。重要な変更がある場合は、当サイト上にてお知らせします。</p>
        <p>変更後の免責事項は、当サイトに掲載された時点で効力を生じるものとします。</p>
      </div>
    </div>

    <div class="policy-section">
      <h3><SectionIcon name="trophy-icon" className="section-icon" /> お問い合わせ窓口</h3>
      <div class="policy-content">
        <p>免責事項に関するご質問やご意見がございましたら、<a href="/contact">お問い合わせフォーム</a>よりご連絡ください。</p>
        <div class="contact-info">
          <h4>運営者情報</h4>
          <table class="info-table">
            <tbody>
            <tr>
              <th>サイト名</th>
              <td>脳トレ日和</td>
            </tr>
            <tr>
              <th>運営者</th>
              <td>脳トレ日和運営チーム</td>
            </tr>
            <tr>
              <th>運用開始月</th>
              <td>2025年9月</td>
            </tr>
            <tr>
              <th>連絡先</th>
              <td><a href="/contact">お問い合わせフォーム</a></td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="back-to-home">
      <a href="/" class="back-button">ホームに戻る</a>
    </div>
  </section>
</div>

<style>
  .content-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .page-title {
    font-size: 2.5rem;
    color: #2d3436;
    text-align: center;
    margin-bottom: 2rem;
    background: linear-gradient(135deg, #fffacd 0%, #fff0b3 100%);
    padding: 1.5rem;
    border-radius: 15px;
    box-shadow: 0 8px 32px rgba(255, 235, 59, 0.1);
  }

  .policy-intro {
    background: white;
    padding: 2rem;
    border-radius: 15px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
    text-align: center;
  }

  .policy-intro p {
    color: #636e72;
    line-height: 1.8;
    margin-bottom: 1rem;
  }

  .last-updated {
    font-size: 0.9rem;
    color: #a08000;
    font-weight: 600;
  }

  .policy-section {
    background: white;
    padding: 2rem;
    border-radius: 15px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }

  .policy-section h3 {
    font-size: 1.5rem;
    color: #2d3436;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-bottom: 2px solid #fffacd;
    padding-bottom: 0.5rem;
  }

  :global(.section-icon) {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }

  .policy-content h4 {
    color: #2d3436;
    margin: 1.5rem 0 1rem 0;
    font-size: 1.2rem;
  }

  .policy-content p {
    color: #636e72;
    line-height: 1.8;
    margin-bottom: 1rem;
  }

  .policy-content ul {
    color: #636e72;
    line-height: 1.8;
    margin-bottom: 1rem;
    padding-left: 1.5rem;
  }

  .policy-content li {
    margin-bottom: 0.5rem;
  }

  .policy-content a {
    color: #a08000;
    text-decoration: none;
  }

  .policy-content a:hover {
    text-decoration: underline;
  }

  .contact-info {
    background: linear-gradient(135deg, #fffacd 0%, #fff0b3 100%);
    padding: 1.5rem;
    border-radius: 12px;
    margin-top: 1.5rem;
  }

  .info-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
  }

  .info-table th, .info-table td {
    padding: 0.8rem;
    text-align: left;
    border-bottom: 1px solid #dee2e6;
  }

  .info-table th {
    background: rgba(255, 250, 205, 0.5);
    color: #2d3436;
    font-weight: 600;
    width: 30%;
  }

  .info-table td {
    color: #636e72;
  }

  .info-table a {
    color: #a08000;
    text-decoration: none;
  }

  .info-table a:hover {
    text-decoration: underline;
  }

  .back-to-home {
    text-align: center;
  }

  .back-button {
    display: inline-block;
    background: linear-gradient(135deg, #ffe082 0%, #fffacd 100%);
    color: #a08000;
    text-decoration: none;
    padding: 1rem 2rem;
    border-radius: 25px;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(255, 235, 59, 0.3);
  }

  .back-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(255, 235, 59, 0.4);
  }

  @media (max-width: 768px) {
    .content-page {
      padding: 1rem;
    }

    .page-title {
      font-size: 2rem;
      padding: 1rem;
    }

    .policy-section {
      padding: 1.5rem;
    }

    .policy-section h3 {
      font-size: 1.3rem;
    }

    .info-table th, .info-table td {
      padding: 0.6rem;
    }
  }
</style>
