// todo keep this file sync with local until ddl.

import { GameRoom } from './GameRoom';
import { ServerPlayerInfo } from './ServerPlayerInfo';
import { MyPoint } from './PlayerInfo';

enum State {
    Idle, Attack, Flee, Work
}

export class GameAI {
    static vis: number[][][] = null;
    static prevPos: number[][][] = null;
    static prevDir: number[][][] = null;
    static dist: number[][][] = null;
    static max_t: number = 0;
    // 供ai操作的游戏对象
    game: GameRoom;
    playerID: number;
    playerInfo: ServerPlayerInfo;
    status: string;
    plan: [number, number][];

    planStack: [number, number, number, number][] = [];
    state: State;

    turnRate: number = 0.2;// <=0.5
    planRate: number = 0.35;
    emptyLandProceedRate: number = 0.9;
    enemyLandProceedRate: number = 0.7;
    maxDistance: number = 10;

    constructor(game: GameRoom, playerID: number) {
        this.game = game;
        this.playerID = playerID;
        this.playerInfo = this.game.getPlayerInfoById(this.playerID);
    }

    static tripleExclude(a: number, b: number, c: number): number {
        if (a === b) {
            return c;
        } else if (a === c) {
            return b;
        } else {
            return a;
        }
    }

    static getRandomInt(lowerInc: number, upperExc: number): number {
        return lowerInc + Math.floor(Math.random() * (upperExc - lowerInc));
    }

    init(): void {
        this.state = State.Flee;
        this.planStack = [];
    }

    updateAI(): void {
        this.bfs(this.playerInfo.headPos.x, this.playerInfo.headPos.y,
            this.playerInfo.headDirection, this.maxDistance);
        this.updateState();
        this.executePlan();
    }

    // 思考层

    updateState(): void {
        if (this.state === State.Work && this.planStack.length === 0 && this.onMyOwnLand()) {
            this.state = State.Idle;
        }
        if (this.state === State.Flee && this.onMyOwnLand()) {
            this.state = State.Idle;
        }
        if (this.state === State.Idle) {
            let shouldPlan: boolean;
            if (Math.random() > this.planRate) {
                shouldPlan = !this.randomWalk();
            } else {
                shouldPlan = true;
            }
            if (shouldPlan) {
                this.startPlan();
                this.state = State.Work;
            }
        }
    }

    proceedToRandomPoint(nx: number, ny: number, dIndex: number): [number, number] {
        const dir: MyPoint = GameRoom.directions[dIndex];
        let stopRate: number = 1;
        while (true) {
            if (this.game.atBorder(nx + dir.x, ny + dir.y)) {
                break;
            }
            nx += dir.x;
            ny += dir.y;
            if (this.game.colorMap[nx][ny] === this.playerID) {
                // my land, keep stop rate
            } else if (this.game.colorMap[nx][ny] === 0) {
                // empty land
                stopRate *= this.emptyLandProceedRate;
            } else {
                // others land
                stopRate *= this.enemyLandProceedRate;
            }
            if (Math.random() > stopRate) {
                break;
            }
        }
        return [nx, ny];
    }

    startPlan(): void {
        if (this.planStack.length > 0) {
            console.log('Warning: planStack not empty: ' + this.planStack.length);
            this.planStack = [];
        }
        while (true) {
            let d1: number = GameRoom.randInt(-1, 1);
            d1 = (this.playerInfo.headDirection + d1 + 4) % 4;
            const tempStack: [number, number, number, number][] = [];

            if (d1 !== this.playerInfo.headDirection) {
                tempStack.push([this.playerInfo.headPos.x, this.playerInfo.headPos.y,
                this.playerInfo.headDirection, d1]);
            }

            let [nx, ny] = this.proceedToRandomPoint(this.playerInfo.headPos.x, this.playerInfo.headPos.y, d1);

            if (nx === this.playerInfo.headPos.x && ny === this.playerInfo.headPos.y) {
                continue;
            }

            let d2: number = GameRoom.randInt(-1, 0) * 2 + 1;// random.choice([-1,1])
            d2 = (d1 + d2 + 4) % 4;
            tempStack.push([nx, ny, d1, d2]);

            let [mx, my] = this.proceedToRandomPoint(nx, ny, d2);

            if (mx === nx && my === ny) {
                continue;
            }

            tempStack.push([mx, my, d2, (d1 + 2) % 4]);

            tempStack.push([GameAI.tripleExclude(this.playerInfo.headPos.x, nx, mx),
            GameAI.tripleExclude(this.playerInfo.headPos.y, ny, my),
            (d1 + 2) % 4, (d2 + 2) % 4]);

            while (tempStack.length > 0) {
                this.planStack.push(tempStack.pop());
            }
            break;
        }
    }

    // 执行层

    bfs(sR: number, sC: number, sD: number, maxDistance: number): void {
        GameAI.max_t++;
        const queue: [number, number, number][] = [];
        queue.push([sR, sC, sD]);
        GameAI.prevPos[sR][sC][sD] = -1;
        GameAI.prevDir[sR][sC][sD] = -1;
        GameAI.vis[sR][sC][sD] = GameAI.max_t;
        GameAI.dist[sR][sC][sD] = 0;

        while (queue.length > 0) {
            let [r, c, d] = queue.shift();
            if (GameAI.dist[r][c][d] < maxDistance) {
                for (let curD: number = 0; curD < 4; curD++) {
                    const dir: MyPoint = GameRoom.directions[curD];
                    let [nr, nc] = [r + dir.x, c + dir.y];
                    if (!this.game.atBorder(nr, nc)) {
                        for (let nd: number = 0; nd < 4; nd++) {
                            if (nd === (d + 2) % 4) {
                                continue;
                            } else {
                                if (GameAI.vis[nr][nc][nd] !== GameAI.max_t) {
                                    GameAI.vis[nr][nc][nd] = GameAI.max_t;
                                    GameAI.dist[nr][nc][nd] = GameAI.dist[r][c][d] + 1;
                                    GameAI.prevPos[nr][nc][nd] = curD;
                                    GameAI.prevDir[nr][nc][nd] = d;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    randomWalk(): boolean {
        const pos: MyPoint = this.playerInfo.headPos;
        const choices: [number, number][] = [];
        let sum: number = 0;
        for (let d: number = -1; d <= 1; d++) {
            const dir: MyPoint = GameRoom.directions[(this.playerInfo.headDirection + d + 4) % 4];
            if (this.isMyLand(pos.x + dir.x, pos.y + dir.y)) {
                if (d === 0) {
                    choices.push([1 - this.turnRate * 2, d]);
                    sum += 1 - this.turnRate * 2;
                } else {
                    choices.push([this.turnRate, d]);
                    sum += this.turnRate;
                }
            }
        }
        if (choices.length > 0) {
            let ran: number = Math.random() * sum;
            for (const [prop, d] of choices) {
                if (0 <= ran && ran <= prop) {
                    if (d !== 0) {
                        this.game.changeDirection(this.playerID, (this.playerInfo.headDirection + d + 4) % 4);
                    }
                    break;
                } else {
                    ran -= prop;
                }
            }
            return true;
        } else {
            return false;
        }
    }

    executePlan(): void {
        if (this.planStack.length > 0) {
            const top: [number, number, number, number] = this.planStack[this.planStack.length - 1];
            if (this.playerInfo.headPos.x === top[0]
                && this.playerInfo.headPos.y === top[1]
                && this.playerInfo.headDirection === top[2]) {
                this.game.changeDirection(this.playerID, top[3]);
                this.planStack.pop();
            }
        }
    }

    // 反应层
    // other code

    onMyOwnLand(): boolean {
        return this.isMyLand(this.playerInfo.headPos.x, this.playerInfo.headPos.y);
    }

    isMyLand(x: number, y: number): boolean { // 如果headPos撞墙那么已经死了，不会进一步调用AI
        if (this.game.atBorder(x, y)) {
            return false;
        }
        return this.game.colorMap[x][y] === this.playerID;
    }

    isMyTrack(x: number, y: number): boolean {
        if (this.game.atBorder(x, y)) {
            return false;
        }
        return this.game.trackMap[x][y] === this.playerID;
    }

    idleUpdate(): void {
        // idle state means the robot is on its own land and is safe
        // schedule a path
        let probSelectNext: number = 1;
        let end: boolean = false;
        let pathNodes: [number, number][] = [];
        let [curX, curY]: [number, number] = [this.playerInfo.headPos.x, this.playerInfo.headPos.y];
        while (!end) {
            if (Math.random() < probSelectNext) {
                probSelectNext *= 0.6;
                let pushing: [number, number] = this.randomOutPointAround(curX, curY);
                pathNodes.push(pushing);
                [curX, curY] = pushing;
            } else {
                end = true;
                pathNodes.push(null);
            }
        }

        this.plan = pathNodes;

        // now we get a path, started with a point (outside), end with 'end'
        this.status = 'execute';
        this.executeUpdate();
    }

    executeUpdate(): void {
        let curDir: number = this.playerInfo.headDirection;
        let [curX, curY]: [number, number] = [this.playerInfo.headPos.x, this.playerInfo.headPos.y];

        // peek the first value in the plan
        if (this.plan.length === 0 || this.plan[0] === null) {
            // nothing to do, go to base to change to idle status
        } else {
            let [tarX, tarY]: [number, number] = this.plan[0];
            let [diffX, diffY]: [number, number] = [tarX - curX, tarY - curY];
        }
    }

    randomPointAround(x: number, y: number, normInfDistance: number): [number, number] {
        let retX: number = GameAI.getRandomInt(
            Math.max(x - normInfDistance, 0),
            Math.min(x + normInfDistance + 1, this.game.nRows)
        );
        let retY: number = GameAI.getRandomInt(
            Math.max(y - normInfDistance, 0),
            Math.min(y + normInfDistance + 1, this.game.nCols)
        );
        return [retX, retY];
    }

    randomPointAroundMe(normInfDistance: number): [number, number] {
        return this.randomPointAround(this.playerInfo.headPos.x, this.playerInfo.headPos.y, normInfDistance);
    }

    randomOutPointAround(x: number, y: number): [number, number] {
        let isOutSide: boolean = false;
        let tryDistance: number = 5;
        let [tarX, tarY]: [number, number] = [0, 0];

        while (!isOutSide) {
            for (let i: number = 0; i < 4; i++) {
                [tarX, tarY] = this.randomPointAround(x, y, tryDistance);
                if (!this.isMyLand(tarX, tarY)) {
                    isOutSide = true;
                    break;
                }
            }
            if (!isOutSide) {
                tryDistance *= 1.4;
            }
        }

        return [tarX, tarY];
    }
}