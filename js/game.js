/**
 * 迷宫冒险 - 核心游戏逻辑
 * 性能优化：离屏渲染、局部重绘、对象池
 */

class MazeGame {
    constructor() {
        this.mazeGen = new MazeGenerator();
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        // 游戏状态
        this.state = 'loading'; // loading, cover, tutorial, playing, paused, complete
        this.level = 1;
        this.maxLevels = 5;
        this.player = { x: 0, y: 0 };
        this.maze = null;
        this.starsCollected = 0;
        this.totalSteps = 0;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.timerInterval = null;

        // 渲染优化
        this.cellSize = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.needsRedraw = true;
        this.animationId = null;
        this.offscreenCanvas = null;
        this.offscreenCtx = null;

        // 配置
        this.config = {
            baseSize: 21,
            sizeIncrement: 4,
            colors: {
                background: '#1e293b',
                wall: '#94a3b8',
                wallBorder: '#cbd5e1',
                player: '#fbbf24',
                playerGlow: 'rgba(251,191,36,0.3)',
                exit: '#059669',
                exitGlow: 'rgba(5,150,105,0.3)',
                star: '#f59e0b',
                path: '#1e293b',
                fog: 'rgba(15,23,42,0.6)'
            }
        };

        // 成就定义
        this.achievementsDef = [
            { id: 'first_win', name: '初次通关', desc: '完成第一关', icon: '🏁', condition: (s) => s.level >= 2 },
            { id: 'speed_run', name: '速度之王', desc: '60秒内完成一关', icon: '⚡', condition: (s) => s.time <= 60 && s.won },
            { id: 'star_collector', name: '星星收集者', desc: '单关收集全部星星', icon: '⭐', condition: (s) => s.stars === 3 && s.won },
            { id: 'marathon', name: '迷宫马拉松', desc: '累计移动500步', icon: '👣', condition: (s) => s.totalSteps >= 500 },
            { id: 'master', name: '迷宫大师', desc: '通关全部5关', icon: '👑', condition: (s) => s.level > 5 },
            { id: 'perfect', name: '完美挑战', desc: '不收集星星直接通关', icon: '🎯', condition: (s) => s.stars === 0 && s.won }
        ];

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadData();
        this.simulateLoading();
    }

    // 模拟加载进度
    simulateLoading() {
        let progress = 0;
        const bar = document.getElementById('loading-progress');
        const interval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(() => this.showScreen('cover'), 300);
            }
            bar.style.width = progress + '%';
        }, 200);
    }

    // 设置事件监听
    setupEventListeners() {
        // 键盘控制
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // 按钮事件
        document.getElementById('btn-start').addEventListener('click', () => this.startGame());
        document.getElementById('btn-leaderboard').addEventListener('click', () => this.showLeaderboard());
        document.getElementById('btn-achievements').addEventListener('click', () => this.showAchievements());
        document.getElementById('btn-about').addEventListener('click', () => this.openAbout());
        document.getElementById('btn-tutorial-ok').addEventListener('click', () => this.closeTutorial());
        document.getElementById('btn-pause').addEventListener('click', () => this.pauseGame());
        document.getElementById('btn-resume').addEventListener('click', () => this.resumeGame());
        document.getElementById('btn-pause-restart').addEventListener('click', () => this.restartLevel());
        document.getElementById('btn-pause-menu').addEventListener('click', () => this.backToMenu());
        document.getElementById('btn-pause-about').addEventListener('click', () => this.openAbout());
        document.getElementById('btn-restart-level').addEventListener('click', () => this.restartLevel());
        document.getElementById('btn-back-menu').addEventListener('click', () => this.backToMenu());
        document.getElementById('btn-next-level').addEventListener('click', () => this.nextLevel());
        document.getElementById('btn-share').addEventListener('click', () => this.shareScore());
        document.getElementById('btn-complete-menu').addEventListener('click', () => this.backToMenu());
        document.getElementById('btn-clear-leaderboard').addEventListener('click', () => this.clearLeaderboard());
        document.getElementById('btn-leaderboard-back').addEventListener('click', () => this.backFromLeaderboard());
        document.getElementById('btn-achievements-back').addEventListener('click', () => this.backFromAchievements());
        document.getElementById('btn-copy-share').addEventListener('click', () => this.copyShareText());
        document.getElementById('btn-close-share').addEventListener('click', () => this.closeShare());

        // 排行榜标签切换
        document.querySelectorAll('.leaderboard-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchLeaderboardTab(e.target.dataset.tab));
        });

        // 简历侧边栏切换
        const resumeToggle = document.getElementById('resume-toggle');
        const resumeSidebar = document.getElementById('resume-sidebar');
        if (resumeToggle && resumeSidebar) {
            resumeToggle.addEventListener('click', () => {
                resumeSidebar.classList.toggle('collapsed');
            });
            
            // 默认在移动端收起
            if (window.innerWidth <= 900) {
                resumeSidebar.classList.add('collapsed');
            }
        }

        // 窗口大小变化
        window.addEventListener('resize', () => this.handleResize());
    }

    // 加载本地数据
    loadData() {
        try {
            this.leaderboard = JSON.parse(localStorage.getItem('maze_leaderboard')) || [];
            this.achievements = JSON.parse(localStorage.getItem('maze_achievements')) || {};
            this.settings = JSON.parse(localStorage.getItem('maze_settings')) || { skipTutorial: false };
        } catch (e) {
            this.leaderboard = [];
            this.achievements = {};
            this.settings = { skipTutorial: false };
        }
    }

    // 保存数据
    saveData() {
        localStorage.setItem('maze_leaderboard', JSON.stringify(this.leaderboard));
        localStorage.setItem('maze_achievements', JSON.stringify(this.achievements));
        localStorage.setItem('maze_settings', JSON.stringify(this.settings));
    }

    // 切换屏幕
    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

        const screenMap = {
            'loading': 'loading-screen',
            'cover': 'cover-screen',
            'tutorial': 'tutorial-screen',
            'playing': 'game-screen',
            'paused': 'pause-screen',
            'complete': 'level-complete-screen',
            'leaderboard': 'leaderboard-screen',
            'achievements': 'achievements-screen',
            'share': 'share-screen'
        };

        const screenId = screenMap[screenName];
        if (screenId) {
            document.getElementById(screenId).classList.add('active');
        }

        this.state = screenName;
    }

    // 开始游戏
    startGame() {
        this.level = 1;
        this.totalSteps = 0;

        if (!this.settings.skipTutorial) {
            this.showScreen('tutorial');
        } else {
            this.loadLevel();
        }
    }

    // 关闭教程
    closeTutorial() {
        const skip = document.getElementById('skip-tutorial').checked;
        if (skip) {
            this.settings.skipTutorial = true;
            this.saveData();
        }
        this.loadLevel();
    }

    // 加载关卡
    loadLevel() {
        const size = this.config.baseSize + (this.level - 1) * this.config.sizeIncrement;
        this.maze = this.mazeGen.generate(size, size);
        this.player = { x: 0, y: 0 };
        this.starsCollected = 0;
        this.totalSteps = 0;
        this.elapsedTime = 0;

        document.getElementById('level-num').textContent = this.level;
        document.getElementById('steps').textContent = '0';
        document.getElementById('score').textContent = '0';
        document.getElementById('timer').textContent = '00:00';

        this.showScreen('playing');
        
        // 等待DOM渲染完成后再计算布局
        // 使用双重requestAnimationFrame确保DOM完全渲染
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.calculateLayout();
                this.startTimer();
                this.needsRedraw = true;
                this.startRenderLoop();
            });
        });
    }

    // 计算布局
    calculateLayout() {
        const wrapper = document.querySelector('.game-canvas-wrapper');
        
        // 获取wrapper尺寸，如果获取不到则使用默认值
        const maxW = Math.max(wrapper?.clientWidth - 16 || 800, 200);
        const maxH = Math.max(wrapper?.clientHeight - 16 || 600, 200);

        const cellW = Math.floor(maxW / this.maze.width);
        const cellH = Math.floor(maxH / this.maze.height);
        
        // 确保cellSize至少为10
        this.cellSize = Math.max(Math.min(cellW, cellH, 40), 10);

        const canvasW = this.cellSize * this.maze.width;
        const canvasH = this.cellSize * this.maze.height;

        this.canvas.width = canvasW;
        this.canvas.height = canvasH;
        this.canvas.style.width = canvasW + 'px';
        this.canvas.style.height = canvasH + 'px';

        this.offsetX = 0;
        this.offsetY = 0;

        // 创建离屏canvas缓存静态迷宫
        this.createOffscreenCache();
    }

    // 创建离屏canvas缓存静态迷宫
    createOffscreenCache() {
        if (!this.maze || this.cellSize <= 0) return;
        
        const cs = this.cellSize;
        const maze = this.maze;
        
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.canvas.width;
        this.offscreenCanvas.height = this.canvas.height;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: false });
        
        const ctx = this.offscreenCtx;
        
        // 先填充整个画布为墙壁颜色（深色，不可进入）
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 使用BFS找到所有可达的通道格子
        const reachable = this.mazeGen.getReachableCells(maze.cells, maze.width, maze.height);
        
        // 绘制通道（浅色，可进入）
        ctx.fillStyle = '#374151'; // 通道颜色比墙壁浅
        for (const pos of reachable) {
            const px = pos.x * cs;
            const py = pos.y * cs;
            ctx.fillRect(px, py, cs, cs);
        }
        
        // 绘制墙壁边框（粗线条，不可进入）
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 5;
        ctx.lineCap = 'square';
        
        // 只在可达区域周围绘制墙壁边框
        for (const pos of reachable) {
            const x = pos.x;
            const y = pos.y;
            const idx = y * maze.width + x;
            const cell = maze.cells[idx];
            const px = x * cs;
            const py = y * cs;
            
            ctx.beginPath();
            if (cell & 1) { // 上墙
                ctx.moveTo(px, py);
                ctx.lineTo(px + cs, py);
            }
            if (cell & 2) { // 右墙
                ctx.moveTo(px + cs, py);
                ctx.lineTo(px + cs, py + cs);
            }
            if (cell & 4) { // 下墙
                ctx.moveTo(px, py + cs);
                ctx.lineTo(px + cs, py + cs);
            }
            if (cell & 8) { // 左墙
                ctx.moveTo(px, py);
                ctx.lineTo(px, py + cs);
            }
            ctx.stroke();
        }
        
        // 添加通道网格线（细线条）
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1;
        for (const pos of reachable) {
            const px = pos.x * cs;
            const py = pos.y * cs;
            ctx.strokeRect(px, py, cs, cs);
        }
    }

    // 开始计时
    startTimer() {
        this.startTime = Date.now();
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (this.state === 'playing') {
                this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
                const mins = Math.floor(this.elapsedTime / 60).toString().padStart(2, '0');
                const secs = (this.elapsedTime % 60).toString().padStart(2, '0');
                document.getElementById('timer').textContent = `${mins}:${secs}`;
            }
        }, 1000);
    }

    // 停止计时
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    // 渲染循环
    startRenderLoop() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        const loop = () => {
            if (this.state === 'playing' || this.state === 'paused') {
                this.render();
            }
            this.animationId = requestAnimationFrame(loop);
        };
        this.animationId = requestAnimationFrame(loop);
    }

    // 渲染迷宫（使用离屏canvas缓存静态部分）
    render() {
        // 如果cellSize为0，不渲染
        if (this.cellSize <= 0) return;
        
        const ctx = this.ctx;
        const cs = this.cellSize;
        const maze = this.maze;
        const colors = this.config.colors;

        // 绘制静态迷宫（从离屏canvas复制）
        if (this.offscreenCanvas) {
            ctx.drawImage(this.offscreenCanvas, 0, 0);
        } else {
            // 如果离屏canvas不存在，创建它
            this.createOffscreenCache();
            if (this.offscreenCanvas) {
                ctx.drawImage(this.offscreenCanvas, 0, 0);
            }
        }

        // 绘制动态元素：星星
        ctx.font = `${cs * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const star of maze.stars) {
            if (!star.collected) {
                const sx = star.x * cs + cs / 2;
                const sy = star.y * cs + cs / 2;
                ctx.fillText('⭐', sx, sy);
            }
        }

        // 绘制动态元素：出口
        const ex = maze.endX * cs + cs / 2;
        const ey = maze.endY * cs + cs / 2;
        ctx.font = `${cs * 0.7}px Arial`;
        ctx.fillText('🏁', ex, ey);

        // 绘制动态元素：玩家
        const px = this.player.x * cs + cs / 2;
        const py = this.player.y * cs + cs / 2;
        const pr = cs * 0.35;

        // 玩家光晕
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, cs);
        gradient.addColorStop(0, colors.playerGlow);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.player.x * cs, this.player.y * cs, cs, cs);

        // 玩家本体
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fillStyle = colors.player;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // 键盘处理
    handleKeyDown(e) {
        if (this.state !== 'playing') return;

        const keyMap = {
            'ArrowUp': { dx: 0, dy: -1 },
            'ArrowDown': { dx: 0, dy: 1 },
            'ArrowLeft': { dx: -1, dy: 0 },
            'ArrowRight': { dx: 1, dy: 0 },
            'w': { dx: 0, dy: -1 },
            'W': { dx: 0, dy: -1 },
            's': { dx: 0, dy: 1 },
            'S': { dx: 0, dy: 1 },
            'a': { dx: -1, dy: 0 },
            'A': { dx: -1, dy: 0 },
            'd': { dx: 1, dy: 0 },
            'D': { dx: 1, dy: 0 }
        };

        if (keyMap[e.key]) {
            e.preventDefault();
            this.movePlayer(keyMap[e.key].dx, keyMap[e.key].dy);
        }

        if (e.key === 'Escape') {
            this.pauseGame();
        }
    }

    // 移动玩家
    movePlayer(dx, dy) {
        const nx = this.player.x + dx;
        const ny = this.player.y + dy;

        if (nx < 0 || nx >= this.maze.width || ny < 0 || ny >= this.maze.height) return;

        // 检查墙壁
        if (this.mazeGen.hasWall(this.maze, this.player.x, this.player.y, nx, ny)) return;

        this.player.x = nx;
        this.player.y = ny;
        this.totalSteps++;
        this.needsRedraw = true;

        document.getElementById('steps').textContent = this.totalSteps;

        // 检查星星收集
        for (const star of this.maze.stars) {
            if (!star.collected && star.x === nx && star.y === ny) {
                star.collected = true;
                this.starsCollected++;
                document.getElementById('score').textContent = this.starsCollected;
                this.showFloatingText('⭐ +1', nx, ny);
            }
        }

        // 检查到达出口
        if (nx === this.maze.endX && ny === this.maze.endY) {
            this.levelComplete();
        }
    }

    // 显示浮动文字（简单版）
    showFloatingText(text, x, y) {
        // 可在后续增强
        this.needsRedraw = true;
    }

    // 关卡完成
    levelComplete() {
        this.stopTimer();

        const score = this.calculateScore();
        const won = true;

        // 检查成就
        const unlocked = this.checkAchievements({
            level: this.level,
            time: this.elapsedTime,
            steps: this.totalSteps,
            stars: this.starsCollected,
            totalSteps: this.getTotalStepsFromStorage() + this.totalSteps,
            won: won
        });

        // 保存记录
        this.saveRecord(score);

        // 显示结算画面
        document.getElementById('complete-time').textContent = this.formatTime(this.elapsedTime);
        document.getElementById('complete-steps').textContent = this.totalSteps;
        document.getElementById('complete-stars').textContent = `${this.starsCollected}/3`;
        document.getElementById('complete-score').textContent = score;

        // 显示解锁的成就
        const popup = document.getElementById('achievements-popup');
        popup.innerHTML = '';
        if (unlocked.length > 0) {
            unlocked.forEach(a => {
                popup.innerHTML += `
                    <div class="achievement-unlock">
                        <span style="font-size:1.5rem">${a.icon}</span>
                        <div style="text-align:left">
                            <div style="font-weight:600">解锁成就：${a.name}</div>
                            <div style="font-size:0.8rem;color:var(--text-muted)">${a.desc}</div>
                        </div>
                    </div>
                `;
            });
        }

        // 最后一关显示不同按钮
        const nextBtn = document.getElementById('btn-next-level');
        if (this.level >= this.maxLevels) {
            nextBtn.textContent = '恭喜通关！';
            nextBtn.disabled = true;
            nextBtn.style.opacity = '0.5';
        } else {
            nextBtn.textContent = '下一关';
            nextBtn.disabled = false;
            nextBtn.style.opacity = '1';
        }

        this.showScreen('complete');
    }

    // 计算得分
    calculateScore() {
        const baseScore = 1000;
        const timeBonus = Math.max(0, 300 - this.elapsedTime) * 2;
        const stepBonus = Math.max(0, 200 - this.totalSteps);
        const starBonus = this.starsCollected * 500;
        const levelBonus = this.level * 200;
        return baseScore + timeBonus + stepBonus + starBonus + levelBonus;
    }

    // 格式化时间
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    // 获取累计步数
    getTotalStepsFromStorage() {
        return parseInt(localStorage.getItem('maze_total_steps') || '0');
    }

    // 保存记录
    saveRecord(score) {
        const record = {
            name: '匿名玩家',
            level: this.level,
            time: this.elapsedTime,
            steps: this.totalSteps,
            stars: this.starsCollected,
            score: score,
            date: new Date().toISOString()
        };
        this.leaderboard.push(record);
        this.leaderboard.sort((a, b) => b.score - a.score);
        if (this.leaderboard.length > 50) this.leaderboard = this.leaderboard.slice(0, 50);
        this.saveData();

        // 累计步数
        const total = this.getTotalStepsFromStorage() + this.totalSteps;
        localStorage.setItem('maze_total_steps', total.toString());
    }

    // 检查成就
    checkAchievements(stats) {
        const unlocked = [];
        for (const def of this.achievementsDef) {
            if (!this.achievements[def.id] && def.condition(stats)) {
                this.achievements[def.id] = {
                    unlockedAt: new Date().toISOString()
                };
                unlocked.push(def);
            }
        }
        if (unlocked.length > 0) this.saveData();
        return unlocked;
    }

    // 下一关
    nextLevel() {
        if (this.level < this.maxLevels) {
            this.level++;
            this.loadLevel();
        } else {
            this.backToMenu();
        }
    }

    // 暂停游戏
    pauseGame() {
        if (this.state === 'playing') {
            this.stopTimer();
            this.showScreen('paused');
        }
    }

    // 继续游戏
    resumeGame() {
        if (this.state === 'paused') {
            this.startTime = Date.now() - this.elapsedTime * 1000;
            this.startTimer();
            this.showScreen('playing');
        }
    }

    // 重开本关
    restartLevel() {
        this.stopTimer();
        this.loadLevel();
    }

    // 返回菜单
    backToMenu() {
        this.stopTimer();
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.showScreen('cover');
    }

    // 显示排行榜
    showLeaderboard() {
        this.currentLeaderboardTab = 'score';
        this.renderLeaderboard();
        this.showScreen('leaderboard');
    }

    // 渲染排行榜
    renderLeaderboard() {
        const list = document.getElementById('leaderboard-list');
        const sorted = [...this.leaderboard].sort((a, b) => {
            if (this.currentLeaderboardTab === 'time') {
                return a.time - b.time;
            }
            return b.score - a.score;
        });

        if (sorted.length === 0) {
            list.innerHTML = '<p style="color:var(--text-muted);padding:20px;">暂无记录，快来挑战吧！</p>';
            return;
        }

        list.innerHTML = sorted.slice(0, 20).map((r, i) => {
            const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other';
            const value = this.currentLeaderboardTab === 'time' ? this.formatTime(r.time) : r.score;
            const label = this.currentLeaderboardTab === 'time' ? '用时' : '得分';
            return `
                <div class="leaderboard-item">
                    <div class="leaderboard-rank ${rankClass}">${i + 1}</div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${r.name}</div>
                        <div class="leaderboard-detail">第${r.level}关 | ${r.stars}⭐ | ${r.steps}步</div>
                    </div>
                    <div class="leaderboard-score">${value}</div>
                </div>
            `;
        }).join('');
    }

    // 切换排行榜标签
    switchLeaderboardTab(tab) {
        this.currentLeaderboardTab = tab;
        document.querySelectorAll('.leaderboard-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        this.renderLeaderboard();
    }

    // 清空排行榜
    clearLeaderboard() {
        if (confirm('确定要清空所有排行榜记录吗？')) {
            this.leaderboard = [];
            this.saveData();
            this.renderLeaderboard();
        }
    }

    // 返回（从排行榜）
    backFromLeaderboard() {
        this.showScreen('cover');
    }

    // 显示成就
    showAchievements() {
        const list = document.getElementById('achievements-list');
        list.innerHTML = this.achievementsDef.map(def => {
            const unlocked = !!this.achievements[def.id];
            return `
                <div class="achievement-item ${unlocked ? 'unlocked' : 'locked'}">
                    <span class="achievement-icon">${def.icon}</span>
                    <div class="achievement-info">
                        <div class="achievement-name">${def.name}</div>
                        <div class="achievement-desc">${def.desc}</div>
                    </div>
                    <span class="achievement-status ${unlocked ? 'status-unlocked' : 'status-locked'}">
                        ${unlocked ? '已解锁' : '未解锁'}
                    </span>
                </div>
            `;
        }).join('');
        this.showScreen('achievements');
    }

    // 返回（从成就）
    backFromAchievements() {
        this.showScreen('cover');
    }

    // 分享成绩
    shareScore() {
        const text = `🎮 迷宫冒险 - 第${this.level}关完成！\n` +
            `⏱️ 用时：${this.formatTime(this.elapsedTime)}\n` +
            `👣 步数：${this.totalSteps}\n` +
            `⭐ 星星：${this.starsCollected}/3\n` +
            `🏆 得分：${this.calculateScore()}\n` +
            `快来挑战吧！`;
        document.getElementById('share-text').value = text;
        this.showScreen('share');
    }

    // 复制分享文本
    copyShareText() {
        const textarea = document.getElementById('share-text');
        textarea.select();
        document.execCommand('copy');
        const btn = document.getElementById('btn-copy-share');
        const original = btn.textContent;
        btn.textContent = '已复制！';
        setTimeout(() => btn.textContent = original, 1500);
    }

    // 关闭分享
    closeShare() {
        this.showScreen('complete');
    }

    // 打开关于我页面
    openAbout() {
        window.open('about.html', '_blank');
    }

    // 窗口大小变化
    handleResize() {
        if (this.state === 'playing' || this.state === 'paused') {
            this.calculateLayout();
            this.needsRedraw = true;
        }
    }
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    window.game = new MazeGame();
});