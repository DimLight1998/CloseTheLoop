"use strict";
// todo keep this file sync with local until ddl.
Object.defineProperty(exports, "__esModule", { value: true });
const GameRoom_1 = require("./GameRoom");
const PlayerInfo_1 = require("./PlayerInfo");
const Uint16TripleQueue_1 = require("./Uint16TripleQueue");
var State;
(function (State) {
    State[State["Idle"] = 0] = "Idle";
    State[State["Attack"] = 1] = "Attack";
    State[State["Flee"] = 2] = "Flee";
    State[State["Work"] = 3] = "Work";
})(State || (State = {}));
class GameAI {
    constructor(game, playerID) {
        this.planStack = [];
        this.turnRate = 0.2; // <=0.5
        this.planRate = 0.35;
        this.emptyLandProceedRate = 0.9;
        this.enemyLandProceedRate = 0.7;
        this.dangerThreshold = 0.5;
        this.fleeRate = 0.3;
        this.attackRate = 0.5;
        this.stillAttackRate = 0.1;
        this.homeLandPos = null;
        this.homeLandDist = null;
        this.enemyPos = null;
        this.enemyDist = null;
        this.attackSource = null;
        this.attackTarget = new PlayerInfo_1.MyPoint();
        this.enemyPlan = null;
        this.trackCoords = [];
        this.game = game;
        this.playerID = playerID;
        this.playerInfo = this.game.getPlayerInfoById(this.playerID);
    }
    static tripleExclude(a, b, c) {
        if (a === b) {
            return c;
        }
        else if (a === c) {
            return b;
        }
        else {
            return a;
        }
    }
    static getRandomInt(lowerInc, upperExc) {
        return lowerInc + Math.floor(Math.random() * (upperExc - lowerInc));
    }
    init() {
        this.state = State.Flee;
        this.planStack = [];
    }
    updateAI() {
        this.bfs(GameAI.maxDistance);
        if (this.playerInfo.isAI) {
            this.updateState();
        }
    }
    lateUpdateAI() {
        if (this.playerInfo.isAI) {
            this.lateUpdateState();
            this.executePlan();
        }
    }
    // 思考层
    updateState() {
        if (this.state === State.Work && this.planStack.length === 0) { // work -> idle
            if (this.onMyOwnLand()) {
                this.state = State.Idle;
            }
            else {
                this.state = State.Flee;
            }
        }
        if (this.state === State.Flee && this.onMyOwnLand()) { // flee -> idle
            this.state = State.Idle;
            this.planStack = [];
        }
        if (this.state === State.Flee && this.planStack.length === 0 && !this.onMyOwnLand()) {
            this.startFleePlan();
        }
        this.elseifFlag = false;
        if (this.state === State.Idle) { // idle -> work
            let shouldPlan;
            if (Math.random() > this.planRate) {
                shouldPlan = !this.randomWalk();
            }
            else {
                shouldPlan = true;
            }
            if (shouldPlan) {
                this.startWorkPlan();
                this.state = State.Work;
            }
        }
        else if (this.state === State.Work && this.isTooDangerous()) { // work -> flee
            if (Math.random() < this.fleeRate && this.startFleePlan()) {
                this.state = State.Flee;
            }
        }
        else if (this.state === State.Attack && this.isAttackDone()) { // attack -> flee
            this.planStack.pop();
            let done = false;
            if (this.planStack.length > 0) {
                const targetPos = this.planStack[this.planStack.length - 1];
                if (GameAI.vis[targetPos[0]][targetPos[1]][targetPos[2]] === GameAI.max_t) {
                    this.state = State.Flee;
                    this.planStack = this.planStack.concat(this.getPlanToTarget(targetPos[0], targetPos[1], targetPos[2]));
                    done = true;
                }
            }
            if (!done) {
                let nx = this.attackSource[0] + GameRoom_1.GameRoom.directions[this.attackSource[2]].x;
                let ny = this.attackSource[1] + GameRoom_1.GameRoom.directions[this.attackSource[2]].y;
                if (!this.game.atBorder(nx, ny) && GameAI.vis[nx][ny][this.attackSource[2]] === GameAI.max_t) {
                    this.state = State.Flee;
                    this.planStack = this.planStack.concat(this.getPlanToTarget(nx, ny, this.attackSource[2]));
                }
                else {
                    this.state = State.Flee;
                    this.planStack = []; // discard all previous plan
                    this.startFleePlan();
                }
            }
        }
        else {
            this.elseifFlag = true;
        }
    }
    lateUpdateState() {
        if (this.elseifFlag) {
            if ((this.state === State.Idle || this.state === State.Work) && this.shouldAttack()) { // {idle, work} -> attack
                this.startAttackPlan();
                this.state = State.Attack;
            }
        }
    }
    proceedToRandomPoint(nx, ny, dIndex) {
        const dir = GameRoom_1.GameRoom.directions[dIndex];
        let stopRate = 1;
        while (true) {
            if (this.game.atBorder(nx + dir.x, ny + dir.y)) {
                break;
            }
            nx += dir.x;
            ny += dir.y;
            if (this.game.colorMap[nx][ny] === this.playerID) {
                // my land, keep stop rate
            }
            else if (this.game.colorMap[nx][ny] === 0) {
                // empty land
                stopRate *= this.emptyLandProceedRate;
            }
            else {
                // others land
                stopRate *= this.enemyLandProceedRate;
            }
            if (Math.random() > stopRate) {
                break;
            }
        }
        return [nx, ny];
    }
    startWorkPlan() {
        if (this.planStack.length > 0) {
            console.log('Warning: planStack not empty: ' + this.planStack.length);
            this.planStack = [];
        }
        while (true) {
            let d1 = GameRoom_1.GameRoom.randInt(-1, 1);
            d1 = (this.playerInfo.headDirection + d1 + 4) % 4;
            const tempStack = [];
            if (d1 !== this.playerInfo.headDirection) {
                tempStack.push([this.playerInfo.headPos.x, this.playerInfo.headPos.y,
                    this.playerInfo.headDirection, d1]);
            }
            let [nx, ny] = this.proceedToRandomPoint(this.playerInfo.headPos.x, this.playerInfo.headPos.y, d1);
            if (nx === this.playerInfo.headPos.x && ny === this.playerInfo.headPos.y) {
                continue;
            }
            let d2 = GameRoom_1.GameRoom.randInt(-1, 0) * 2 + 1; // random.choice([-1,1])
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
    /**
     * discard previous plan, flee to home
     * return if flee succeed
     */
    startFleePlan() {
        if (this.homeLandPos !== null) {
            this.planStack = this.getPlanToTarget(this.homeLandPos[0], this.homeLandPos[1], this.homeLandPos[2]);
            return true;
        }
        return false;
    }
    startAttackPlan() {
        this.attackSource = [this.playerInfo.headPos.x, this.playerInfo.headPos.y, this.playerInfo.headDirection];
        this.attackTarget.x = this.enemyPos[0];
        this.attackTarget.y = this.enemyPos[1];
        this.planStack.push([-1, -1, -1, -1]);
        this.planStack = this.planStack.concat(this.enemyPlan);
    }
    getPlanToTarget(tR, tC, tD) {
        let [r, c, d] = [tR, tC, tD];
        let res = [];
        while (true) {
            let predir = GameAI.prevDir[r][c][d];
            if (predir === -1) {
                break;
            }
            r -= GameRoom_1.GameRoom.directions[d].x;
            c -= GameRoom_1.GameRoom.directions[d].y;
            if (d !== predir) {
                res.push([r, c, predir, d]);
            }
            d = predir;
        }
        return res;
    }
    bfs(maxDistance) {
        let [sR, sC, sD] = [this.playerInfo.headPos.x, this.playerInfo.headPos.y,
            this.playerInfo.headDirection];
        GameAI.max_t++;
        GameAI.tripleQueue.clear();
        GameAI.tripleQueue.push(sR, sC, sD);
        GameAI.prevDir[sR][sC][sD] = -1;
        GameAI.vis[sR][sC][sD] = GameAI.max_t;
        GameAI.dist[sR][sC][sD] = 0;
        this.homeLandPos = null;
        this.homeLandDist = 1e9;
        this.enemyPos = null;
        this.enemyDist = 1e9;
        this.enemyPlan = null;
        this.trackCoords = [];
        while (!GameAI.tripleQueue.empty()) {
            let [r, c, d] = GameAI.tripleQueue.shift();
            if (this.homeLandPos === null && this.game.colorMap[r][c] === this.playerID) {
                this.homeLandPos = [r, c, d];
                this.homeLandDist = GameAI.dist[r][c][d];
            }
            if (this.enemyPos === null && this.game.trackMap[r][c] !== 0
                && this.game.trackMap[r][c] !== this.playerID) {
                this.enemyPos = [r, c, d];
                this.enemyDist = GameAI.dist[r][c][d];
                this.enemyPlan = this.getPlanToTarget(r, c, d);
            }
            if (GameAI.dist[r][c][d] < maxDistance) {
                for (let curD = 0; curD < 4; curD++) {
                    if (curD === (d + 2) % 4) {
                        continue;
                    }
                    const dir = GameRoom_1.GameRoom.directions[curD];
                    let [nr, nc] = [r + dir.x, c + dir.y];
                    if (!this.game.atBorder(nr, nc)) {
                        if (this.game.trackMap[nr][nc] === this.playerID) {
                            if (GameAI.vis[nr][nc][0] !== GameAI.max_t) {
                                GameAI.vis[nr][nc][0] = GameAI.max_t;
                                this.trackCoords.push([nr, nc]);
                            }
                        }
                        else {
                            if (GameAI.vis[nr][nc][curD] !== GameAI.max_t) {
                                GameAI.vis[nr][nc][curD] = GameAI.max_t;
                                GameAI.dist[nr][nc][curD] = GameAI.dist[r][c][d] + 1;
                                GameAI.prevDir[nr][nc][curD] = d;
                                GameAI.tripleQueue.push(nr, nc, curD);
                            }
                        }
                    }
                }
            }
        }
    }
    randomWalk() {
        const pos = this.playerInfo.headPos;
        const choices = [];
        let sum = 0;
        for (let d = -1; d <= 1; d++) {
            const dir = GameRoom_1.GameRoom.directions[(this.playerInfo.headDirection + d + 4) % 4];
            if (this.isMyLand(pos.x + dir.x, pos.y + dir.y)) {
                if (d === 0) {
                    choices.push([1 - this.turnRate * 2, d]);
                    sum += 1 - this.turnRate * 2;
                }
                else {
                    choices.push([this.turnRate, d]);
                    sum += this.turnRate;
                }
            }
        }
        if (choices.length > 0) {
            let ran = Math.random() * sum;
            for (const [prop, d] of choices) {
                if (0 <= ran && ran <= prop) {
                    if (d !== 0) {
                        this.planStack.push([this.playerInfo.headPos.x, this.playerInfo.headPos.y,
                            this.playerInfo.headDirection, (this.playerInfo.headDirection + d + 4) % 4]);
                    }
                    break;
                }
                else {
                    ran -= prop;
                }
            }
            return true;
        }
        else {
            return false;
        }
    }
    executePlan() {
        if (this.planStack.length > 0) {
            const top = this.planStack[this.planStack.length - 1];
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
    isAttackDone() {
        return this.playerInfo.headPos.x === this.attackTarget.x
            && this.playerInfo.headPos.y === this.attackTarget.y;
    }
    shouldAttack() {
        if (this.enemyPos === null) {
            return false;
        }
        if (this.planStack.length > 0) {
            const [x, y, d] = this.planStack[this.planStack.length - 1];
            if (x === this.playerInfo.headPos.x
                && y === this.playerInfo.headPos.y
                && d === this.playerInfo.headDirection) {
                return false;
            }
        }
        const enemyId = this.game.trackMap[this.enemyPos[0]][this.enemyPos[1]];
        const enemyInfo = this.game.serverPlayerInfos[enemyId - 1];
        if (enemyInfo.aiInstance.homeLandDist > this.enemyDist) {
            return Math.random() < this.attackRate;
        }
        else if (enemyInfo.aiInstance.homeLandDist > this.enemyDist / 2) {
            return Math.random() < this.stillAttackRate;
        }
        return false;
    }
    isTooDangerous() {
        let danger = 0;
        for (const otherPlayer of this.game.serverPlayerInfos) {
            let minDist = 1e9;
            if (GameRoom_1.GameRoom.isAlive(otherPlayer) && otherPlayer !== this.playerInfo) {
                for (const [r, c] of this.trackCoords) {
                    const dis = Math.abs(r - otherPlayer.headPos.x) + Math.abs(c - otherPlayer.headPos.y);
                    if (minDist > dis) {
                        minDist = dis;
                    }
                }
            }
            danger += 1 / (minDist + 0.1);
        }
        return danger > this.dangerThreshold;
    }
    onMyOwnLand() {
        return this.isMyLand(this.playerInfo.headPos.x, this.playerInfo.headPos.y);
    }
    isMyLand(x, y) {
        if (this.game.atBorder(x, y)) {
            return false;
        }
        return this.game.colorMap[x][y] === this.playerID;
    }
    isMyTrack(x, y) {
        if (this.game.atBorder(x, y)) {
            return false;
        }
        return this.game.trackMap[x][y] === this.playerID;
    }
    idleUpdate() {
        // idle state means the robot is on its own land and is safe
        // schedule a path
        let probSelectNext = 1;
        let end = false;
        let pathNodes = [];
        let [curX, curY] = [this.playerInfo.headPos.x, this.playerInfo.headPos.y];
        while (!end) {
            if (Math.random() < probSelectNext) {
                probSelectNext *= 0.6;
                let pushing = this.randomOutPointAround(curX, curY);
                pathNodes.push(pushing);
                [curX, curY] = pushing;
            }
            else {
                end = true;
                pathNodes.push(null);
            }
        }
        this.plan = pathNodes;
        // now we get a path, started with a point (outside), end with 'end'
        this.status = 'execute';
        this.executeUpdate();
    }
    executeUpdate() {
        let curDir = this.playerInfo.headDirection;
        let [curX, curY] = [this.playerInfo.headPos.x, this.playerInfo.headPos.y];
        // peek the first value in the plan
        if (this.plan.length === 0 || this.plan[0] === null) {
            // nothing to do, go to base to change to idle status
        }
        else {
            let [tarX, tarY] = this.plan[0];
            let [diffX, diffY] = [tarX - curX, tarY - curY];
        }
    }
    randomPointAround(x, y, normInfDistance) {
        let retX = GameAI.getRandomInt(Math.max(x - normInfDistance, 0), Math.min(x + normInfDistance + 1, this.game.nRows));
        let retY = GameAI.getRandomInt(Math.max(y - normInfDistance, 0), Math.min(y + normInfDistance + 1, this.game.nCols));
        return [retX, retY];
    }
    randomPointAroundMe(normInfDistance) {
        return this.randomPointAround(this.playerInfo.headPos.x, this.playerInfo.headPos.y, normInfDistance);
    }
    randomOutPointAround(x, y) {
        let isOutSide = false;
        let tryDistance = 5;
        let [tarX, tarY] = [0, 0];
        while (!isOutSide) {
            for (let i = 0; i < 4; i++) {
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
GameAI.vis = null;
GameAI.prevDir = null;
GameAI.dist = null;
GameAI.max_t = 0;
GameAI.tripleQueue = new Uint16TripleQueue_1.Uint16TripleQueue(20 * 20 * 4);
GameAI.maxDistance = 0;
GameAI.finalMaxDistance = 7;
GameAI.distanceStep = 0.2;
exports.GameAI = GameAI;
