<script>
  import { enhance } from '$app/forms';
  
  // 送信状態の管理
  let loading = false;
  
  const submitHandler = () => {
    loading = true;
    return async ({ update, result }) => {
      loading = false;
      await update(); // フォームのクリアやメッセージ表示を自動処理
    };
  };
</script>

<div class="max-w-2xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold text-gray-800 mb-8 text-center">お問い合わせ</h1>

  <form
    method="POST"
    use:enhance={submitHandler}
    class="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4"
  >
    <div class="mb-4">
      <label class="block text-gray-700 text-sm font-bold mb-2" for="name">
        お名前 <span class="text-red-500">*</span>
      </label>
      <input
        class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        id="name"
        name="name"
        type="text"
        placeholder="山田 太郎"
        required
      />
    </div>

    <div class="mb-4">
      <label class="block text-gray-700 text-sm font-bold mb-2" for="email">
        メールアドレス <span class="text-red-500">*</span>
      </label>
      <input
        class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        id="email"
        name="email"
        type="email"
        placeholder="example@email.com"
        required
      />
    </div>

    <div class="mb-4">
      <label class="block text-gray-700 text-sm font-bold mb-2" for="subject">
        件名
      </label>
      <select
        class="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white"
        id="subject"
        name="subject"
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
        class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32"
        id="message"
        name="message"
        required
      ></textarea>
    </div>

    <div class="flex items-center justify-center">
      <button
        class="bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-3 px-8 rounded focus:outline-none focus:shadow-outline transition duration-300 w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
        type="submit"
        disabled={loading}
      >
        {#if loading}
          送信中...
        {:else}
          送信する
        {/if}
      </button>
    </div>
  </form>
</div>