"use strict";
// todo keep this file sync with local until ddl.
Object.defineProperty(exports, "__esModule", { value: true });
const GameAI_1 = require("./GameAI");
const PayLoadProtobuf_1 = require("./PayLoadProtobuf");
const Uint16PairQueue_1 = require("./Uint16PairQueue");
class GameRoom {
    constructor(nRows, nCols, playerNum) {
        this.serverAdapter = null;
        this.playersToClear = [];
        this.potentialFillList = [];
        this.rebornList = [];
        this.leaderBoard = [];
        this.soundFxs = [];
        this.newPlayers = [];
        this.rebornHumanList = [];
        this.mapStatus = null;
        this.inWx = false;
        this.pairQueue = null;
        this.storageQueue = null;
        this.nRows = nRows;
        this.nCols = nCols;
        this.playerNum = playerNum;
        this.colorMap = GameRoom.create2DArray(nRows, nCols);
        this.trackMap = GameRoom.create2DArray(nRows, nCols);
        this.mapStatus = GameRoom.create2DArray(nRows, nCols);
        GameAI_1.GameAI.vis = GameRoom.create3DArray(nRows, nCols, 4);
        GameAI_1.GameAI.max_t = 0;
        GameAI_1.GameAI.prevDir = GameRoom.create3DArray(nRows, nCols, 4);
        GameAI_1.GameAI.dist = GameRoom.create3DArray(nRows, nCols, 4);
        this.maxT = 0;
        this.soundFxs = Array(this.playerNum + 1).fill(0);
        this.payload = new PayLoadProtobuf_1.PayLoad();
        this.payload.players = [];
        this.payload.leaderBoard = [];
        for (let i = 0; i < this.playerNum; i++) {
            this.payload.players.push(new PayLoadProtobuf_1.PlayerInfoProto());
            this.payload.players[i].headPos = new PayLoadProtobuf_1.MyPointProto();
            this.payload.leaderBoard.push(new PayLoadProtobuf_1.LeaderBoardItem());
        }
        this.payload.leftTop = new PayLoadProtobuf_1.MyPointProto();
        this.pairQueue = new Uint16PairQueue_1.Uint16PairQueue(nRows * nCols);
        this.storageQueue = new Uint16PairQueue_1.Uint16PairQueue(nRows * nCols);
    }
    static create2DArray(nRows, nCols) {
        return Array(nRows).fill(0).map(() => Array(nCols).fill(0));
    }
    static create3DArray(nRows, nCols, nDims) {
        return Array(nRows).fill(0).map(() => Array(nCols).fill(0).map(() => Array(nDims).fill(0)));
    }
    static randInt(l, r) {
        return l + Math.floor(Math.random() * (r - l + 1));
    }
    static rangeAll(rMin, rMax, cMin, cMax, callback) {
        for (let r = rMin; r <= rMax; r++) {
            for (let c = cMin; c <= cMax; c++) {
                if (!callback(r, c)) {
                    return false;
                }
            }
        }
        return true;
    }
    static isAlive(info) {
        return info.state === 0 || info.state === 3;
    }
    setServerAdapter(adapter) {
        this.serverAdapter = adapter;
    }
    /**
     * initialize all AI players (will be replaced soon), update round regularly.
     */
    startNewGame() {
        this.initAIPlayers();
        if (!this.inWx) {
            this.timer = setTimeout(this.updateRound.bind(this), 0); // invoke the first time
        }
    }
    /**
     * change the player's direction, prevent turning back.
     */
    changeDirection(playerID, direction) {
        const player = this.serverPlayerInfos[playerID - 1];
        if ((player.headDirection + 2) % 4 === direction) {
            // invalid direction
        }
        else {
            player.nextDirection = direction;
        }
    }
    changeDirectionRelative(playerID, nextDirection) {
        let currentDirection = this.getPlayerInfoById(playerID).headDirection;
        if (nextDirection === 'left') {
            this.changeDirection(playerID, (currentDirection + 3) % 4);
        }
        else if (nextDirection === 'right') {
            this.changeDirection(playerID, (currentDirection + 1) % 4);
        }
    }
    getPlayerInfoById(playerID) {
        return this.serverPlayerInfos[playerID - 1];
    }
    /**
     * try to generate a 3x3 block for a player to spawn on, return the center of the block.
     * sometimes finding such area is hard (maybe impossible), return null in this case.
     */
    randomSpawnNewPlayer(playerID) {
        const maxTryNum = 20;
        for (let i = 0; i < maxTryNum; i++) {
            const r = GameRoom.randInt(0, this.nRows - 1);
            const c = GameRoom.randInt(0, this.nCols - 1);
            if (GameRoom.rangeAll(r - 1, r + 1, c - 1, c + 1, (r, c) => {
                if (this.outOfRange(r, c)) {
                    return false;
                }
                return this.colorMap[r][c] === 0;
            })) {
                GameRoom.rangeAll(r - 1, r + 1, c - 1, c + 1, (r, c) => {
                    this.colorMap[r][c] = playerID;
                    return true; // will continue
                });
                return {
                    x: r,
                    y: c
                };
            }
        }
        return null;
    }
    /**
     * fill the room with AI players, they will be replaced when new player enters in.
     */
    initAIPlayers() {
        this.serverPlayerInfos = [];
        this.rebornList = [];
        for (let i = 0; i < this.playerNum; i++) {
            const info = {
                playerID: i + 1,
                isAI: true,
                aiInstance: null,
                headPos: null,
                headDirection: 0,
                nKill: 0,
                state: 2,
                nextDirection: 0,
                tracks: [],
                focusPoint: null
            };
            this.serverPlayerInfos.push(info);
            info.aiInstance = new GameAI_1.GameAI(this, i + 1);
            this.rebornList.push(info.playerID);
        }
    }
    addToClearList(playerID, includeMap) {
        for (let i = 0; i < this.playersToClear.length; i++) {
            if (this.playersToClear[i][0] === playerID) {
                this.playersToClear[i][1] = this.playersToClear[i][1] || includeMap;
                return;
            }
        }
        this.playersToClear.push([playerID, includeMap]);
    }
    updateDyingPlayers() {
        for (let player of this.serverPlayerInfos) {
            if (player.state === 1) {
                player.state = 2;
            }
            else if (player.state === 3) {
                player.state = 0;
            }
        }
    }
    /**
     * update all players' location, logically.
     */
    updatePlayerPos() {
        for (let player of this.serverPlayerInfos) {
            if (GameRoom.isAlive(player)) { // alive
                if (this.colorMap[player.headPos.x][player.headPos.y] !== player.playerID) {
                    this.trackMap[player.headPos.x][player.headPos.y] = player.playerID;
                    if (player.headDirection !== player.nextDirection) {
                        let a = player.headDirection;
                        let b = player.nextDirection;
                        let res;
                        if ((a + 1) % 4 !== b) { // anti clock wise
                            res = (a + 1) % 4;
                        }
                        else { // clock wise
                            res = a;
                        }
                        player.tracks.push([player.headPos.x, player.headPos.y, res]);
                    }
                }
                player.headDirection = player.nextDirection;
                const vector = GameRoom.directions[player.headDirection];
                let nextPositionX = player.headPos.x + vector.x;
                let nextPositionY = player.headPos.y + vector.y;
                if (this.colorMap[player.headPos.x][player.headPos.y] !== player.playerID &&
                    !this.atBorder(nextPositionX, nextPositionY) &&
                    this.colorMap[nextPositionX][nextPositionY] === player.playerID) {
                    this.potentialFillList.push(player.playerID);
                }
                player.headPos.x += vector.x;
                player.headPos.y += vector.y;
            }
        }
    }
    updateTrackCutting() {
        for (let player of this.serverPlayerInfos) {
            if (GameRoom.isAlive(player) && !this.atBorder(player.headPos.x, player.headPos.y)) {
                let currentTrackId = this.trackMap[player.headPos.x][player.headPos.y];
                if (currentTrackId !== 0) {
                    const otherPlayer = this.serverPlayerInfos[currentTrackId - 1];
                    if (GameRoom.isAlive(otherPlayer)
                        && !this.atBorder(otherPlayer.headPos.x, otherPlayer.headPos.y)) { // will be killed by wall
                        if (this.colorMap[otherPlayer.headPos.x][otherPlayer.headPos.y] !== otherPlayer.playerID) {
                            this.addToClearList(otherPlayer.playerID, true);
                            // update sound
                            this.soundFxs[player.playerID] = Math.max(this.soundFxs[player.playerID], 2);
                            // update nKill
                            this.getPlayerInfoById(player.playerID).nKill++;
                        }
                        else {
                            this.addToClearList(otherPlayer.playerID, false);
                        }
                    }
                }
            }
        }
    }
    updatePlayerOverlapping() {
        for (let player of this.serverPlayerInfos) {
            if (GameRoom.isAlive(player)) {
                let [curPlayerX, curPlayerY] = [player.headPos.x, player.headPos.y];
                if (this.atBorder(curPlayerX, curPlayerY)) {
                    this.addToClearList(player.playerID, true);
                }
                else {
                    for (let otherPlayer of this.serverPlayerInfos) {
                        if (otherPlayer !== player &&
                            GameRoom.isAlive(otherPlayer) &&
                            otherPlayer.headPos.x === curPlayerX &&
                            otherPlayer.headPos.y === curPlayerY &&
                            this.colorMap[otherPlayer.headPos.x][otherPlayer.headPos.y] !== otherPlayer.playerID) {
                            this.soundFxs[player.playerID] = Math.max(this.soundFxs[player.playerID], 2);
                            this.getPlayerInfoById(player.playerID).nKill++;
                            this.addToClearList(otherPlayer.playerID, true);
                        }
                    }
                }
            }
        }
    }
    floodFill(r, c, playerId) {
        // start flood fill
        let adjToWall = false;
        this.pairQueue.clear();
        this.storageQueue.clear();
        this.pairQueue.push(r, c);
        this.storageQueue.push(r, c);
        this.mapStatus[r][c] = this.maxT;
        while (!this.pairQueue.empty()) {
            let [x, y] = this.pairQueue.shift();
            for (let dir of GameRoom.directions) {
                let [nx, ny] = [x + dir.x, y + dir.y];
                if (this.atBorder(nx, ny)) {
                    adjToWall = true;
                }
                else {
                    if (this.colorMap[nx][ny] !== playerId
                        && this.trackMap[nx][ny] !== playerId
                        && this.mapStatus[nx][ny] !== this.maxT) {
                        this.mapStatus[nx][ny] = this.maxT;
                        this.pairQueue.push(nx, ny);
                        this.storageQueue.push(nx, ny);
                    }
                }
            }
        }
        if (!adjToWall) {
            // console.log(storage);
            // this block is not adjacent to a wall, so it should be colored
            for (let i = this.storageQueue.head; i < this.storageQueue.tail; i++) {
                this.colorMap[this.storageQueue.queueA[i]][this.storageQueue.queueB[i]] = playerId;
            }
            return true;
        }
        return false;
    }
    fillPlayer(playerId) {
        // let cur: number = Date.now();
        let success = false;
        this.maxT++;
        // flood fill
        for (let r = 0; r < this.nRows; r++) {
            for (let c = 0; c < this.nCols; c++) {
                if (this.mapStatus[r][c] !== this.maxT && this.colorMap[r][c] !== playerId && this.trackMap[r][c] !== playerId) {
                    success = this.floodFill(r, c, playerId) || success;
                }
            }
        }
        for (let r = 0; r < this.nRows; r++) {
            for (let c = 0; c < this.nCols; c++) {
                if (this.trackMap[r][c] === playerId) {
                    this.colorMap[r][c] = playerId;
                    this.trackMap[r][c] = 0;
                    success = true;
                }
            }
        }
        this.serverPlayerInfos[playerId - 1].tracks = [];
        return success;
        // console.log('bfs costs ' + (Date.now() - cur) + 'ms');
    }
    updateColorFilling() {
        /**
         * This function will consider color and track with id `walledId` as wall.
         */
        // since there are modification to the clearList, we should update potential list
        let excludeList = this.playersToClear.map(p => p[0]);
        this.potentialFillList = this.potentialFillList.filter(x => excludeList.indexOf(x) === -1);
        // for elements still in the potential list, fill for them
        for (let playerId of this.potentialFillList) {
            let success = this.fillPlayer(playerId);
            if (success) {
                this.soundFxs[playerId] = Math.max(1, this.soundFxs[playerId]);
            }
        }
    }
    updatePlayerReborn() {
        for (let playerID of this.rebornList) {
            const info = this.serverPlayerInfos[playerID - 1];
            info.headPos = this.randomSpawnNewPlayer(playerID);
            if (info.headPos !== null) {
                info.focusPoint = {
                    x: info.headPos.x,
                    y: info.headPos.y
                };
                info.state = 3;
                info.nKill = 0;
                info.aiInstance.init();
            }
        }
        this.rebornList = [];
    }
    updateLeaderBoard() {
        let count = Array.from({ length: this.playerNum + 1 }, () => 0);
        for (let r = 0; r < this.nRows; r++) {
            for (let c = 0; c < this.nCols; c++) {
                count[this.colorMap[r][c]]++;
            }
        }
        for (let i = 0; i < count.length; i++) {
            count[i] /= this.nRows * this.nCols;
        }
        this.leaderBoard = [];
        for (let i = 1; i < count.length; i++) {
            this.leaderBoard.push([i, count[i]]);
        }
        this.leaderBoard.sort(([, score1], [, score2]) => score2 - score1);
    }
    updateAIs() {
        if (GameAI_1.GameAI.maxDistance < GameAI_1.GameAI.finalMaxDistance) {
            GameAI_1.GameAI.maxDistance += GameAI_1.GameAI.distanceStep;
        }
        for (const player of this.serverPlayerInfos) {
            if (GameRoom.isAlive(player)) {
                player.aiInstance.updateAI();
            }
        }
        for (const player of this.serverPlayerInfos) {
            if (GameRoom.isAlive(player)) {
                player.aiInstance.lateUpdateAI();
            }
        }
    }
    initSounds() {
        for (let i = 0; i <= this.playerNum; i++) {
            this.soundFxs[i] = 0;
        }
    }
    updateHumanReborn() {
        const MaxChoice = 10;
        if (this.rebornHumanList.length === 0) {
            return;
        }
        let choices = Array(this.rebornHumanList.length).fill([]);
        for (let r = 0; r < this.nRows; r++) {
            for (let c = 0; c < this.nCols; c++) {
                if (this.colorMap[r][c] === 0) {
                    continue;
                }
                let index = this.rebornHumanList.indexOf(this.colorMap[r][c]);
                if (index !== -1 && choices[index].length < MaxChoice) {
                    choices[index].push([r, c]);
                }
            }
        }
        for (let i = 0; i < this.rebornHumanList.length; i++) {
            let playerId = this.rebornHumanList[i];
            if (choices[i].length > 0) {
                let [r, c] = choices[i][GameRoom.randInt(0, choices[i].length - 1)];
                this.serverPlayerInfos[playerId - 1].headPos.x = r;
                this.serverPlayerInfos[playerId - 1].headPos.y = c;
                this.serverPlayerInfos[playerId - 1].state = 3;
            }
            else {
                this.serverPlayerInfos[playerId - 1].state = 4;
            }
        }
        this.rebornHumanList = [];
    }
    /**
     * update all players' position logically. if it has a server adapter, dispatch the world to other clients.
     */
    updateRound() {
        this.lastUpdateTime = Date.now();
        this.playersToClear = [];
        this.potentialFillList = [];
        this.initSounds();
        this.updateDyingPlayers();
        this.updatePlayerPos();
        this.updateHumanReborn();
        this.updatePlayerReborn();
        this.updateTrackCutting();
        this.updatePlayerOverlapping();
        this.updateColorFilling();
        this.clearPlayers();
        this.updateDeadPlayer();
        this.updateLeaderBoard();
        if (this.serverAdapter !== null) {
            this.serverAdapter.dispatchNewWorld();
        }
        this.updateAIs();
        let currentTime = Date.now();
        let duration = this.lastUpdateTime + GameRoom.roundDuration - currentTime;
        if (duration < 0) {
            console.log('Warning! next update should happen ' + -duration + 'ms ago!');
            duration = 0;
        }
        else {
            // console.log('actually compute costs ' + (currentTime - this.lastUpdateTime) + 'ms');
        }
        if (!this.inWx) {
            this.timer = setTimeout(this.updateRound.bind(this), duration);
        }
    }
    /**
     * add a real player into serverPlayerInfos by replacing a random AI player,
     * return original ID of the player. If no such AI player found, return null.
     */
    replaceAIWithPlayer() {
        const validIndexes = [];
        for (let i = 0; i < this.serverPlayerInfos.length; i++) {
            if (this.serverPlayerInfos[i].isAI) {
                validIndexes.push(i);
            }
        }
        if (validIndexes.length === 0) {
            return null;
        }
        const index = validIndexes[GameRoom.randInt(0, validIndexes.length - 1)];
        const obj = this.serverPlayerInfos[index];
        this.newPlayers.push(obj.playerID);
        return obj.playerID;
    }
    replacePlayerWithAI(playerID) {
        const obj = this.serverPlayerInfos[playerID - 1];
        obj.isAI = true;
        obj.aiInstance.init();
        this.addToClearList(obj.playerID, true);
    }
    /**
     * check if the given point is at border of the map.On the map,
     * 0 to(row - 1) and 0 to(col - 1)(both included) are walkable areas,
     * -1, row and col represent borders.Only return true if the point is exactly on the border.
     */
    atBorder(row, col) {
        if (row < -1 || row > this.nRows || col < -1 || col > this.nCols) {
            return false;
        }
        return row === -1 ||
            row === this.nRows ||
            col === -1 ||
            col === this.nCols;
    }
    /**
     * check if the given point is out of the walkable area. note the border is also considered out of range.
     */
    outOfRange(r, c) {
        return r < 0 ||
            r >= this.nRows ||
            c < 0 ||
            c >= this.nCols;
    }
    /**
     * dump the current status into a json, used for dispatching world.
     * @param playerID2Track the player to which the current status is specialized. (not the whole status is dumped
     * for transmission issue)
     */
    getListenerView(playerID2Track, viewNRows, viewNCols) {
        let leftTop = null;
        let mapString = '';
        const playerInfos = [];
        const func = (r, c) => {
            let color = 0;
            let track = 0;
            if (this.atBorder(r, c)) { // wall
                color = 15;
                track = 0;
            }
            else if (this.outOfRange(r, c)) {
                color = track = 0;
            }
            else {
                color = this.colorMap[r][c];
                track = this.trackMap[r][c];
            }
            // tslint:disable-next-line:no-bitwise
            mapString += String.fromCharCode(track << 4 | color); // low bit for color
            return true;
        };
        for (let info of this.serverPlayerInfos) {
            playerInfos.push({
                playerID: info.playerID,
                headPos: info.headPos,
                headDirection: info.headDirection,
                state: info.state,
                tracks: info.tracks,
                nKill: info.nKill
            });
            // @bug this implementation is wrong when one player has multiple viewports, but now it is okay
            if (Math.abs(info.focusPoint.x - info.headPos.x) > viewNRows / 4) {
                info.focusPoint.x = info.headPos.x;
            }
            if (Math.abs(info.focusPoint.y - info.headPos.y) > viewNCols / 4) {
                info.focusPoint.y = info.headPos.y;
            }
            if (info.playerID === playerID2Track) {
                leftTop = {
                    x: info.focusPoint.x - Math.floor(viewNRows / 2),
                    y: info.focusPoint.y - Math.floor(viewNCols / 2)
                };
                GameRoom.rangeAll(leftTop.x, leftTop.x + viewNRows - 1, leftTop.y, leftTop.y + viewNCols - 1, func);
            }
        }
        return {
            mapString,
            players: playerInfos,
            leftTop,
            leaderBoard: this.leaderBoard,
            soundFx: this.soundFxs[playerID2Track]
        };
    }
    initPlayerInfoProto() {
        for (let i = 0; i < this.playerNum; i++) {
            this.payload.players[i].playerID = this.serverPlayerInfos[i].playerID;
            if (this.serverPlayerInfos[i].headPos !== null) {
                this.payload.players[i].headPos.x = this.serverPlayerInfos[i].headPos.x;
                this.payload.players[i].headPos.y = this.serverPlayerInfos[i].headPos.y;
            }
            else {
                this.payload.players[i].headPos.x = -1; // dummy value
                this.payload.players[i].headPos.y = -1; // dummy value
            }
            this.payload.players[i].headDirection = this.serverPlayerInfos[i].headDirection;
            this.payload.players[i].nKill = this.serverPlayerInfos[i].nKill;
            this.payload.players[i].state = this.serverPlayerInfos[i].state;
            this.payload.players[i].tracks = [];
            for (let [x, y, d] of this.serverPlayerInfos[i].tracks) {
                this.payload.players[i].tracks.push(new PayLoadProtobuf_1.Track({ x: x, y: y, d: d }));
            }
            this.payload.leaderBoard[i].id = this.leaderBoard[i][0];
            this.payload.leaderBoard[i].ratio = Math.floor(this.leaderBoard[i][1] * 10000);
        }
    }
    getListenerViewProtobuf(playerID2Track, viewNRows, viewNCols) {
        const info = this.serverPlayerInfos[playerID2Track - 1];
        // @bug this implementation is wrong when one player has multiple viewports, but now it is okay
        if (Math.abs(info.focusPoint.x - info.headPos.x) > viewNRows / 4) {
            info.focusPoint.x = info.headPos.x;
        }
        if (Math.abs(info.focusPoint.y - info.headPos.y) > viewNCols / 4) {
            info.focusPoint.y = info.headPos.y;
        }
        this.payload.leftTop.x = info.focusPoint.x - Math.floor(viewNRows / 2);
        this.payload.leftTop.y = info.focusPoint.y - Math.floor(viewNCols / 2);
        const [x1, x2, y1, y2] = [this.payload.leftTop.x, this.payload.leftTop.x + viewNRows - 1,
            this.payload.leftTop.y, this.payload.leftTop.y + viewNCols - 1];
        this.payload.mapString = new Uint8Array(new ArrayBuffer(viewNRows * viewNCols));
        let cnt = 0;
        for (let r = x1; r <= x2; r++) {
            for (let c = y1; c <= y2; c++) {
                let color = 0;
                let track = 0;
                if (this.atBorder(r, c)) { // wall
                    color = 15;
                    track = 0;
                }
                else if (this.outOfRange(r, c)) {
                    color = track = 0;
                }
                else {
                    color = this.colorMap[r][c];
                    track = this.trackMap[r][c];
                }
                // tslint:disable-next-line:no-bitwise
                this.payload.mapString[cnt++] = (track << 4 | color); // low bit for color
            }
        }
        this.payload.soundFx = this.soundFxs[playerID2Track];
        return this.payload;
    }
    /**
     * Clear player's track map and/or color map.
     */
    clearPlayers() {
        for (let id of this.newPlayers) {
            this.addToClearList(id, true);
        }
        for (let p of this.playersToClear) {
            const player = this.serverPlayerInfos[p[0] - 1];
            player.tracks = [];
            if (p[1] === true) { // @refactor
                player.state = 1;
                this.soundFxs[player.playerID] = Math.max(this.soundFxs[player.playerID], 3);
                if (!player.isAI) { // is human
                    p[1] = false; // do not clear color
                }
            }
        }
        if (this.playersToClear.length > 0) {
            for (let i = 0; i < this.nRows; i++) {
                for (let j = 0; j < this.nCols; j++) {
                    if (this.trackMap[i][j] !== 0 || this.colorMap[i][j] !== 0) {
                        for (let p of this.playersToClear) {
                            if (p[0] === this.trackMap[i][j]) {
                                this.trackMap[i][j] = 0;
                            }
                            if (p[1] && p[0] === this.colorMap[i][j]) {
                                this.colorMap[i][j] = 0;
                            }
                        }
                    }
                }
            }
        }
        while (this.newPlayers.length > 0) {
            let id = this.newPlayers.pop();
            if (this.serverPlayerInfos[id - 1].state === 1) {
                this.serverPlayerInfos[id - 1].state = 4;
            }
            this.serverPlayerInfos[id - 1].isAI = false;
        }
    }
    updateDeadPlayer() {
        for (let info of this.serverPlayerInfos) {
            if (info.state === 2 && info.isAI) {
                this.rebornList.push(info.playerID);
            }
            else if (info.state === 4) {
                info.state = 2;
                this.rebornList.push(info.playerID);
            }
        }
    }
    rebornHumanPlayer(playerId) {
        this.rebornHumanList.push(playerId);
    }
}
GameRoom.directions = [
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
];
GameRoom.roundDuration = 200; // 200ms per round
exports.GameRoom = GameRoom;
