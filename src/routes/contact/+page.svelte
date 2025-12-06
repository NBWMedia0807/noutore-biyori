<script>
	import { enhance } from '$app/forms';
	// navigating は二重送信防止には不十分なので使いません
	import SectionIcon from '$lib/components/SectionIcon.svelte';

	export let form;
	
	// 【修正】送信中かどうかを管理する専用の変数
	let loading = false;

	// 【修正】送信開始と終了を確実に検知するハンドラ
	const submitHandler = () => {
		loading = true; // 送信開始：ボタンをロック
		return async ({ update }) => {
			loading = false; // 処理終了：ロック解除
			await update(); 
		};
	};
</script>

<div class="content-page">
	<section class="page-content">
		<h2 class="page-title">お問い合わせ</h2>

		<div class="contact-section">
			{#if form?.success}
				<div class="success-message" role="alert">
					<p class="font-bold">送信完了！</p>
					<p>お問い合わせいただきありがとうございます。</p>
				</div>
			{:else}
				<p class="form-description">
					ご意見、ご感想、不具合のご報告など、お気軽にお寄せください。
				</p>
				<form method="POST" use:enhance={submitHandler}>
					{#if form?.message && !form.success}
						<div class="error-message" role="alert">
							<p>{form.message}</p>
						</div>
					{/if}

					<div class="form-group">
						<label for="name">
							お名前 <span class="required">*</span>
						</label>
						<input
							class:invalid={form?.errors?.name}
							id="name"
							name="name"
							type="text"
							required
							value={form?.data?.name ?? ''}
						/>
						{#if form?.errors?.name}
							<p class="error-text">{form.errors.name}</p>
						{/if}
					</div>

					<div class="form-group">
						<label for="email">
							メールアドレス <span class="required">*</span>
						</label>
						<input
							class:invalid={form?.errors?.email}
							id="email"
							name="email"
							type="email"
							required
							value={form?.data?.email ?? ''}
						/>
						{#if form?.errors?.email}
							<p class="error-text">{form.errors.email}</p>
						{/if}
					</div>

					<div class="form-group">
						<label for="subject">件名</label>
						<select id="subject" name="subject" value={form?.data?.subject ?? 'ご質問'}>
							<option value="ご質問">ご質問</option>
							<option value="ご意見">ご意見</option>
							<option value="不具合報告">不具合報告</option>
							<option value="その他">その他</option>
						</select>
					</div>

					<div class="form-group">
						<label for="message">
							お問い合わせ内容 <span class="required">*</span>
						</label>
						<textarea
							class:invalid={form?.errors?.message}
							id="message"
							name="message"
							required
							rows="6"
						>{form?.data?.message ?? ''}</textarea>
						{#if form?.errors?.message}
							<p class="error-text">{form.errors.message}</p>
						{/if}
					</div>

					<div class="form-actions">
						<button type="submit" disabled={loading}>
							{loading ? '送信中...' : '送信する'}
						</button>
					</div>
				</form>
			{/if}
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

	.contact-section {
		background: white;
		padding: 2.5rem;
		border-radius: 15px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
	}

	.form-description {
		text-align: center;
		color: #636e72;
		margin-bottom: 2rem;
		line-height: 1.8;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		color: #2d3436;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	input,
	textarea,
	select {
		width: 100%;
		padding: 0.8rem 1rem;
		border: 1px solid #dfe6e9;
		border-radius: 8px;
		font-size: 1rem;
		color: #2d3436;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	input:focus,
	textarea:focus,
	select:focus {
		outline: none;
		border-color: #a08000;
		box-shadow: 0 0 0 3px rgba(255, 224, 130, 0.5);
	}

	select {
		appearance: none;
		background-color: #ffffff;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23636e72'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.7rem center;
		background-size: 1.2em;
	}

	.required {
		color: #d63031;
		font-size: 0.9em;
		margin-left: 4px;
	}

	.form-actions {
		text-align: center;
		margin-top: 2rem;
	}

	button {
		background: linear-gradient(135deg, #ffe082 0%, #fffacd 100%);
		color: #a08000;
		border: none;
		padding: 1rem 2.5rem;
		font-size: 1.1rem;
		font-weight: 600;
		border-radius: 25px;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 4px 15px rgba(255, 235, 59, 0.3);
	}

	button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(255, 235, 59, 0.4);
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.success-message {
		background-color: #e6fffa;
		border: 1px solid #38c172;
		color: #1f9d55;
		padding: 1.5rem;
		border-radius: 8px;
		text-align: center;
		line-height: 1.6;
	}

	.error-message {
		background-color: #fff5f5;
		border: 1px solid #e53e3e;
		color: #c53030;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.error-text {
		color: #c53030;
		font-size: 0.875rem;
		margin-top: 0.25rem;
	}

	input.invalid,
	textarea.invalid {
		border-color: #e53e3e;
	}

	@media (max-width: 768px) {
		.content-page {
			padding: 1rem;
		}

		.page-title {
			font-size: 2rem;
			padding: 1rem;
		}

		.contact-section {
			padding: 1.5rem;
		}
	}
</style>