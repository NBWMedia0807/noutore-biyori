<script>
	import { onMount } from 'svelte';

	let { data } = $props();

	const { ga4, adsense, searchConsole, trendingArticles, articleStats, errors, generatedAt, fromCache } = data;

	// Chart canvas refs
	let pvChartEl = $state(null);
	let revenueChartEl = $state(null);
	let sourceChartEl = $state(null);
	let gscChartEl = $state(null);

	// KPI 計算
	const totalPv = ga4?.summary?.totalPv ?? 0;
	const avgDau = ga4?.summary?.avgDau ?? 0;
	const totalRevenue = adsense?.totalEarnings ?? 0;
	const todayRevenue = adsense?.dailyRevenue?.at(-1)?.earnings ?? 0;
	const totalClicks = searchConsole?.dailyClicks?.reduce((s, d) => s + d.clicks, 0) ?? 0;

	function formatYen(val) {
		return val < 1
			? `¥${(val * 100).toFixed(1)}¢`
			: `¥${val.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	}

	function formatDate(iso) {
		return new Date(iso).toLocaleString('ja-JP', {
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Chart.js グラフ設定
	function buildPvDauConfig(metrics) {
		return {
			type: 'line',
			data: {
				labels: metrics.map((d) => d.label),
				datasets: [
					{
						label: 'PV',
						data: metrics.map((d) => d.pv),
						borderColor: '#f59e0b',
						backgroundColor: 'rgba(245,158,11,0.12)',
						tension: 0.4,
						fill: true,
						pointRadius: 2,
						yAxisID: 'y'
					},
					{
						label: 'DAU',
						data: metrics.map((d) => d.dau),
						borderColor: '#ea580c',
						backgroundColor: 'rgba(234,88,12,0.08)',
						tension: 0.4,
						fill: true,
						pointRadius: 2,
						yAxisID: 'y1'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				plugins: { legend: { position: 'top' } },
				scales: {
					y: {
						position: 'left',
						ticks: { font: { size: 11 } },
						title: { display: true, text: 'PV', font: { size: 11 } }
					},
					y1: {
						position: 'right',
						grid: { drawOnChartArea: false },
						ticks: { font: { size: 11 } },
						title: { display: true, text: 'DAU', font: { size: 11 } }
					},
					x: { ticks: { font: { size: 10 }, maxTicksLimit: 10 } }
				}
			}
		};
	}

	function buildRevenueConfig(daily) {
		return {
			type: 'bar',
			data: {
				labels: daily.map((d) => d.label),
				datasets: [
					{
						label: '収益 (USD)',
						data: daily.map((d) => d.earnings),
						backgroundColor: 'rgba(245,158,11,0.75)',
						borderColor: '#f59e0b',
						borderWidth: 1,
						borderRadius: 3
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: { legend: { display: false } },
				scales: {
					y: {
						ticks: {
							font: { size: 11 },
							callback: (v) => `$${v.toFixed(2)}`
						}
					},
					x: { ticks: { font: { size: 10 }, maxTicksLimit: 10 } }
				}
			}
		};
	}

	function buildSourceConfig(sources) {
		const COLORS = ['#f59e0b', '#ea580c', '#ffc107', '#6b7280', '#1f2937', '#fbbf24', '#fb923c'];
		return {
			type: 'doughnut',
			data: {
				labels: sources.map((s) => s.source),
				datasets: [
					{
						data: sources.map((s) => s.sessions),
						backgroundColor: COLORS.slice(0, sources.length),
						borderWidth: 2
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 8 } } }
			}
		};
	}

	function buildGscConfig(daily) {
		return {
			type: 'line',
			data: {
				labels: daily.map((d) => d.label),
				datasets: [
					{
						label: 'クリック数',
						data: daily.map((d) => d.clicks),
						borderColor: '#6366f1',
						backgroundColor: 'rgba(99,102,241,0.1)',
						tension: 0.4,
						fill: true,
						pointRadius: 2
					},
					{
						label: '表示回数',
						data: daily.map((d) => d.impressions),
						borderColor: '#a5b4fc',
						backgroundColor: 'rgba(165,180,252,0.05)',
						tension: 0.4,
						fill: false,
						pointRadius: 2,
						yAxisID: 'y1'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				plugins: { legend: { position: 'top' } },
				scales: {
					y: {
						position: 'left',
						ticks: { font: { size: 11 } },
						title: { display: true, text: 'クリック', font: { size: 11 } }
					},
					y1: {
						position: 'right',
						grid: { drawOnChartArea: false },
						ticks: { font: { size: 11 } },
						title: { display: true, text: '表示回数', font: { size: 11 } }
					},
					x: { ticks: { font: { size: 10 }, maxTicksLimit: 10 } }
				}
			}
		};
	}

	onMount(async () => {
		const { Chart, registerables } = await import('chart.js');
		Chart.register(...registerables);

		const charts = [];

		if (ga4?.dailyMetrics?.length && pvChartEl) {
			charts.push(new Chart(pvChartEl, buildPvDauConfig(ga4.dailyMetrics)));
		}
		if (adsense?.dailyRevenue?.length && revenueChartEl) {
			charts.push(new Chart(revenueChartEl, buildRevenueConfig(adsense.dailyRevenue)));
		}
		if (ga4?.trafficSources?.length && sourceChartEl) {
			charts.push(new Chart(sourceChartEl, buildSourceConfig(ga4.trafficSources)));
		}
		if (searchConsole?.dailyClicks?.length && gscChartEl) {
			charts.push(new Chart(gscChartEl, buildGscConfig(searchConsole.dailyClicks)));
		}

		return () => charts.forEach((c) => c.destroy());
	});
</script>

<svelte:head>
	<title>ダッシュボード | 脳トレ日和 管理</title>
</svelte:head>

<div class="dashboard">
	<!-- ヘッダー -->
	<header class="dash-header">
		<div class="header-left">
			<span class="header-icon">🧠</span>
			<div>
				<h1>BIダッシュボード</h1>
				<p class="header-sub">脳トレ日和 — 直近30日間のデータ</p>
			</div>
		</div>
		<div class="header-right">
			{#if fromCache}
				<span class="cache-badge">キャッシュ済み</span>
			{/if}
			<span class="updated">更新: {formatDate(generatedAt)}</span>
			<a href="/admin/dashboard?refresh=1" class="btn-refresh">🔄 更新</a>
			<a href="/admin/logout" class="btn-logout">ログアウト</a>
		</div>
	</header>

	<!-- エラーバナー -->
	{#each Object.entries(errors).filter(([, v]) => v) as [key, msg]}
		<div class="error-banner">
			<strong>{key}:</strong> {msg}
		</div>
	{/each}

	<!-- KPI カード -->
	<section class="kpi-grid">
		<div class="kpi-card">
			<div class="kpi-icon" style="background:#fef3c7">📈</div>
			<div>
				<p class="kpi-label">PV合計（30日）</p>
				<p class="kpi-value">{totalPv.toLocaleString('ja-JP')}</p>
			</div>
		</div>
		<div class="kpi-card">
			<div class="kpi-icon" style="background:#fef3c7">👥</div>
			<div>
				<p class="kpi-label">DAU平均（30日）</p>
				<p class="kpi-value">{avgDau.toLocaleString('ja-JP')}</p>
			</div>
		</div>
		<div class="kpi-card">
			<div class="kpi-icon" style="background:#dcfce7">💴</div>
			<div>
				<p class="kpi-label">AdSense収益（30日）</p>
				<p class="kpi-value">{formatYen(totalRevenue)}</p>
				{#if todayRevenue > 0}
					<p class="kpi-sub">昨日: {formatYen(todayRevenue)}</p>
				{/if}
			</div>
		</div>
		<div class="kpi-card">
			<div class="kpi-icon" style="background:#ede9fe">🔍</div>
			<div>
				<p class="kpi-label">検索クリック（30日）</p>
				<p class="kpi-value">{totalClicks.toLocaleString('ja-JP')}</p>
			</div>
		</div>
		{#if articleStats}
			<div class="kpi-card">
				<div class="kpi-icon" style="background:#e0f2fe">📝</div>
				<div>
					<p class="kpi-label">記事総数</p>
					<p class="kpi-value">{articleStats.total}</p>
					<p class="kpi-sub">直近30日: +{articleStats.publishedThisMonth}件</p>
				</div>
			</div>
		{/if}
	</section>

	<!-- メインチャートエリア -->
	<div class="chart-grid">
		<!-- PV / DAU 折れ線 -->
		<div class="chart-card wide">
			<h2>PV / DAU 推移（30日）</h2>
			{#if ga4?.dailyMetrics?.length}
				<div class="chart-wrap">
					<canvas bind:this={pvChartEl}></canvas>
				</div>
			{:else}
				<p class="no-data">GA4 データ取得エラー: {errors.ga4 ?? 'データなし'}</p>
			{/if}
		</div>

		<!-- トラフィックソース ドーナツ -->
		<div class="chart-card">
			<h2>トラフィックソース</h2>
			{#if ga4?.trafficSources?.length}
				<div class="chart-wrap" style="max-height:260px">
					<canvas bind:this={sourceChartEl}></canvas>
				</div>
				<table class="mini-table" style="margin-top:0.75rem">
					<thead>
						<tr><th>ソース</th><th>セッション</th></tr>
					</thead>
					<tbody>
						{#each ga4.trafficSources as src}
							<tr>
								<td>{src.source}</td>
								<td class="num">{src.sessions.toLocaleString('ja-JP')}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<p class="no-data">データなし</p>
			{/if}
		</div>
	</div>

	<!-- 収益 + GSC クリック -->
	<div class="chart-grid">
		<!-- 収益棒グラフ -->
		<div class="chart-card">
			<h2>AdSense 収益推移（30日）</h2>
			{#if adsense?.dailyRevenue?.length}
				<div class="chart-wrap">
					<canvas bind:this={revenueChartEl}></canvas>
				</div>
			{:else}
				<p class="no-data">AdSense データ取得エラー: {errors.adsense ?? 'データなし'}</p>
			{/if}
		</div>

		<!-- GSC クリック折れ線 -->
		<div class="chart-card">
			<h2>検索クリック / 表示回数（30日）</h2>
			{#if searchConsole?.dailyClicks?.length}
				<div class="chart-wrap">
					<canvas bind:this={gscChartEl}></canvas>
				</div>
			{:else}
				<p class="no-data">Search Console データ取得エラー: {errors.searchConsole ?? 'データなし'}</p>
			{/if}
		</div>
	</div>

	<!-- 下段テーブルエリア -->
	<div class="table-grid">
		<!-- トレンド記事 -->
		<div class="table-card">
			<h2>最新記事 TOP20</h2>
			{#if trendingArticles?.length}
				<div class="table-scroll">
					<table class="data-table">
						<thead>
							<tr>
								<th>#</th>
								<th>タイトル</th>
								<th>カテゴリ</th>
								<th>公開日</th>
								<th>PV</th>
							</tr>
						</thead>
						<tbody>
							{#each trendingArticles as art, i}
								<tr>
									<td class="rank">{i + 1}</td>
									<td>
										<a href="/quiz/{art.slug}" target="_blank" rel="noopener" class="article-link">
											{art.title}
										</a>
									</td>
									<td><span class="badge">{art.category ?? '—'}</span></td>
									<td class="date">{art.publishedAt ? new Date(art.publishedAt).toLocaleDateString('ja-JP') : '—'}</td>
									<td class="num">{art.viewCount?.toLocaleString('ja-JP') ?? '—'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="no-data">記事データなし</p>
			{/if}
		</div>

		<!-- 右カラム -->
		<div class="right-col">
			<!-- GSC 上位クエリ -->
			<div class="table-card">
				<h2>検索クエリ TOP20</h2>
				{#if searchConsole?.topQueries?.length}
					<div class="table-scroll">
						<table class="data-table">
							<thead>
								<tr>
									<th>クエリ</th>
									<th>クリック</th>
									<th>表示</th>
									<th>CTR</th>
									<th>順位</th>
								</tr>
							</thead>
							<tbody>
								{#each searchConsole.topQueries as q}
									<tr>
										<td class="query-cell">{q.key}</td>
										<td class="num">{q.clicks}</td>
										<td class="num">{q.impressions.toLocaleString('ja-JP')}</td>
										<td class="num">{q.ctr}%</td>
										<td class="num">{q.position}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="no-data">データなし</p>
				{/if}
			</div>

			<!-- GA4 上位ページ -->
			<div class="table-card" style="margin-top:1rem">
				<h2>GA4 上位ページ TOP20</h2>
				{#if ga4?.topPages?.length}
					<div class="table-scroll">
						<table class="data-table">
							<thead>
								<tr>
									<th>ページ</th>
									<th>PV</th>
								</tr>
							</thead>
							<tbody>
								{#each ga4.topPages as p}
									<tr>
										<td class="query-cell">
											<a href={p.path} target="_blank" rel="noopener" class="article-link">{p.path}</a>
										</td>
										<td class="num">{p.pv.toLocaleString('ja-JP')}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="no-data">データなし</p>
				{/if}
			</div>

			<!-- カテゴリ別記事数 -->
			{#if articleStats?.byCategory?.length}
				<div class="table-card" style="margin-top:1rem">
					<h2>カテゴリ別記事数</h2>
					<div class="table-scroll">
						<table class="data-table">
							<thead>
								<tr><th>カテゴリ</th><th>記事数</th></tr>
							</thead>
							<tbody>
								{#each articleStats.byCategory as cat}
									<tr>
										<td>{cat.title}</td>
										<td class="num">{cat.count}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.dashboard {
		padding: 1.25rem;
		max-width: 1400px;
		margin: 0 auto;
		color: #1f2937;
	}

	/* ヘッダー */
	.dash-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem;
		background: #fff;
		padding: 1rem 1.25rem;
		border-radius: 0.75rem;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
		margin-bottom: 1.25rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.header-icon {
		font-size: 2rem;
	}

	.dash-header h1 {
		font-size: 1.25rem;
		font-weight: 700;
		line-height: 1.2;
	}

	.header-sub {
		font-size: 0.8rem;
		color: #6b7280;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		flex-wrap: wrap;
	}

	.updated {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.cache-badge {
		font-size: 0.7rem;
		background: #e0f2fe;
		color: #0369a1;
		padding: 0.2rem 0.5rem;
		border-radius: 9999px;
	}

	.btn-refresh,
	.btn-logout {
		font-size: 0.8125rem;
		padding: 0.4rem 0.875rem;
		border-radius: 0.4rem;
		text-decoration: none;
		font-weight: 600;
		transition: background 0.15s;
	}

	.btn-refresh {
		background: #fef3c7;
		color: #92400e;
	}

	.btn-refresh:hover {
		background: #fde68a;
	}

	.btn-logout {
		background: #fee2e2;
		color: #991b1b;
	}

	.btn-logout:hover {
		background: #fecaca;
	}

	/* エラーバナー */
	.error-banner {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 0.625rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		margin-bottom: 0.75rem;
	}

	/* KPI グリッド */
	.kpi-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.875rem;
		margin-bottom: 1.25rem;
	}

	.kpi-card {
		background: #fff;
		border-radius: 0.75rem;
		padding: 1rem 1.125rem;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
		display: flex;
		align-items: center;
		gap: 0.875rem;
	}

	.kpi-icon {
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 0.625rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.375rem;
		flex-shrink: 0;
	}

	.kpi-label {
		font-size: 0.75rem;
		color: #6b7280;
		margin-bottom: 0.125rem;
	}

	.kpi-value {
		font-size: 1.375rem;
		font-weight: 700;
		color: #1f2937;
		line-height: 1.2;
	}

	.kpi-sub {
		font-size: 0.7rem;
		color: #9ca3af;
		margin-top: 0.125rem;
	}

	/* チャートグリッド */
	.chart-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.chart-card {
		background: #fff;
		border-radius: 0.75rem;
		padding: 1.125rem;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
	}

	.chart-card.wide {
		grid-column: span 1;
	}

	.chart-card h2 {
		font-size: 0.9375rem;
		font-weight: 700;
		margin-bottom: 0.875rem;
		color: #374151;
	}

	.chart-wrap {
		height: 220px;
		position: relative;
	}

	/* テーブルグリッド */
	.table-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
		align-items: start;
	}

	.right-col {
		display: flex;
		flex-direction: column;
	}

	.table-card {
		background: #fff;
		border-radius: 0.75rem;
		padding: 1.125rem;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
	}

	.table-card h2 {
		font-size: 0.9375rem;
		font-weight: 700;
		margin-bottom: 0.875rem;
		color: #374151;
	}

	.table-scroll {
		overflow-x: auto;
	}

	/* テーブル共通 */
	.data-table,
	.mini-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
	}

	.data-table th,
	.mini-table th {
		text-align: left;
		padding: 0.5rem 0.5rem;
		border-bottom: 2px solid #f3f4f6;
		color: #6b7280;
		font-weight: 600;
		font-size: 0.75rem;
		white-space: nowrap;
	}

	.data-table td,
	.mini-table td {
		padding: 0.5rem 0.5rem;
		border-bottom: 1px solid #f9fafb;
		vertical-align: middle;
	}

	.data-table tbody tr:hover,
	.mini-table tbody tr:hover {
		background: #fafafa;
	}

	.rank {
		width: 2rem;
		color: #9ca3af;
		font-weight: 600;
		font-size: 0.75rem;
	}

	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.date {
		white-space: nowrap;
		color: #9ca3af;
		font-size: 0.75rem;
	}

	.query-cell {
		max-width: 220px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.article-link {
		color: #1f2937;
		text-decoration: none;
		font-weight: 500;
	}

	.article-link:hover {
		color: #f59e0b;
		text-decoration: underline;
	}

	.badge {
		background: #fef3c7;
		color: #92400e;
		padding: 0.15rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.7rem;
		white-space: nowrap;
	}

	.no-data {
		color: #9ca3af;
		font-size: 0.875rem;
		padding: 1.5rem 0;
		text-align: center;
	}

	/* レスポンシブ */
	@media (max-width: 900px) {
		.chart-grid,
		.table-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 600px) {
		.dashboard {
			padding: 0.75rem;
		}

		.kpi-grid {
			grid-template-columns: 1fr 1fr;
		}

		.dash-header h1 {
			font-size: 1rem;
		}
	}
</style>
