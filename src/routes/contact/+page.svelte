<div class="content-page">
  <section class="page-content">
    <h2 class="page-title">お問い合わせ</h2>
    
    <div class="contact-intro">
      <p>脳トレ日和をご利用いただき、ありがとうございます。ご質問、ご意見、ご要望などございましたら、下記のフォームよりお気軽にお寄せください。</p>
    </div>

    <div class="contact-form-section">
      <form class="contact-form">
        <div class="form-group">
          <label for="name">お名前 <span class="required">*</span></label>
          <input type="text" id="name" name="name" required>
        </div>

        <div class="form-group">
          <label for="email">メールアドレス <span class="required">*</span></label>
          <input type="email" id="email" name="email" required>
        </div>

        <div class="form-group">
          <label for="subject">件名 <span class="required">*</span></label>
          <select id="subject" name="subject" required>
            <option value="">選択してください</option>
            <option value="game">ゲームについて</option>
            <option value="bug">不具合の報告</option>
            <option value="suggestion">改善提案</option>
            <option value="other">その他</option>
          </select>
        </div>

        <div class="form-group">
          <label for="message">お問い合わせ内容 <span class="required">*</span></label>
          <textarea id="message" name="message" rows="6" required placeholder="お問い合わせ内容をご記入ください"></textarea>
        </div>

        <div class="form-group">
          <button type="submit" class="submit-button">送信する</button>
        </div>
      </form>
    </div>

    <div class="contact-info">
      <h3><img src="/icons/clock-icon.png" alt="注意事項" class="section-icon" /> お問い合わせに関する注意事項</h3>
      <ul class="info-list">
        <li>お返事には数日お時間をいただく場合がございます</li>
        <li>内容によってはお返事できない場合もございます</li>
        <li>個人情報は適切に管理し、お問い合わせ対応以外には使用いたしません</li>
        <li>営業目的のお問い合わせはご遠慮ください</li>
      </ul>
    </div>

    <div class="faq-section">
      <h3><img src="/icons/text-icon.png" alt="よくある質問" class="section-icon" /> よくある質問</h3>
      
      <div class="faq-item">
        <h4>Q. ゲームが正常に動作しません</h4>
        <p>A. ブラウザのキャッシュをクリアしていただくか、別のブラウザでお試しください。それでも解決しない場合は、お使いのデバイスとブラウザの情報を添えてお問い合わせください。</p>
      </div>

      <div class="faq-item">
        <h4>Q. スマートフォンでも利用できますか？</h4>
        <p>A. はい、スマートフォンやタブレットでもご利用いただけます。レスポンシブデザインに対応しており、画面サイズに合わせて最適化されます。</p>
      </div>

      <div class="faq-item">
        <h4>Q. 利用料金はかかりますか？</h4>
        <p>A. 脳トレ日和は完全無料でご利用いただけます。登録も不要です。</p>
      </div>

      <div class="faq-item">
        <h4>Q. 新しいゲームの追加予定はありますか？</h4>
        <p>A. ユーザーの皆様からのご要望を参考に、定期的に新しいゲームの追加を検討しております。ご希望がございましたらお気軽にお聞かせください。</p>
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

  .contact-intro {
    background: white;
    padding: 2rem;
    border-radius: 15px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
    text-align: center;
  }

  .contact-intro p {
    color: #636e72;
    line-height: 1.8;
    margin: 0;
  }

  .contact-form-section {
    background: white;
    padding: 2rem;
    border-radius: 15px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }

  .contact-form {
    max-width: 600px;
    margin: 0 auto;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    color: #2d3436;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .required {
    color: #e74c3c;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 1rem;
    border: 2px solid #dee2e6;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.3s ease;
    box-sizing: border-box;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #ffe082;
    box-shadow: 0 0 0 3px rgba(255, 224, 130, 0.2);
  }

  .submit-button {
    background: linear-gradient(135deg, #ffe082 0%, #fffacd 100%);
    color: #a08000;
    border: none;
    padding: 1rem 2rem;
    border-radius: 25px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(255, 235, 59, 0.3);
    width: 100%;
  }

  .submit-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(255, 235, 59, 0.4);
  }

  .contact-info,
  .faq-section {
    background: white;
    padding: 2rem;
    border-radius: 15px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }

  .contact-info h3,
  .faq-section h3 {
    font-size: 1.5rem;
    color: #2d3436;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .section-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }

  .info-list {
    list-style: none;
    padding: 0;
  }

  .info-list li {
    color: #636e72;
    line-height: 1.8;
    margin-bottom: 0.8rem;
    padding-left: 1.5rem;
    position: relative;
  }

  .info-list li::before {
    content: "•";
    position: absolute;
    left: 0;
    color: #a08000;
    font-weight: bold;
  }

  .faq-item {
    margin-bottom: 1.5rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, #fffacd 0%, #fff0b3 100%);
    border-radius: 12px;
    border: 2px solid rgba(255, 235, 59, 0.2);
  }

  .faq-item h4 {
    color: #2d3436;
    margin-bottom: 0.8rem;
    font-size: 1.1rem;
  }

  .faq-item p {
    color: #636e72;
    line-height: 1.6;
    margin: 0;
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

    .contact-form-section,
    .contact-info,
    .faq-section {
      padding: 1.5rem;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      padding: 0.8rem;
    }
  }
</style>

