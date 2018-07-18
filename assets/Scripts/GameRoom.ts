import { IServerPlayerInfo } from './IServerPlayerInfo';
import { GameAI } from './GameAI';
import { IPoint, IPayLoadJson, IPlayerInfo } from './IPlayerInfo';
import { IServerAdapter } from './IAdapter';

export class GameRoom {
    static directions: IPoint[] = [
        { x: -1, y: 0 }, // up
        { x: 0, y: 1 }, // right
        { x: 1, y: 0 }, // down
        { x: 0, y: -1 }, // left
    ];

    static roundDuration: number = 200;// 200ms per round

    nRows: number;
    nCols: number;
    colorMap: number[][];
    trackMap: number[][];
    serverPlayerInfos: IServerPlayerInfo[];
    playerNum: number;// do not exceed 14
    timer: number;
    lastUpdateTime: number;
    serverAdapter: IServerAdapter = null;
    playersToClear: [number, boolean][] = [];
    potentialFillList: number[] = [];

    mapStatus: number[][] = null;
    maxT: number;

    constructor(nRows: number, nCols: number, playerNum: number) {
        this.nRows = nRows;
        this.nCols = nCols;
        this.playerNum = playerNum;
        this.colorMap = GameRoom.create2DArray(nRows, nCols);
        this.trackMap = GameRoom.create2DArray(nRows, nCols);
        this.mapStatus = GameRoom.create2DArray(nRows, nCols);
        this.maxT = 0;
    }

    static create2DArray(nRows: number, nCols: number): number[][] {
        const res: number[][] = [];
        for (let i: number = 0; i < nRows; i++) {
            res[i] = [];
            for (let j: number = 0; j < nCols; j++) {
                res[i][j] = 0;
            }
        }
        return res;
    }

    static randInt(l: number, r: number): number {
        return l + Math.floor(Math.random() * (r - l + 1));
    }

    static rangeAll(rMin: number, rMax: number, cMin: number, cMax: number, callback: (r: number, c: number) => boolean): boolean {
        for (let r: number = rMin; r <= rMax; r++) {
            for (let c: number = cMin; c <= cMax; c++) {
                if (!callback(r, c)) {
                    return false;
                }
            }
        }
        return true;
    }

    public setServerAdapter(adapter: IServerAdapter): void {
        this.serverAdapter = adapter;
    }

    /**
     * initialize all AI players (will be replaced soon), update round regularly.
     */
    public startNewGame(): void {
        this.initAIPlayers();
        this.timer = setTimeout(this.updateRound.bind(this), 0);// invoke the first time
    }

    /**
     * change the player's direction, prevent turning back.
     */
    changeDirection(playerID: number, direction: number): void { // validate the direction
        const player: IServerPlayerInfo = this.serverPlayerInfos[playerID - 1];
        if ((player.headDirection + 2) % 4 === direction) {
            // invalid direction
        } else {
            player.nextDirection = direction;
        }
    }

    /**
     * try to generate a 3x3 block for a player to spawn on, return the center of the block.
     * sometimes finding such area is hard (maybe impossible), return null in this case.
     */
    randomSpawnNewPlayer(playerID: number): IPoint {
        const maxTryNum: number = 100;
        for (let i: number = 0; i < maxTryNum; i++) {
            const r: number = GameRoom.randInt(0, this.nRows - 1);
            const c: number = GameRoom.randInt(0, this.nCols - 1);
            if (GameRoom.rangeAll(r - 1, r + 1, c - 1, c + 1, (r: number, c: number): boolean => {
                if (this.outOfRange(r, c)) {
                    return false;
                }
                return this.colorMap[r][c] === 0;
            })) {
                GameRoom.rangeAll(r - 1, r + 1, c - 1, c + 1, (r: number, c: number): boolean => {
                    this.colorMap[r][c] = playerID;
                    return true;// will continue
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
    initAIPlayers(): void {
        this.serverPlayerInfos = [];
        for (let i: number = 0; i < this.playerNum; i++) {
            const info: IServerPlayerInfo = {
                playerID: i + 1, // 0 reserverd for space
                isAI: true,
                aiInstance: new GameAI(this),
                headPos: null, // do it later
                headDirection: 0, // up
                nBlocks: 0, // do it later
                state: 0, // 0 活着，1正在爆炸，2死了
                nextDirection: 0, // same as headDirection
                tracks: []
            };
            // info.aiInstance.registerEvent(this.eventEmitter); todo
            info.headPos = this.randomSpawnNewPlayer(info.playerID);
            if (info.headPos !== null) {
                info.nBlocks = 9;
            } else {
                info.nBlocks = 0;
                info.state = 2;
            }
            this.serverPlayerInfos.push(info);
        }
    }

    addToClearList(playerID: number, includeMap: boolean): void {
        for (let i: number = 0; i < this.playersToClear.length; i++) {
            if (this.playersToClear[i][0] === playerID) {
                this.playersToClear[i][1] = this.playersToClear[i][1] || includeMap;
                return;
            }
        }
        this.playersToClear.push([playerID, includeMap]);
    }

    updateDyingPlayers(): void {
        for (let player of this.serverPlayerInfos) {
            if (player.state === 1) {
                player.state = 2;
            }
        }
    }

    /**
     * update all players' location, logically.
     */
    updatePlayerPos(): void {
        for (let player of this.serverPlayerInfos) {
            if (player.state === 0) { // alive

                if (this.colorMap[player.headPos.x][player.headPos.y] !== player.playerID) {
                    this.trackMap[player.headPos.x][player.headPos.y] = player.playerID;

                    if (player.headDirection !== player.nextDirection) {
                        let a: number = player.headDirection;
                        let b: number = player.nextDirection;
                        let res: number;
                        if ((a + 1) % 4 !== b) {// anti clock wise
                            res = (a + 1) % 4;
                        } else {// clock wise
                            res = a;
                        }
                        player.tracks.push([player.headPos.x, player.headPos.y, res]);
                    }
                }

                player.headDirection = player.nextDirection;
                const vector: IPoint = GameRoom.directions[player.headDirection];

                let nextPositionX: number = player.headPos.x + vector.x;
                let nextPositionY: number = player.headPos.y + vector.y;
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

    updateTrackCutting(): void {
        for (let player of this.serverPlayerInfos) {
            if (!this.atBorder(player.headPos.x, player.headPos.y)) {
                let currentTrackId: number = this.trackMap[player.headPos.x][player.headPos.y];
                if (currentTrackId !== 0) {
                    for (let otherPlayer of this.serverPlayerInfos) {
                        if (otherPlayer.playerID === currentTrackId) {
                            if (!this.atBorder(otherPlayer.headPos.x, otherPlayer.headPos.y)) {// will be killed by wall
                                if (this.colorMap[otherPlayer.headPos.x][otherPlayer.headPos.y] !== otherPlayer.playerID) {
                                    this.addToClearList(otherPlayer.playerID, true);
                                } else {
                                    this.addToClearList(otherPlayer.playerID, false);
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }
    }

    updatePlayerOverlapping(): void {
        for (let player of this.serverPlayerInfos) {
            if (player.state === 0) {
                let [curPlayerX, curPlayerY]: [number, number] = [player.headPos.x, player.headPos.y];

                if (this.atBorder(curPlayerX, curPlayerY)) {
                    this.addToClearList(player.playerID, true);
                } else {
                    for (let otherPlayer of this.serverPlayerInfos) {
                        if (otherPlayer !== player &&
                            otherPlayer.state === 0 &&
                            otherPlayer.headPos.x === curPlayerX &&
                            otherPlayer.headPos.y === curPlayerY &&
                            this.colorMap[otherPlayer.headPos.x][otherPlayer.headPos.y] !== otherPlayer.playerID) {
                            this.addToClearList(otherPlayer.playerID, true);
                        }
                    }
                }
            }
        }
    }

    updateColorFilling(): void {
        /**
         * This function will consider color and track with id `walledId` as wall.
         */
        function fillingAux(
            queue: [number, number][],
            x: number,
            y: number,
            walledId: number,
            room: GameRoom,
            fillStatus: number[][],
            targetValue: number
        ): boolean {
            if (room.atBorder(x, y)) {
                return true;
            }
            if (room.colorMap[x][y] !== walledId && room.trackMap[x][y] !== walledId
                && fillStatus[x][y] !== targetValue) {
                fillStatus[x][y] = targetValue;
                queue.push([x, y]);
            }
            return false;
        }

        // since there are modification to the clearList, we should update potential list
        let excludeList: number[] = [];
        for (let p of this.playersToClear) {
            excludeList.push(p[0]);
        }

        for (let i: number = this.potentialFillList.length - 1; i >= 0; i--) {
            if (excludeList.indexOf(this.potentialFillList[i]) !== -1) {
                this.potentialFillList.splice(i, 1);
            }
        }

        // for elements still in the potential list, fill for them
        for (let playerId of this.potentialFillList) {
            this.maxT++;

            // flood fill
            for (let r: number = 0; r < this.nRows; r++) {
                for (let c: number = 0; c < this.nCols; c++) {
                    if (this.mapStatus[r][c] !== this.maxT && this.colorMap[r][c] !== playerId && this.trackMap[r][c] !== playerId) {
                        // start flood fill
                        let adjToWall: boolean = false;
                        let queue: [number, number][] = [];
                        queue.push([r, c]);
                        this.mapStatus[r][c] = this.maxT;

                        while (queue.length > 0) {
                            let [x, y]: [number, number] = queue.shift();

                            adjToWall = adjToWall || fillingAux(queue, x + 1, y, playerId, this, this.mapStatus, this.maxT);
                            adjToWall = adjToWall || fillingAux(queue, x - 1, y, playerId, this, this.mapStatus, this.maxT);
                            adjToWall = adjToWall || fillingAux(queue, x, y + 1, playerId, this, this.mapStatus, this.maxT);
                            adjToWall = adjToWall || fillingAux(queue, x, y - 1, playerId, this, this.mapStatus, this.maxT);
                        }

                        if (!adjToWall) {
                            // this block is not adjacent to a wall, so it should be colored
                            queue.push([r, c]);
                            this.colorMap[r][c] = playerId;

                            while (queue.length > 0) {
                                let [x, y]: [number, number] = queue.shift();

                                fillingAux(queue, x + 1, y, playerId, this, this.colorMap, playerId);
                                fillingAux(queue, x - 1, y, playerId, this, this.colorMap, playerId);
                                fillingAux(queue, x, y + 1, playerId, this, this.colorMap, playerId);
                                fillingAux(queue, x, y - 1, playerId, this, this.colorMap, playerId);
                            }
                        }
                    }
                }
            }

            for (let r: number = 0; r < this.nRows; r++) {
                for (let c: number = 0; c < this.nCols; c++) {
                    if (this.trackMap[r][c] === playerId) {
                        this.colorMap[r][c] = playerId;
                        this.trackMap[r][c] = 0;
                    }
                }
            }

            for (let info of this.serverPlayerInfos) {// clear tracks
                if (info.playerID === playerId) {
                    info.tracks = [];
                }
            }
        }
    }

    /**
     * update all players' position logically. if it has a server adapter, dispatch the world to other clients.
     */
    updateRound(): void {
        this.lastUpdateTime = Date.now();
        this.playersToClear = [];
        this.potentialFillList = [];
        this.updateDyingPlayers();
        this.updatePlayerPos();
        this.updateTrackCutting();
        this.updatePlayerOverlapping();
        this.updateColorFilling();
        this.clearPlayers();
        if (this.serverAdapter !== null) {
            this.serverAdapter.dispatchNewWorld();
        }
        let currentTime: number = Date.now();
        let duration: number = this.lastUpdateTime + GameRoom.roundDuration - currentTime;
        if (duration < 0) {
            console.log('Warning! next update should happen ' + -duration + 'ms ago!');
            duration = 0;
        } else {
            console.log('actually compute costs ' + (currentTime - this.lastUpdateTime) + 'ms');// fixme
        }
        this.timer = setTimeout(this.updateRound.bind(this), duration);
    }

    /**
     * add a real player into serverPlayerInfos by replacing a random AI player,
     * return original ID of the player. If no such AI player found, return null.
     */
    registerPlayer(): number {
        const validIndexes: number[] = [];
        for (let i: number = 0; i < this.serverPlayerInfos.length; i++) {
            if (this.serverPlayerInfos[i].isAI) {
                validIndexes.push(i);
            }
        }
        if (validIndexes.length === 0) {
            return null;
        }
        const index: number = validIndexes[GameRoom.randInt(0, validIndexes.length - 1)];
        const obj: IServerPlayerInfo = this.serverPlayerInfos[index];
        obj.isAI = false;
        obj.aiInstance = null;
        // todo respawn obj
        return obj.playerID;
    }

    /**
     * check if the given point is at border of the map.On the map,
     * 0 to(row - 1) and 0 to(col - 1)(both included) are walkable areas,
     * -1, row and col represent borders.Only return true if the point is exactly on the border.
     */
    atBorder(row: number, col: number): boolean {
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
    outOfRange(r: number, c: number): boolean {
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
    getListenerView(playerID2Track: number, viewNRows: number, viewNCols: number): IPayLoadJson {
        let leftTop: IPoint = null;
        let mapString: string = '';
        const playerInfos: IPlayerInfo[] = [];
        const func: (r: number, c: number) => boolean = (r: number, c: number): boolean => {
            let color: number = 0;
            let track: number = 0;
            if (this.atBorder(r, c)) { // wall
                color = 15;
                track = 0;
            } else if (this.outOfRange(r, c)) {
                color = track = 0;
            } else {
                color = this.colorMap[r][c];
                track = this.trackMap[r][c];
            }
            // tslint:disable-next-line:no-bitwise
            mapString += String.fromCharCode(track << 4 | color);// low bit for color
            return true;
        };
        for (let info of this.serverPlayerInfos) {
            playerInfos.push({
                playerID: info.playerID,
                headPos: info.headPos,
                headDirection: info.headDirection,
                nBlocks: info.nBlocks,
                state: info.state,
                tracks: info.tracks
            });
            if (info.playerID === playerID2Track) {
                leftTop = {
                    x: info.headPos.x - Math.floor(viewNRows / 2),
                    y: info.headPos.y - Math.floor(viewNCols / 2)
                };
                GameRoom.rangeAll(leftTop.x, leftTop.x + viewNRows - 1,
                    leftTop.y, leftTop.y + viewNCols - 1, func);
            }
        }

        return {
            mapString,
            players: playerInfos,
            leftTop
        };
    }

    /**
     * Clear player's track map and/or color map.
     */
    clearPlayers(): void {
        for (let i: number = 0; i < this.nRows; i++) {
            for (let j: number = 0; j < this.nCols; j++) {
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
        for (let player of this.serverPlayerInfos) {
            for (let p of this.playersToClear) {
                if (p[0] === player.playerID) {
                    if (p[1]) {// @refactor
                        player.tracks = [];
                        player.state = 1;
                    }
                    break;
                }
            }
        }
    }
}