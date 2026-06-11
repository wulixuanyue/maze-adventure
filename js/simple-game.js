// 简化版游戏测试
class SimpleGame {
    constructor() {
        console.log('SimpleGame constructor called');
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
    }

    startGame() {
        console.log('startGame called');
        alert('开始游戏！');
        
        // 显示游戏界面
        this.showScreen('playing');
        this.createSimpleMaze();
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
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 400;
        canvas.height = 400;
        
        // 绘制简单迷宫
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 400, 400);
        
        // 绘制通道
        ctx.fillStyle = '#374151';
        for (let i = 0; i < 20; i++) {
            for (let j = 0; j < 20; j++) {
                if ((i + j) % 2 === 0) {
                    ctx.fillRect(i * 20, j * 20, 20, 20);
                }
            }
        }
        
        // 绘制玩家
        ctx.beginPath();
        ctx.arc(10, 10, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        
        // 绘制出口
        ctx.font = '16px Arial';
        ctx.fillText('🏁', 380, 390);
    }
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded');
    window.game = new SimpleGame();
});