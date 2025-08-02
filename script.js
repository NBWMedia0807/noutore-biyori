class BrainTrainingGame {
    constructor() {
        this.currentGame = null;
        this.score = 0;
        this.level = 1;
        this.init();
    }

    init() {
        this.bindEvents();
        this.initMobileMenu();
        this.showMenu();
    }

    bindEvents() {
        // カード形式のゲームボタンイベント
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const gameType = e.currentTarget.dataset.game;
                this.startGame(gameType);
            });
        });
        
        // タイル形式のゲームボタンイベント（後方互換性のため）
        document.querySelectorAll('.tile-game').forEach(tile => {
            tile.addEventListener('click', (e) => {
                const gameType = e.currentTarget.dataset.game;
                this.startGame(gameType);
            });
        });
        
        // 従来のゲームボタンイベント（後方互換性のため）
        document.querySelectorAll('.game-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gameType = e.target.dataset.game;
                this.startGame(gameType);
            });
        });

        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showMenu();
            });
        });

        document.getElementById('memory-start').addEventListener('click', () => {
            this.startMemoryGame();
        });

        document.getElementById('memory-submit').addEventListener('click', () => {
            this.checkMemoryAnswer();
        });

        document.getElementById('calc-start').addEventListener('click', () => {
            this.startCalculationGame();
        });

        document.getElementById('calc-submit').addEventListener('click', () => {
            this.checkCalculationAnswer();
        });

        document.getElementById('color-start').addEventListener('click', () => {
            this.startColorGame();
        });

        document.getElementById('color-same').addEventListener('click', () => {
            this.checkColorAnswer(true);
        });

        document.getElementById('color-different').addEventListener('click', () => {
            this.checkColorAnswer(false);
        });

        document.getElementById('word-start').addEventListener('click', () => {
            this.startWordGame();
        });

        document.getElementById('word-submit').addEventListener('click', () => {
            this.checkWordAnswer();
        });

        document.getElementById('continue-btn').addEventListener('click', () => {
            this.continueGame();
        });

        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (this.currentGame === 'memory' && document.getElementById('memory-answer').style.display !== 'none') {
                    this.checkMemoryAnswer();
                } else if (this.currentGame === 'calculation') {
                    this.checkCalculationAnswer();
                } else if (this.currentGame === 'word') {
                    this.checkWordAnswer();
                }
            }
        });
    }

    initMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const navMenu = document.getElementById('nav-menu');
        
        if (mobileMenuBtn && navMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                mobileMenuBtn.classList.toggle('active');
            });

            // メニュー外をクリックしたときに閉じる
            document.addEventListener('click', (e) => {
                if (!mobileMenuBtn.contains(e.target) && !navMenu.contains(e.target)) {
                    navMenu.classList.remove('active');
                    mobileMenuBtn.classList.remove('active');
                }
            });

            // ナビゲーションリンクをクリックしたときにメニューを閉じる
            navMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                    mobileMenuBtn.classList.remove('active');
                });
            });
        }
    }

    showMenu() {
        document.querySelectorAll('.game-section, .result-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // カードコンテナを表示
        const cardContainer = document.querySelector('.card-container');
        if (cardContainer) {
            cardContainer.style.display = 'grid';
        }
        
        // セクションヘッダーを表示
        const sectionHeader = document.querySelector('.section-header');
        if (sectionHeader) {
            sectionHeader.style.display = 'block';
        }
        
        // タイルコンテナは非表示
        const tileContainer = document.querySelector('.tile-container');
        if (tileContainer) {
            tileContainer.style.display = 'none';
        }
        
        // 従来のゲームメニューは非表示のまま
        const gameMenu = document.querySelector('.game-menu');
        if (gameMenu) {
            gameMenu.style.display = 'none';
        }
        
        this.currentGame = null;
        this.score = 0;
        this.level = 1;
    }

    startGame(gameType) {
        // カードコンテナを非表示
        const cardContainer = document.querySelector('.card-container');
        if (cardContainer) {
            cardContainer.style.display = 'none';
        }
        
        // セクションヘッダーを非表示
        const sectionHeader = document.querySelector('.section-header');
        if (sectionHeader) {
            sectionHeader.style.display = 'none';
        }
        
        // タイルコンテナを非表示
        const tileContainer = document.querySelector('.tile-container');
        if (tileContainer) {
            tileContainer.style.display = 'none';
        }
        
        // 従来のゲームメニューも非表示
        const gameMenu = document.querySelector('.game-menu');
        if (gameMenu) {
            gameMenu.style.display = 'none';
        }
        
        // 全ゲームセクションを非表示
        document.querySelectorAll('.game-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // 選択されたゲームを表示
        document.getElementById(`${gameType}-game`).style.display = 'block';
        this.currentGame = gameType;
    }

    startMemoryGame() {
        const display = document.getElementById('memory-display');
        const input = document.querySelector('.memory-input');
        const answerField = document.getElementById('memory-answer');
        
        input.style.display = 'none';
        answerField.value = '';
        
        const length = Math.min(3 + this.level, 8);
        this.memorySequence = '';
        for (let i = 0; i < length; i++) {
            this.memorySequence += Math.floor(Math.random() * 10);
        }
        
        display.textContent = this.memorySequence;
        
        setTimeout(() => {
            display.textContent = '？？？';
            input.style.display = 'block';
            answerField.focus();
        }, 2000 + (length * 200));
    }

    checkMemoryAnswer() {
        const answer = document.getElementById('memory-answer').value;
        const isCorrect = answer === this.memorySequence;
        
        if (isCorrect) {
            this.score += 10;
            this.level++;
        }
        
        this.showResult(isCorrect, `正解: ${this.memorySequence}`);
    }

    startCalculationGame() {
        const display = document.getElementById('calc-display');
        const answerField = document.getElementById('calc-answer');
        
        answerField.value = '';
        
        const num1 = Math.floor(Math.random() * (10 + this.level * 5)) + 1;
        const num2 = Math.floor(Math.random() * (10 + this.level * 5)) + 1;
        const operators = ['+', '-', '×'];
        const operator = operators[Math.floor(Math.random() * operators.length)];
        
        let result;
        switch (operator) {
            case '+':
                result = num1 + num2;
                break;
            case '-':
                result = Math.abs(num1 - num2);
                display.textContent = `${Math.max(num1, num2)} ${operator} ${Math.min(num1, num2)} = ?`;
                this.calculationAnswer = result;
                return;
            case '×':
                result = num1 * num2;
                break;
        }
        
        display.textContent = `${num1} ${operator} ${num2} = ?`;
        this.calculationAnswer = result;
        answerField.focus();
    }

    checkCalculationAnswer() {
        const answer = parseInt(document.getElementById('calc-answer').value);
        const isCorrect = answer === this.calculationAnswer;
        
        if (isCorrect) {
            this.score += 10;
            this.level++;
        }
        
        this.showResult(isCorrect, `正解: ${this.calculationAnswer}`);
    }

    startColorGame() {
        const display = document.getElementById('color-text');
        const colors = [
            { name: '赤', color: 'red' },
            { name: '青', color: 'blue' },
            { name: '緑', color: 'green' },
            { name: '黄', color: 'yellow' },
            { name: '紫', color: 'purple' }
        ];
        
        const textColor = colors[Math.floor(Math.random() * colors.length)];
        const displayColor = colors[Math.floor(Math.random() * colors.length)];
        
        display.textContent = textColor.name;
        display.style.color = displayColor.color;
        
        this.colorMatch = textColor.name === displayColor.name;
    }

    checkColorAnswer(userAnswer) {
        const isCorrect = userAnswer === this.colorMatch;
        
        if (isCorrect) {
            this.score += 10;
            this.level++;
        }
        
        this.showResult(isCorrect, this.colorMatch ? '正解: 同じ' : '正解: 違う');
    }

    startWordGame() {
        const display = document.getElementById('scrambled-word');
        const answerField = document.getElementById('word-answer');
        
        answerField.value = '';
        
        const words = [
            'さくら', 'やま', 'うみ', 'そら', 'はな', 'つき', 'ほし', 'かぜ',
            'みず', 'ひ', 'あめ', 'ゆき', 'みち', 'いえ', 'くるま', 'でんしゃ',
            'がっこう', 'びょういん', 'こうえん', 'としょかん'
        ];
        
        this.originalWord = words[Math.floor(Math.random() * words.length)];
        const scrambled = this.scrambleWord(this.originalWord);
        
        display.textContent = scrambled;
        answerField.focus();
    }

    scrambleWord(word) {
        const chars = word.split('');
        for (let i = chars.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        return chars.join('');
    }

    checkWordAnswer() {
        const answer = document.getElementById('word-answer').value;
        const isCorrect = answer === this.originalWord;
        
        if (isCorrect) {
            this.score += 10;
            this.level++;
        }
        
        this.showResult(isCorrect, `正解: ${this.originalWord}`);
    }

    showResult(isCorrect, correctAnswer) {
        document.querySelectorAll('.game-section').forEach(section => {
            section.style.display = 'none';
        });
        
        const resultSection = document.getElementById('result-section');
        const resultDisplay = document.getElementById('result-display');
        
        let message = isCorrect ? 
            `🎉 正解です！\n${correctAnswer}\n現在のスコア: ${this.score}点\nレベル: ${this.level}` :
            `❌ 残念！\n${correctAnswer}\n現在のスコア: ${this.score}点\nレベル: ${this.level}`;
        
        resultDisplay.innerHTML = message.replace(/\n/g, '<br>');
        resultSection.style.display = 'block';
    }

    continueGame() {
        document.getElementById('result-section').style.display = 'none';
        document.getElementById(`${this.currentGame}-game`).style.display = 'block';
        
        switch (this.currentGame) {
            case 'memory':
                this.startMemoryGame();
                break;
            case 'calculation':
                this.startCalculationGame();
                break;
            case 'color':
                this.startColorGame();
                break;
            case 'word':
                this.startWordGame();
                break;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BrainTrainingGame();
});