import { IServerPlayerInfo } from "./IServerPlayerInfo";
import { GameAI } from "./GameAI";
import { IColor, IPoint } from "./IPlayerInfo";

export class GameRoom {
    static colorList: IColor[] = [
        { r: 255, g: 0, b: 0, a: 255 },
        { r: 0, g: 255, b: 0, a: 255 },
        { r: 0, g: 0, b: 255, a: 255 }
    ];

    static directions: IPoint[] = [
        { x: -1, y: 0 },// up
        { x: 0, y: 1 },// right
        { x: 1, y: 0 },// down
        { x: 0, y: -1 },// left
    ];

    static roundDuration: number = 200;// 200ms per round

    eventEmitter: any;
    nRows: number;
    nCols: number;
    colorMap: number[][];
    trackMap: number[][];
    serverPlayerInfos: IServerPlayerInfo[];
    playerNum: number;// do not exceed 14
    timer: number;

    static create2DArray(nRows: number, nCols: number): number[][] {
        return Array(nRows).fill(0).map(() => Array(nCols).fill(0));
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

    constructor(eventEmitter: any, nRows: number, nCols: number, playerNum: number) {
        this.eventEmitter = eventEmitter;
        this.nRows = nRows;
        this.nCols = nCols;
        this.playerNum = playerNum;
        this.colorMap = GameRoom.create2DArray(nRows, nCols);
        this.trackMap = GameRoom.create2DArray(nRows, nCols);

        this.registerAI();
        this.timer = setInterval(this.updateRound.bind(this), GameRoom.roundDuration);
        // this.updateRound();// invoke the first time
    }

    changeDirection(playerID: number, direction: number): void {// validate the direction
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

    registerAI(): void {
        this.serverPlayerInfos = [];
        for (let i: number = 0; i < this.playerNum; i++) {
            const info: IServerPlayerInfo = {
                playerID: i,
                isAI: true,
                aiInstance: new GameAI(this),
                playerColor: GameRoom.colorList[i],
                headPos: null,// do it later
                headDirection: 0,// up
                nBlocks: 0,// do it later
                state: 0,// 0 活着，1正在爆炸，2死了
                nextDirection: 0// same as headDirection
            };
            info.aiInstance.registerEvent(this.eventEmitter);
            info.headPos = this.randomSpawnNewPlayer(info.playerID);
            if (info.headPos !== null) {
                info.nBlocks = 9;
                this.serverPlayerInfos.push(info);
            }// otherwise, discard the ai
        }
    }

    updatePlayerPos(): void {
        for (const player of this.serverPlayerInfos) {
            if (player.state === 0) {// alive
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
        this.eventEmitter.emit('worldchanged');
    }

}