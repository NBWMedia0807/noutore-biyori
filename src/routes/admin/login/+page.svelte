<script>
	let { form } = $props();
</script>

<svelte:head>
	<title>管理者ログイン | 脳トレ日和</title>
</svelte:head>

<div class="login-wrapper">
	<div class="login-card">
		<div class="logo">🧠</div>
		<h1>脳トレ日和 管理</h1>
		<p class="subtitle">BIダッシュボード</p>

		{#if form?.error}
			<div class="error">{form.error}</div>
		{/if}

		<form method="POST">
			<label for="password">パスワード</label>
			<input
				id="password"
				name="password"
				type="password"
				placeholder="管理者パスワードを入力"
				required
				autocomplete="current-password"
			/>
			<button type="submit">ログイン</button>
		</form>
	</div>
</div>

<style>
	.login-wrapper {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
		padding: 1rem;
	}

	.login-card {
		background: #fff;
		border-radius: 1rem;
		padding: 2.5rem 2rem;
		width: 100%;
		max-width: 360px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
		text-align: center;
	}

	.logo {
		font-size: 3rem;
		margin-bottom: 0.5rem;
	}

	h1 {
		font-size: 1.25rem;
		font-weight: 700;
		color: #1f2937;
		margin-bottom: 0.25rem;
	}

	.subtitle {
		font-size: 0.875rem;
		color: #6b7280;
		margin-bottom: 1.5rem;
	}

	.error {
		background: #fee2e2;
		color: #dc2626;
		border-radius: 0.5rem;
		padding: 0.625rem 1rem;
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		text-align: left;
	}

	label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 1.5px solid #d1d5db;
		border-radius: 0.5rem;
		font-size: 1rem;
		outline: none;
		transition: border-color 0.15s;
	}

	input:focus {
		border-color: #f59e0b;
		box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
	}

	button {
		width: 100%;
		padding: 0.75rem;
		background: #f59e0b;
		color: #fff;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
		margin-top: 0.25rem;
	}

	button:hover {
		background: #d97706;
	}
</style>
