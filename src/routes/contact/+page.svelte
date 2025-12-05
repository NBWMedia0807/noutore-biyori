<script>
	import { enhance } from '$app/forms';
	// 送信中のローディング状態を管理
	let loading = false;

	export let form;

	const submitHandler = () => {
		loading = true;
		return async ({ update }) => {
			loading = false;
			await update(); 
		};
	};
</script>

<div class="max-w-2xl mx-auto px-4 py-8">
	<h1 class="text-3xl font-bold text-gray-800 mb-8 text-center">お問い合わせ</h1>

	{#if form?.success}
		<div
			class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4"
			role="alert"
		>
			<strong class="font-bold">送信完了！</strong>
			<span class="block sm:inline">お問い合わせいただきありがとうございます。</span>
		</div>
	{:else}
		<form
			method="POST"
			use:enhance={submitHandler}
			class="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4"
		>
			{#if form?.message}
				<div
					class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
					role="alert"
				>
					<span class="block sm:inline">{form.message}</span>
				</div>
			{/if}

			<div class="mb-4">
				<label class="block text-gray-700 text-sm font-bold mb-2" for="name">
					お名前 <span class="text-red-500">*</span>
				</label>
				<input
					class:border-red-500={form?.errors?.name}
					class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
					id="name"
					name="name"
					type="text"
					required
					value={form?.data?.name ?? ''}
				/>
				{#if form?.errors?.name}
					<p class="text-red-500 text-xs italic">{form.errors.name}</p>
				{/if}
			</div>

			<div class="mb-4">
				<label class="block text-gray-700 text-sm font-bold mb-2" for="email">
					メールアドレス <span class="text-red-500">*</span>
				</label>
				<input
					class:border-red-500={form?.errors?.email}
					class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
					id="email"
					name="email"
					type="email"
					required
					value={form?.data?.email ?? ''}
				/>
				{#if form?.errors?.email}
					<p class="text-red-500 text-xs italic">{form.errors.email}</p>
				{/if}
			</div>

			<div class="mb-4">
				<label class="block text-gray-700 text-sm font-bold mb-2" for="subject"> 件名 </label>
				<select
					class="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white"
					id="subject"
					name="subject"
					value={form?.data?.subject ?? 'ご質問'}
				>
					<option value="ご質問">ご質問</option>
					<option value="ご意見">ご意見</option>
					<option value="不具合報告">不具合報告</option>
					<option value="その他">その他</option>
				</select>
			</div>

			<div class="mb-6">
				<label class="block text-gray-700 text-sm font-bold mb-2" for="message">
					お問い合わせ内容 <span class="text-red-500">*</span>
				</label>
				<textarea
					class:border-red-500={form?.errors?.message}
					class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32"
					id="message"
					name="message"
					required
				>{form?.data?.message ?? ''}</textarea>
				{#if form?.errors?.message}
					<p class="text-red-500 text-xs italic">{form.errors.message}</p>
				{/if}
			</div>

			<div class="flex items-center justify-center">
				<button
					class="bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-3 px-8 rounded focus:outline-none focus:shadow-outline transition duration-300 w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
					type="submit"
					disabled={loading}
				>
					{loading ? '送信中...' : '送信する'}
				</button>
			</div>
		</form>
	{/if}
</div>