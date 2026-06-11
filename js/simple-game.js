// 简化版游戏测试
class SimpleGame {
    constructor() {
        console.log('SimpleGame constructor called');
        this.player = { x: 0, y: 0 };
        this.cellSize = 20;
        this.canvas = null;
        this.ctx = null;
        this.timerInterval = null;
        this.elapsedTime = 0;
        this.steps = 0;
        this.init();
    }

    init() {
        console.log('init called');
        // 直接显示封面页面，跳过加载
        this.showScreen('cover');
        this.setupEventListeners();
    }

    setupEventListeners() {
        const btn = document.getElementById('btn-start');
        if (btn) {
            btn.addEventListener('click', () => this.startGame());
            console.log('Event listener added to btn-start');
        } else {
            console.error('btn-start not found');
        }
        
        // 键盘控制
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    handleKeyDown(e) {
        if (this.state !== 'playing') return;
        
        let dx = 0, dy = 0;
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                dy = -1;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                dy = 1;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                dx = -1;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                dx = 1;
                break;
            default:
                return;
        }
        
        e.preventDefault();
        this.movePlayer(dx, dy);
    }

    movePlayer(dx, dy) {
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;
        
        // 检查边界
        if (newX < 0 || newX >= 20 || newY < 0 || newY >= 20) {
            return;
        }
        
        // 在这个简化版中，所有格子都可以进入（演示用）
        this.player.x = newX;
        this.player.y = newY;
        this.steps++;
        
        // 更新步数显示
        document.getElementById('steps').textContent = this.steps;
        
        // 检查是否到达终点
        if (this.player.x === 19 && this.player.y === 19) {
            this.win();
            return;
        }
        
        this.render();
    }

    startGame() {
        console.log('startGame called');
        
        // 重置状态
        this.player = { x: 0, y: 0 };
        this.steps = 0;
        this.elapsedTime = 0;
        this.state = 'playing';
        
        // 更新UI
        document.getElementById('level-num').textContent = '1';
        document.getElementById('steps').textContent = '0';
        document.getElementById('score').textContent = '0';
        document.getElementById('timer').textContent = '00:00';
        
        // 显示游戏界面
        this.showScreen('playing');
        this.createSimpleMaze();
        
        // 启动计时器
        this.startTimer();
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.elapsedTime++;
            const minutes = Math.floor(this.elapsedTime / 60);
            const seconds = this.elapsedTime % 60;
            document.getElementById('timer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    win() {
        this.stopTimer();
        alert('恭喜通关！用时: ' + document.getElementById('timer').textContent);
        this.showScreen('cover');
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        
        const screenMap = {
            'cover': 'cover-screen',
            'playing': 'game-screen'
        };
        
        const screenId = screenMap[screenName];
        if (screenId) {
            document.getElementById(screenId).classList.add('active');
            console.log('Showing screen:', screenId);
        }
    }

    createSimpleMaze() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.canvas.width = 400;
        this.canvas.height = 400;
        
        this.render();
    }

    render() {
        const ctx = this.ctx;
        const cs = this.cellSize;
        
        // 绘制背景
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 400, 400);
        
        // 绘制通道（浅色格子）
        ctx.fillStyle = '#374151';
        for (let i = 0; i < 20; i++) {
            for (let j = 0; j < 20; j++) {
                ctx.fillRect(i * cs, j * cs, cs, cs);
            }
        }
        
        // 绘制网格线（细线条）
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 20; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cs, 0);
            ctx.lineTo(i * cs, 400);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, i * cs);
            ctx.lineTo(400, i * cs);
            ctx.stroke();
        }
        
        // 绘制出口
        ctx.font = `${cs * 0.7}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏁', 19 * cs + cs/2, 19 * cs + cs/2);
        
        // 绘制玩家
        const px = this.player.x * cs + cs/2;
        const py = this.player.y * cs + cs/2;
        
        // 玩家光晕
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, cs);
        gradient.addColorStop(0, 'rgba(251,191,36,0.3)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, cs * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        // 玩家本体
        ctx.beginPath();
        ctx.arc(px, py, cs * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
    }
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded');
    window.game = new SimpleGame();
});