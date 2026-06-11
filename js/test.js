// 简化版测试脚本
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    const btnStart = document.getElementById('btn-start');
    console.log('btn-start element:', btnStart);
    
    if (btnStart) {
        btnStart.addEventListener('click', () => {
            console.log('Start button clicked!');
            alert('按钮点击成功！');
        });
    } else {
        console.error('btn-start not found');
    }
});