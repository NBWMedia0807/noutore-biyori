<script>
  import SectionIcon from '$lib/components/SectionIcon.svelte';
  import { enhance } from '$app/forms';

  export let form;
  let loading = false;

  const subjectOptions = [
    { value: 'game', label: 'ゲームについて' },
    { value: 'bug', label: '不具合の報告' },
    { value: 'suggestion', label: '改善提案' },
    { value: 'other', label: 'その他' }
  ];
</script>

<div class="content-page">
  <section class="page-content">
    <h2 class="page-title">お問い合わせ</h2>

    <div class="contact-intro">
      <p>脳トレ日和をご利用いただき、ありがとうございます。ご質問、ご意見、ご要望などございましたら、下記のフォームよりお気軽にお寄せください。</p>
      <p class="operation-start">運用開始月：2025年9月</p>
    </div>

    <div class="contact-form-section">
      {#if form?.success}
        <div class="form-feedback success-message" role="status">
          お問い合わせを送信しました。2〜3営業日以内に担当者よりご連絡いたします。
        </div>
      {:else}
        <form
          class="contact-form"
          method="POST"
          use:enhance={() => {
            loading = true;
            return async ({ update }) => {
              await update();
              loading = false;
            };
          }}
        >
          <div class="form-group">
            <label for="name">お名前 <span class="required">*</span></label>
            <input
              type="text"
              id="name"
              name="name"
              autocomplete="name"
              value={form?.data?.name ?? ''}
              aria-invalid={Boolean(form?.errors?.name)}
              aria-describedby={form?.errors?.name ? 'error-name' : undefined}
              class:input-error={Boolean(form?.errors?.name)}
              required
            />
            {#if form?.errors?.name}
              <p id="error-name" class="error-message" role="alert">{form.errors.name}</p>
            {/if}
          </div>

          <div class="form-group">
            <label for="email">メールアドレス <span class="required">*</span></label>
            <input
              type="email"
              id="email"
              name="email"
              autocomplete="email"
              value={form?.data?.email ?? ''}
              aria-invalid={Boolean(form?.errors?.email)}
              aria-describedby={form?.errors?.email ? 'error-email' : undefined}
              class:input-error={Boolean(form?.errors?.email)}
              required
            />
            {#if form?.errors?.email}
              <p id="error-email" class="error-message" role="alert">{form.errors.email}</p>
            {/if}
          </div>

          <div class="form-group">
            <label for="subject">件名 <span class="required">*</span></label>
            <select
              id="subject"
              name="subject"
              value={form?.data?.subject ?? ''}
              aria-invalid={Boolean(form?.errors?.subject)}
              aria-describedby={form?.errors?.subject ? 'error-subject' : undefined}
              class:input-error={Boolean(form?.errors?.subject)}
              required
            >
              <option value="">選択してください</option>
              {#each subjectOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
            {#if form?.errors?.subject}
              <p id="error-subject" class="error-message" role="alert">{form.errors.subject}</p>
            {/if}
          </div>

          <div class="form-group">
            <label for="message">お問い合わせ内容 <span class="required">*</span></label>
            <textarea
              id="message"
              name="message"
              rows="6"
              placeholder="お問い合わせ内容をご記入ください"
              value={form?.data?.message ?? ''}
              aria-invalid={Boolean(form?.errors?.message)}
              aria-describedby={form?.errors?.message ? 'error-message' : undefined}
              class:input-error={Boolean(form?.errors?.message)}
              required
            ></textarea>
            {#if form?.errors?.message}
              <p id="error-message" class="error-message" role="alert">{form.errors.message}</p>
            {/if}
          </div>

          <div class="form-group">
            <button type="submit" class="submit-button" disabled={loading}>
              {loading ? '送信中...' : '送信する'}
            </button>
          </div>
        </form>

        {#if form?.errors?.general}
          <p class="form-feedback error-message" role="alert">
            {form.errors.general}
          </p>
        {/if}
      {/if}
    </div>

    <div class="contact-info">
      <h3><SectionIcon name="clock-icon" className="section-icon" /> お問い合わせに関する注意事項</h3>
      <ul class="info-list">
        <li>お返事には数日お時間をいただく場合がございます</li>
        <li>内容によってはお返事できない場合もございます</li>
        <li>個人情報は適切に管理し、お問い合わせ対応以外には使用いたしません</li>
        <li>営業目的のお問い合わせはご遠慮ください</li>
      </ul>
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

  .operation-start {
    margin-top: 1rem;
    color: #a08000;
    font-weight: 600;
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

  .input-error {
    border-color: #f59e0b;
    background: rgba(254, 243, 199, 0.3);
  }

  .error-message {
    margin-top: 0.5rem;
    color: #b45309;
    font-size: 0.9rem;
    line-height: 1.5;
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

  .submit-button:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 4px 15px rgba(255, 235, 59, 0.2);
  }

  .form-feedback {
    margin-top: 1.5rem;
    padding: 1rem 1.25rem;
    border-radius: 12px;
    font-weight: 600;
    text-align: center;
    line-height: 1.6;
  }

  .form-feedback.success-message {
    background: rgba(187, 247, 208, 0.5);
    color: #166534;
    border: 1px solid rgba(22, 101, 52, 0.3);
  }

  .form-feedback.error-message {
    background: rgba(254, 215, 170, 0.4);
    color: #9a3412;
    border: 1px solid rgba(154, 52, 18, 0.3);
  }

  .contact-info {
    background: white;
    padding: 2rem;
    border-radius: 15px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }

  .contact-info h3 {
    font-size: 1.5rem;
    color: #2d3436;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  :global(.section-icon) {
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
    .contact-info {
      padding: 1.5rem;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      padding: 0.8rem;
    }
  }
</style>

