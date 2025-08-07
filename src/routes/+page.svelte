<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="脳トレ日和は高齢者向けの無料脳トレーニングサイトです。記憶力、計算力、判断力を楽しく鍛える4つのゲームをご用意しています。">
    <meta name="keywords" content="脳トレ,脳トレーニング,記憶力,計算,高齢者,無料ゲーム,認知症予防">
    <meta name="author" content="脳トレ日和運営チーム">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://yoursite.com/">
    <meta property="og:title" content="脳トレ日和 - 楽しく脳を鍛えましょう">
    <meta property="og:description" content="高齢者向けの無料脳トレーニングサイト。記憶力、計算力、判断力を楽しく鍛える4つのゲームで毎日の脳トレ習慣を始めましょう。">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://yoursite.com/">
    <meta property="og:image" content="https://yoursite.com/og-image.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="脳トレ日和 - 楽しく脳を鍛えましょう">
    <meta name="twitter:description" content="高齢者向けの無料脳トレーニングサイト。記憶力、計算力、判断力を楽しく鍛える4つのゲームで毎日の脳トレ習慣を始めましょう。">
    <title>脳トレ日和 - 高齢者向け無料脳トレーニングサイト</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <h1>🧠 脳トレ日和</h1>
        <p class="subtitle">楽しく脳を鍛えましょう</p>
    </header>

    <nav class="main-nav">
        <div class="nav-container">
            <button class="mobile-menu-btn" id="mobile-menu-btn">
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
            </button>
            <ul class="nav-menu" id="nav-menu">
                <li><a href="index.html" class="active">ホーム</a></li>
                <li><a href="about.html">サイトについて</a></li>
                <li><a href="contact.html">お問い合わせ</a></li>
                <li><a href="privacy.html">プライバシーポリシー</a></li>
                <li><a href="terms.html">利用規約</a></li>
            </ul>
        </div>
    </nav>

    <main>
        <!-- セクションタイトル -->
        <div class="section-header">
            <h2 class="section-title">📰 新着記事</h2>
        </div>
        
        <!-- カードコンテナ -->
        <div class="card-container">
            <!-- 新着記事カード -->
            <article class="content-card news-card">
                <div class="card-header">
                    <span class="card-date">2024/01/15</span>
                    <span class="card-tag news-tag">ニュース</span>
                </div>
                <div class="card-image">
                    <div class="image-placeholder news-image">
                        <span class="image-icon">🧠</span>
                    </div>
                </div>
                <div class="card-content">
                    <h3 class="card-title">記憶力ゲームの新しいモードを追加しました</h3>
                    <p class="card-description">より挑戦的な「ハードモード」を追加。上級者の方もお楽しみいただけます。</p>
                </div>
            </article>

            <article class="content-card news-card">
                <div class="card-header">
                    <span class="card-date">2024/01/10</span>
                    <span class="card-tag guide-tag">ガイド</span>
                </div>
                <div class="card-image">
                    <div class="image-placeholder guide-image">
                        <span class="image-icon">📝</span>
                    </div>
                </div>
                <div class="card-content">
                    <h3 class="card-title">脳トレ日和の効果的な使い方ガイド</h3>
                    <p class="card-description">脳トレーニングをより効果的に行うためのコツをご紹介します。</p>
                </div>
            </article>

            <!-- 記憶力ゲームカード -->
            <article class="content-card game-card" data-game="memory">
                <div class="card-header">
                    <span class="card-date">難易度 ★★★</span>
                    <span class="card-tag memory-tag">記憶</span>
                </div>
                <div class="card-image">
                    <div class="image-placeholder memory-image">
                        <span class="game-numbers">1 2 3 4</span>
                    </div>
                </div>
                <div class="card-content">
                    <h3 class="card-title">記憶力ゲーム</h3>
                    <p class="card-description">数字を覚えて同じ順番で入力してください。レベルが上がると桁数が増えます。</p>
                </div>
                <div class="card-overlay">
                    <span class="play-button">プレイする</span>
                </div>
            </article>

            <!-- 計算ゲームカード -->
            <article class="content-card game-card" data-game="calculation">
                <div class="card-header">
                    <span class="card-date">難易度 ★★</span>
                    <span class="card-tag calculation-tag">計算</span>
                </div>
                <div class="card-image">
                    <div class="image-placeholder calculation-image">
                        <span class="game-equation">8 + 4 = ?</span>
                    </div>
                </div>
                <div class="card-content">
                    <h3 class="card-title">計算ゲーム</h3>
                    <p class="card-description">簡単な計算問題に答えてください。足し算、引き算、掛け算があります。</p>
                </div>
                <div class="card-overlay">
                    <span class="play-button">プレイする</span>
                </div>
            </article>

            <!-- 色判別ゲームカード -->
            <article class="content-card game-card" data-game="color">
                <div class="card-header">
                    <span class="card-date">難易度 ★★★★</span>
                    <span class="card-tag color-tag">色判別</span>
                </div>
                <div class="card-image">
                    <div class="image-placeholder color-image">
                        <span class="game-color-text" style="color: red;">青</span>
                    </div>
                </div>
                <div class="card-content">
                    <h3 class="card-title">色判別ゲーム</h3>
                    <p class="card-description">文字の色と文字の内容が同じかどうか答えてください。集中力が試されます。</p>
                </div>
                <div class="card-overlay">
                    <span class="play-button">プレイする</span>
                </div>
            </article>

            <!-- 文字並べゲームカード -->
            <article class="content-card game-card" data-game="word">
                <div class="card-header">
                    <span class="card-date">難易度 ★★★</span>
                    <span class="card-tag word-tag">単語</span>
                </div>
                <div class="card-image">
                    <div class="image-placeholder word-image">
                        <span class="game-scrambled">しんけん → けんしん</span>
                    </div>
                </div>
                <div class="card-content">
                    <h3 class="card-title">文字並べゲーム</h3>
                    <p class="card-description">バラバラになった文字を正しく並べて単語を作ってください。語彙力が鍛えられます。</p>
                </div>
                <div class="card-overlay">
                    <span class="play-button">プレイする</span>
                </div>
            </article>

            <!-- ランキングカード -->
            <article class="content-card ranking-card">
                <div class="card-header">
                    <span class="card-date">更新日時</span>
                    <span class="card-tag ranking-tag">ランキング</span>
                </div>
                <div class="card-image">
                    <div class="image-placeholder ranking-image">
                        <span class="image-icon">🏆</span>
                    </div>
                </div>
                <div class="card-content">
                    <h3 class="card-title">人気ゲームランキング</h3>
                    <div class="ranking-list">
                        <div class="ranking-item">
                            <span class="rank">1位</span>
                            <span class="game-name">記憶力ゲーム</span>
                            <span class="play-count">12,540回</span>
                        </div>
                        <div class="ranking-item">
                            <span class="rank">2位</span>
                            <span class="game-name">計算ゲーム</span>
                            <span class="play-count">9,820回</span>
                        </div>
                        <div class="ranking-item">
                            <span class="rank">3位</span>
                            <span class="game-name">色判別ゲーム</span>
                            <span class="play-count">7,650回</span>
                        </div>
                    </div>
                </div>
            </article>

            <!-- サイト情報カード -->
            <article class="content-card info-card">
                <div class="card-header">
                    <span class="card-date">情報</span>
                    <span class="card-tag info-tag">サイト</span>
                </div>
                <div class="card-image">
                    <div class="image-placeholder info-image">
                        <span class="image-icon">📝</span>
                    </div>
                </div>
                <div class="card-content">
                    <h3 class="card-title">サイト情報</h3>
                    <div class="info-links">
                        <a href="about.html" class="info-link">サイトについて</a>
                        <a href="contact.html" class="info-link">お問い合わせ</a>
                        <a href="privacy.html" class="info-link">プライバシーポリシー</a>
                    </div>
                </div>
            </article>
        </div>

        <!-- ゲームセクションは非表示 -->
        <!-- 記憶力ゲーム -->
        <section id="memory-game" class="game-section" style="display: none;">
            <h3>記憶力ゲーム</h3>
            <p class="game-instruction">表示された数字を覚えて、同じ順番で入力してください</p>
            <div class="memory-display" id="memory-display"></div>
            <div class="memory-input" style="display: none;">
                <input type="text" id="memory-answer" placeholder="覚えた数字を入力">
                <button id="memory-submit">答える</button>
            </div>
            <button id="memory-start">スタート</button>
            <button class="back-btn">メニューに戻る</button>
        </section>

        <!-- 計算ゲーム -->
        <section id="calculation-game" class="game-section" style="display: none;">
            <h3>計算ゲーム</h3>
            <p class="game-instruction">簡単な計算問題に答えてください</p>
            <div class="calculation-problem" id="calculation-problem">
                <span id="calc-display">スタートを押してください</span>
            </div>
            <div class="calculation-input">
                <input type="number" id="calc-answer" placeholder="答えを入力">
                <button id="calc-submit">答える</button>
            </div>
            <button id="calc-start">スタート</button>
            <button class="back-btn">メニューに戻る</button>
        </section>

        <!-- 色判別ゲーム -->
        <section id="color-game" class="game-section" style="display: none;">
            <h3>色判別ゲーム</h3>
            <p class="game-instruction">文字の色と文字の内容が同じかどうか答えてください</p>
            <div class="color-display" id="color-display">
                <span id="color-text">スタートを押してください</span>
            </div>
            <div class="color-buttons">
                <button id="color-same" class="color-btn">同じ</button>
                <button id="color-different" class="color-btn">違う</button>
            </div>
            <button id="color-start">スタート</button>
            <button class="back-btn">メニューに戻る</button>
        </section>

        <!-- 文字並べゲーム -->
        <section id="word-game" class="game-section" style="display: none;">
            <h3>文字並べゲーム</h3>
            <p class="game-instruction">バラバラになった文字を正しく並べて単語を作ってください</p>
            <div class="word-display" id="word-display">
                <span id="scrambled-word">スタートを押してください</span>
            </div>
            <div class="word-input">
                <input type="text" id="word-answer" placeholder="正しい単語を入力">
                <button id="word-submit">答える</button>
            </div>
            <button id="word-start">スタート</button>
            <button class="back-btn">メニューに戻る</button>
        </section>

        <!-- 結果表示 -->
        <section id="result-section" class="result-section" style="display: none;">
            <h3>結果</h3>
            <div id="result-display"></div>
            <button id="continue-btn">続ける</button>
            <button class="back-btn">メニューに戻る</button>
        </section>
    </main>

    <footer>
        <div class="footer-content">
            <p>&copy; 2024 脳トレ日和 - 毎日の脳トレで健康な生活を</p>
            <div class="footer-links">
                <a href="privacy.html">プライバシーポリシー</a>
                <a href="terms.html">利用規約</a>
                <a href="contact.html">お問い合わせ</a>
                <a href="about.html">サイトについて</a>
            </div>
        </div>
    </footer>

    <script src="script.js"></script>
</body>
</html>