/**
 * 迷宫生成与求解模块
 * 使用递归回溯算法生成完美迷宫
 * 性能优化：使用 Uint8Array、避免重复计算
 */

class MazeGenerator {
    constructor() {
        // 方向常量：上、右、下、左
        this.DIRECTIONS = [
            { dx: 0, dy: -1, wall: 1, opposite: 2 },   // 上
            { dx: 1, dy: 0, wall: 2, opposite: 1 },    // 右
            { dx: 0, dy: 1, wall: 4, opposite: 8 },    // 下
            { dx: -1, dy: 0, wall: 8, opposite: 4 }    // 左
        ];
    }

    /**
     * 生成迷宫
     * @param {number} width - 迷宫宽度（单元格数）
     * @param {number} height - 迷宫高度（单元格数）
     * @returns {Object} - 迷宫数据对象
     */
    generate(width, height) {
        // 确保奇数尺寸，便于生成
        const w = width % 2 === 0 ? width + 1 : width;
        const h = height % 2 === 0 ? height + 1 : height;

        // 使用一维数组存储迷宫墙壁信息，性能更好
        // 每个单元格用4位表示四面墙：上(1) 右(2) 下(4) 左(8)
        const cells = new Uint8Array(w * h);
        const visited = new Uint8Array(w * h);

        // 初始化所有墙壁
        for (let i = 0; i < cells.length; i++) {
            cells[i] = 15; // 1111 - 四面都有墙
        }

        // 递归回溯生成迷宫
        const stack = [];
        const startX = 0;
        const startY = 0;
        let current = startY * w + startX;
        visited[current] = 1;
        stack.push(current);

        while (stack.length > 0) {
            const neighbors = this._getUnvisitedNeighbors(current, w, h, visited);

            if (neighbors.length > 0) {
                // 随机选择邻居
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                const dir = next.dir;

                // 移除当前单元格和邻居之间的墙
                cells[current] &= ~dir.wall;
                cells[next.index] &= ~dir.opposite;

                visited[next.index] = 1;
                stack.push(current);
                current = next.index;
            } else {
                current = stack.pop();
            }
        }

        // 随机放置星星（收集品）
        const stars = this._placeStars(cells, w, h, 3);

        return {
            width: w,
            height: h,
            cells: cells,
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            stars: stars
        };
    }

    /**
     * 获取未访问的邻居
     */
    _getUnvisitedNeighbors(index, w, h, visited) {
        const x = index % w;
        const y = Math.floor(index / w);
        const neighbors = [];

        for (const dir of this.DIRECTIONS) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;

            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const nIndex = ny * w + nx;
                if (!visited[nIndex]) {
                    neighbors.push({ index: nIndex, dir: dir });
                }
            }
        }

        return neighbors;
    }

    /**
     * 在迷宫中放置星星（确保可达）
     */
    _placeStars(cells, w, h, count) {
        const stars = [];
        
        // 使用BFS找到所有可达的位置（排除起点和终点）
        const reachable = this._getReachableCells(cells, w, h);
        
        // 过滤掉起点和终点
        const available = reachable.filter(pos => 
            !((pos.x === 0 && pos.y === 0) || (pos.x === w - 1 && pos.y === h - 1))
        );

        // 随机选择位置
        for (let i = 0; i < count && available.length > 0; i++) {
            const idx = Math.floor(Math.random() * available.length);
            stars.push(available.splice(idx, 1)[0]);
        }

        return stars;
    }

    /**
     * 使用BFS获取所有可达的单元格
     */
    _getReachableCells(cells, w, h) {
        const reachable = [];
        const visited = new Uint8Array(w * h);
        const queue = [{ x: 0, y: 0 }];
        visited[0] = 1;

        while (queue.length > 0) {
            const { x, y } = queue.shift();
            reachable.push({ x, y });

            for (const dir of this.DIRECTIONS) {
                // 检查该方向是否有墙
                if ((cells[y * w + x] & dir.wall) === 0) {
                    const nx = x + dir.dx;
                    const ny = y + dir.dy;
                    const nIdx = ny * w + nx;

                    if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[nIdx]) {
                        visited[nIdx] = 1;
                        queue.push({ x: nx, y: ny });
                    }
                }
            }
        }

        return reachable;
    }
    
    /**
     * 使用BFS获取所有可达的单元格（公共方法）
     */
    getReachableCells(cells, w, h) {
        return this._getReachableCells(cells, w, h);
    }

    /**
     * 检查两个单元格之间是否有墙
     */
    hasWall(maze, x1, y1, x2, y2) {
        const w = maze.width;
        const idx1 = y1 * w + x1;
        const idx2 = y2 * w + x2;

        if (x2 > x1) return (maze.cells[idx1] & 2) !== 0;
        if (x2 < x1) return (maze.cells[idx1] & 8) !== 0;
        if (y2 > y1) return (maze.cells[idx1] & 4) !== 0;
        if (y2 < y1) return (maze.cells[idx1] & 1) !== 0;

        return false;
    }

    /**
     * 使用BFS计算最短路径长度
     */
    getShortestPathLength(maze) {
        const w = maze.width;
        const h = maze.height;
        const queue = [{ x: 0, y: 0, dist: 0 }];
        const visited = new Uint8Array(w * h);
        visited[0] = 1;

        while (queue.length > 0) {
            const { x, y, dist } = queue.shift();

            if (x === maze.endX && y === maze.endY) {
                return dist;
            }

            for (const dir of this.DIRECTIONS) {
                if ((maze.cells[y * w + x] & dir.wall) === 0) {
                    const nx = x + dir.dx;
                    const ny = y + dir.dy;
                    const nIdx = ny * w + nx;

                    if (!visited[nIdx]) {
                        visited[nIdx] = 1;
                        queue.push({ x: nx, y: ny, dist: dist + 1 });
                    }
                }
            }
        }

        return -1;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MazeGenerator;
}