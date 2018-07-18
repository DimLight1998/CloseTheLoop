import { IPlayerInfo, IPoint, IPayLoadJson } from './IPlayerInfo';
import { IClientAdapter } from './IAdapter';
import CameraController from './CameraController';
import { GameRoom } from './GameRoom';

const { ccclass, property } = cc._decorator;

@ccclass
export default class GameView extends cc.Component {
    static colorList: cc.Color[] = [
        cc.color(255, 255, 255),
        cc.color(229, 115, 115),
        cc.color(186, 104, 200),
        cc.color(121, 134, 203),
        cc.color(79, 195, 247),
        cc.color(77, 182, 172),
        cc.color(174, 213, 129),
        cc.color(255, 241, 118),
        cc.color(255, 183, 77),
        cc.color(161, 136, 127),
        cc.color(144, 164, 174),
        cc.color(130, 119, 23),
        cc.color(255, 111, 0),
        cc.color(62, 39, 35),
        cc.color(27, 94, 32),
        cc.color(255, 255, 255) // white for wall
    ];

    @property(cc.Node)
    cameraNode: cc.Node = null;

    @property
    nRows: number = 20;

    @property
    nCols: number = 34;

    @property(cc.Prefab)
    spritePrefab: cc.Prefab = null;

    @property(cc.SpriteFrame)
    squareFrame: cc.SpriteFrame = null;

    @property([cc.SpriteFrame])
    triangleFrames: cc.SpriteFrame[] = [];

    @property(cc.SpriteFrame)
    wallFrame: cc.SpriteFrame = null;

    @property
    nextDuration: number = 200;// 200ms per round

    @property
    timeEpsilon: number = 10;

    @property
    trackOpacity: number = 128;

    @property
    angleOpacity: number = 180;

    colorRoot: cc.Node;
    trackRoot: cc.Node;
    headRoot: cc.Node;
    colorTiles: cc.Node[][] = null;
    trackTiles: cc.Node[][] = null;

    colorMap: number[][] = null;
    trackMap: number[][] = null;
    players: IPlayerInfo[] = [];

    myPlayerID: number;
    myRoomID: number;
    leftTop: IPoint;

    clientAdapter: IClientAdapter;

    timeLeft: number;

    public setClientAdapter(adapter: IClientAdapter): void {
        this.clientAdapter = adapter;
    }

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
                // tslint:disable-next-line:no-bitwise
                this.colorMap[newLeftTop.x + i][newLeftTop.y + j] = charCode & ((1 << 4) - 1);
                // tslint:disable-next-line:no-bitwise
                this.trackMap[newLeftTop.x + i][newLeftTop.y + j] = (charCode >> 4) & ((1 << 4) - 1);
                cnt++;
            }
        }
        this.leftTop = newLeftTop;
    }

    public startGame(): void { // call it after setting client adapter

        [this.myPlayerID, this.myRoomID] = this.clientAdapter.registerPlayer();

        this.clientAdapter.registerViewPort(this.myPlayerID, this.myRoomID,
            this.nRows, this.nCols, this.refreshData.bind(this));
        this.fetchNewWorld();
    }

    public changeDirection(direction: number): void {
        if (this.clientAdapter !== null) {
            this.clientAdapter.changeDirection(this.myPlayerID, direction);
        }
    }

    outOfView(row: number, col: number): boolean {
        return row < this.leftTop.x ||
            row >= this.leftTop.x + this.nRows ||
            col < this.leftTop.y ||
            col >= this.leftTop.y + this.nCols;
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

            let ix: number;
            let iy: number;
            if (info.state === 0) { // alive
                ix = info.headPos.x - GameRoom.directions[info.headDirection].x;
                iy = info.headPos.y - GameRoom.directions[info.headDirection].y;
            } else {
                ix = info.headPos.x;
                iy = info.headPos.y;
            }

            this.headRoot.children[i].position = this.getRowColPosition(ix, iy);

            // camera code
            if (info.playerID === this.myPlayerID) {
                this.cameraNode.getComponent<CameraController>(CameraController).setFollower(this.headRoot.children[i]);
            }

            this.headRoot.children[i].color = GameView.colorList[info.playerID];

            if (info.playerID === this.myPlayerID) {// fixme
                console.log(info.tracks.length);
            }

            for (let t of info.tracks) {
                if (!this.outOfView(t[0], t[1])) {
                    this.trackTiles[t[0]][t[1]].getComponent(cc.Sprite).spriteFrame = this.triangleFrames[t[2]];
                    this.trackTiles[t[0]][t[1]].opacity = this.angleOpacity;
                }
            }
            // todo player die, animation, explosion
        }
    }

    fetchNewWorld(): void {
        this.clientAdapter.requestNewWorld(Date.now());
    }

    public refreshData(info: IPayLoadJson, deltaTime: number): void {
        this.setLeftTop(info.leftTop, info.mapString);
        this.players = info.players;
        this.onWorldChange(deltaTime);
    }

    adjustDuration(deltaTime: number): void {
        if (deltaTime > this.timeEpsilon) { // 取信息取早了
            this.nextDuration += this.timeEpsilon;
        } else if (deltaTime < -this.timeEpsilon) {
            if (this.nextDuration >= this.timeEpsilon) {
                this.nextDuration -= this.timeEpsilon;
            }
        }
        console.log(this.nextDuration);// fixme
        this.timeLeft = this.nextDuration / 1000;
    }

    onWorldChange(deltaTime: number): void {
        this.adjustDuration(deltaTime);
        for (let r: number = this.leftTop.x; r < this.leftTop.x + this.nRows; r++) {
            for (let c: number = this.leftTop.y; c < this.leftTop.y + this.nCols; c++) {
                this.colorTiles[r][c].position = this.trackTiles[r][c].position = this.getRowColPosition(r, c);

                this.colorTiles[r][c].color = GameView.colorList[this.colorMap[r][c]];
                if (this.colorMap[r][c] === 15) { // wall
                    this.colorTiles[r][c].getComponent(cc.Sprite).spriteFrame = this.wallFrame;
                } else {
                    this.colorTiles[r][c].getComponent(cc.Sprite).spriteFrame = this.squareFrame;
                }

                this.trackTiles[r][c].color = GameView.colorList[this.trackMap[r][c]];
                this.trackTiles[r][c].getComponent(cc.Sprite).spriteFrame = this.squareFrame;
                if (this.trackMap[r][c] === 0) { // space
                    this.trackTiles[r][c].opacity = 0;
                } else {
                    this.trackTiles[r][c].opacity = this.trackOpacity;
                }
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
    }

    update(dt: number): void {
        if (this.timeLeft < dt) {
            this.timeLeft = dt;
        }
        const ratio: number = dt / this.timeLeft;
        for (let i: number = 0; i < this.players.length; i++) {
            const info: IPlayerInfo = this.players[i];
            if (info.state === 0) {
                const playerNode: cc.Node = this.headRoot.children[i];
                const targetPos: cc.Vec2 = this.getRowColPosition(info.headPos.x, info.headPos.y);
                const deltaVector: cc.Vec2 = targetPos.sub(playerNode.position).mul(ratio);
                playerNode.position = playerNode.position.add(deltaVector);
            }
        }
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.fetchNewWorld();
        }
    }
}
