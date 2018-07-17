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
    serverAdapter: IServerAdapter = null;

    constructor(nRows: number, nCols: number, playerNum: number) {
        this.nRows = nRows;
        this.nCols = nCols;
        this.playerNum = playerNum;
        this.colorMap = GameRoom.create2DArray(nRows, nCols);
        this.trackMap = GameRoom.create2DArray(nRows, nCols);
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

    public startNewGame(): void {
        this.initAIPlayers();
        this.timer = setInterval(this.updateRound.bind(this), GameRoom.roundDuration);
        this.updateRound();// invoke the first time
    }

    changeDirection(playerID: number, direction: number): void { // validate the direction
        for (const player of this.serverPlayerInfos) {
            if (player.playerID === playerID) {
                if ((player.headDirection + 2) % 4 === direction) {
                    // invalid direction
                } else {
                    player.nextDirection = direction;
                }
                break;
            }
        }
    }

    outOfRange(r: number, c: number): boolean {
        return r < 0 ||
            r >= this.nRows ||
            c < 0 ||
            c >= this.nCols;
    }

    // 返回玩家被重生到的位置
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
                this.serverPlayerInfos.push(info);
            }// otherwise, discard the ai
        }
    }

    updatePlayerPos(): void {
        for (const player of this.serverPlayerInfos) {
            if (player.state === 0) { // alive
                player.headDirection = player.nextDirection;
                const vector: IPoint = GameRoom.directions[player.headDirection];
                player.headPos.x += vector.x;
                player.headPos.y += vector.y;
                // todo update its tracks
            }
        }
    }

    updateRound(): void {
        // todo there are a lot to do
        this.updatePlayerPos();
        if (this.serverAdapter !== null) {
            this.serverAdapter.dispatchNewWorld();
        }
    }

    registerPlayer(): number {
        const validIndexs: number[] = [];
        for (let i: number = 0; i < this.serverPlayerInfos.length; i++) {
            if (this.serverPlayerInfos[i].isAI) {
                validIndexs.push(i);
            }
        }
        if (validIndexs.length === 0) {
            return null;
        }
        const index: number = validIndexs[GameRoom.randInt(0, validIndexs.length - 1)];
        const obj: IServerPlayerInfo = this.serverPlayerInfos[index];
        obj.isAI = false;
        obj.aiInstance = null;
        // todo respawn obj
        return obj.playerID;
    }

    atBorder(row: number, col: number): boolean {
        if (row < -1 || row > this.nRows || col < -1 || col > this.nCols) {
            return false;
        }
        return row === -1 ||
            row === this.nRows ||
            col === -1 ||
            col === this.nCols;
    }

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

}