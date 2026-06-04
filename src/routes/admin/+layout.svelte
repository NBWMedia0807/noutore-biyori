<script>
	let { children } = $props();
</script>

<div class="admin-shell">
	{@render children()}
</div>

<style>
	.admin-shell {
		min-height: 100vh;
		background: #f3f4f6;
		font-family: 'Hiragino Sans', 'BIZ UDPGothic', system-ui, sans-serif;
	}
</style>
