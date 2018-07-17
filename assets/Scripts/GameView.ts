import { IPlayerInfo, IPoint, IPayLoadJson } from "./IPlayerInfo";
import { IClientAdapter } from "./IAdapter";

const { ccclass, property } = cc._decorator;

@ccclass
export default class GameView extends cc.Component {
    @property(cc.Node)
    cameraNode: cc.Node = undefined;

    @property
    nRows: number = 20;

    @property
    nCols: number = 34;

    @property(cc.Prefab)
    spritePrefab: cc.Prefab = null;

    @property
    nextDuration: number = 200;// 200ms per round

    @property
    timeEpsilon: number = 10;

    colorRoot: cc.Node;
    trackRoot: cc.Node;
    headRoot: cc.Node;
    colorTiles: cc.Node[][] = null;
    trackTiles: cc.Node[][] = null;

    colorMap: number[][] = null;
    trackMap: number[][] = null;
    players: IPlayerInfo[];

    myPlayerID: number;
    private leftTop: IPoint;

    serverAdapter: IClientAdapter;

    public setLeftTop(newLeftTop: IPoint, mapString: string): void {
        let cnt: number = 0;
        this.colorTiles = [];
        this.trackTiles = [];
        this.colorMap = [];
        this.trackMap = [];
        for (let i: number = 0; i < this.nRows; i++) {
            this.colorTiles[newLeftTop.x + i] = [];
            this.trackTiles[newLeftTop.x + i] = [];
            this.colorMap[newLeftTop.x + i] = [];
            this.trackMap[newLeftTop.x + i] = [];
            for (let j: number = 0; j < this.nCols; j++) {
                this.colorTiles[newLeftTop.x + i][newLeftTop.y + j] = this.colorRoot.children[cnt];
                this.trackTiles[newLeftTop.x + i][newLeftTop.y + j] = this.trackRoot.children[cnt];
                const charCode: number = mapString.charCodeAt(cnt);
                this.colorMap[newLeftTop.x + i][newLeftTop.y + j] = charCode & ((1 << 4) - 1);
                this.trackMap[newLeftTop.x + i][newLeftTop.y + j] = (charCode >> 4) & ((1 << 4) - 1);
                cnt++;
            }
        }
        this.leftTop = newLeftTop;
    }

    getRowColPosition(row: number, col: number): cc.Vec2 {
        const spriteWidth: number = this.colorRoot.children[0].width;
        const spriteHeight: number = this.colorRoot.children[0].height;
        return cc.v2(spriteWidth * col, -spriteHeight * row);
    }

    updateHeads(): void {
        while (this.headRoot.childrenCount > this.players.length) {
            this.headRoot.children[this.headRoot.childrenCount - 1].destroy();
        }
        while (this.headRoot.childrenCount < this.players.length) {
            this.headRoot.addChild(cc.instantiate(this.spritePrefab));
        }
        for (let i: number = 0; i < this.players.length; i++) {
            const info: IPlayerInfo = this.players[i];
            if (i === 0) {
                this.headRoot.children[i].runAction(cc.sequence(
                    cc.moveTo(this.nextDuration / 1000, this.getRowColPosition(info.headPos.x, info.headPos.y)),
                    cc.callFunc(this.fetchNewWorld, this)));
            } else {
                this.headRoot.children[i].runAction(
                    cc.moveTo(this.nextDuration / 1000, this.getRowColPosition(info.headPos.x, info.headPos.y)));
            }
            // todo player die, animation, explosion
        }
    }

    fetchNewWorld(): void {
        this.serverAdapter.retrieveNewWorld(Date.now());
    }

    public refreshData(jsonData: IPayLoadJson, deltaTime: number): void {
        this.setLeftTop(jsonData.leftTop, jsonData.mapString);
        this.onWorldChange(deltaTime);
    }

    adjustDuration(deltaTime: number): void {
        if (deltaTime > this.timeEpsilon) {// 取信息取早了
            this.nextDuration += this.timeEpsilon;
        } else if (deltaTime < -this.timeEpsilon) {
            if (this.nextDuration >= this.timeEpsilon) {
                this.nextDuration -= this.timeEpsilon;
            }
        }
    }

    onWorldChange(deltaTime: number): void {
        this.adjustDuration(deltaTime);
        for (let r: number = this.leftTop.x; r < this.leftTop.x + this.nRows; r++) {
            for (let c: number = this.leftTop.y; c < this.leftTop.y + this.nCols; c++) {
                this.colorTiles[r][c].position = this.trackTiles[r][c].position = this.getRowColPosition(r, c);
                // this.trackTiles[r][c].getChildByName('DebugLabel').getComponent(cc.Label).string = r + ' ' + c;
                // todo
            }
        }
        this.updateHeads();
    }

    onLoad(): void {
        this.colorRoot = this.node.getChildByName('ColorMapRoot');
        this.trackRoot = this.node.getChildByName('TrackMapRoot');
        this.headRoot = this.node.getChildByName('HeadRoot');
        for (let i: number = this.nRows * this.nCols; i > 0; i--) {
            this.colorRoot.addChild(cc.instantiate(this.spritePrefab));
            this.trackRoot.addChild(cc.instantiate(this.spritePrefab));
        }

        // test use
        // this.setLeftTop({ x: 0, y: 0 });
        // this.onWorldChange();
        // this.cameraNode.position = this.colorTiles[this.leftTop.x + this.nRows / 2][this.leftTop.y + this.nCols / 2].position;
    }
}
