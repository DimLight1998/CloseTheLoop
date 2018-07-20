import { IPlayerInfo, IPoint, IPayLoadJson } from './IPlayerInfo';
import { IClientAdapter } from './IAdapter';
import CameraController from './CameraController';
import { GameRoom } from './GameRoom';
import tinycolor = require('../Lib/tinycolor.js');

const { ccclass, property } = cc._decorator;

@ccclass
export default class GameView extends cc.Component {
    static colorList: tinycolorInstance[] = [
        tinycolor('#ffffff'),
        tinycolor('#ba68c8'),
        tinycolor('#7986cb'),
        tinycolor('#64b5f6'),
        tinycolor('#e57373'),
        tinycolor('#4dd0e1'),
        tinycolor('#4db6ac'),
        tinycolor('#81c784'),
        tinycolor('#aed581'),
        tinycolor('#dce775'),
        tinycolor('#90a4ae'),
        tinycolor('#ffd54f'),
        tinycolor('#ffb74d'),
        tinycolor('#ff8a65'),
        tinycolor('#a1887f'),
        tinycolor('#ffffff')
    ];

    lightColorList: cc.Color[] = [];
    darkColorList: cc.Color[] = [];

    static toRGBTuple(color: tinycolorInstance): [number, number, number] {
        const tmp: ColorFormats.RGBA = color.toRgb();
        return [tmp.r, tmp.g, tmp.b];
    }

    @property(cc.Node)
    cameraNode: cc.Node = null;

    @property
    nRows: number = 20;

    @property
    nCols: number = 34;

    @property(cc.Prefab)
    spritePrefab: cc.Prefab = null;

    @property(cc.Prefab)
    playerPrefab: cc.Prefab = null;

    @property(cc.Prefab)
    particlePrefab: cc.Prefab = null;

    @property(cc.SpriteFrame)
    squareFrame: cc.SpriteFrame = null;

    @property([cc.SpriteFrame])
    triangleFrames: cc.SpriteFrame[] = [];

    @property(cc.SpriteFrame)
    wallFrame: cc.SpriteFrame = null;

    @property(cc.SpriteFrame)
    groundBarFrame: cc.SpriteFrame = null;

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
    particleRoot: cc.Node;
    colorTiles: cc.Node[][] = null;
    trackTiles: cc.Node[][] = null;

    colorMap: number[][] = null;
    trackMap: number[][] = null;
    players: IPlayerInfo[] = [];

    oldColorMap: number[][] = null;

    myPlayerID: number;
    myRoomID: number;
    leftTop: IPoint;

    clientAdapter: IClientAdapter;

    timeLeft: number;

    public setClientAdapter(adapter: IClientAdapter): void {
        this.clientAdapter = adapter;
    }

    getOldColor(r: number, c: number): number {
        if (this.oldColorMap !== null
            && this.oldColorMap[r] !== undefined
            && this.oldColorMap[r][c] !== undefined) {
            return this.oldColorMap[r][c];
        }
        return null;
    }

    /**
     * update the view from given information.
     */
    public setLeftTop(newLeftTop: IPoint, mapString: string): void {
        let cnt: number = 0;
        this.colorTiles = [];
        this.trackTiles = [];
        this.oldColorMap = this.colorMap;
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

    /**
     * Call this function after game starts (the game should have a client adapter).
     * This function should only be called once in a game.
     */
    public startGame(): void { // call it after setting client adapter
        this.clientAdapter.registerPlayer(
            (playerId, roomId) => [this.myPlayerID, this.myRoomID] = [playerId, roomId]
        );

        this.clientAdapter.registerViewPort(this.myPlayerID, this.myRoomID,
            this.nRows, this.nCols, this.refreshData.bind(this));

        this.fetchNewWorld();
    }

    /**
     * Change the direction of the current player.
     */
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

    /**
     * Get location on the view for a given logical coordinate.
     */
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
            this.headRoot.addChild(cc.instantiate(this.playerPrefab));
        }

        for (let i: number = 0; i < this.players.length; i++) {
            const info: IPlayerInfo = this.players[i];

            if (info.state === 3) {
                const pos: cc.Vec2 = this.getRowColPosition(info.headPos.x, info.headPos.y);
                this.headRoot.children[i].position = pos;

                this.headRoot.children[i].color = this.darkColorList[info.playerID];

                if (info.playerID === this.myPlayerID) {
                    this.cameraNode.getComponent(CameraController).setFollower(this.headRoot.children[i]);
                }
            } else if (info.state === 1) {
                if (info.playerID === this.myPlayerID) {
                    this.cameraNode.getComponent(CameraController).setFollower(null);
                }

                this.headRoot.children[i].position = cc.v2(1e9, 1e9);

                const explosion: cc.Node = cc.instantiate(this.particlePrefab);
                const particle: cc.ParticleSystem = explosion.getComponent(cc.ParticleSystem);
                particle.startColor = particle.endColor = this.darkColorList[info.playerID];
                particle.endColor.setA(0);
                explosion.position = this.getRowColPosition(info.headPos.x, info.headPos.y);

                this.particleRoot.addChild(cc.instantiate(explosion));
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
        // console.log(this.nextDuration); // todo fixme
        this.timeLeft = this.nextDuration / 1000;
    }

    updateTiles(): void {
        for (let r: number = this.leftTop.x; r < this.leftTop.x + this.nRows; r++) {
            for (let c: number = this.leftTop.y; c < this.leftTop.y + this.nCols; c++) {

                this.colorTiles[r][c].position = this.trackTiles[r][c].position = this.getRowColPosition(r, c);

                if (this.colorMap[r][c] === 15) { // wall
                    this.colorTiles[r][c].getComponent(cc.Sprite).spriteFrame = this.wallFrame;
                } else if (this.colorMap[r][c] !== 0 &&
                    r + 1 < this.leftTop.x + this.nRows &&
                    this.colorMap[r + 1][c] === 0) {
                    this.colorTiles[r][c].getComponent(cc.Sprite).spriteFrame = this.groundBarFrame;
                } else {
                    this.colorTiles[r][c].getComponent(cc.Sprite).spriteFrame = this.squareFrame;
                }

                this.trackTiles[r][c].color = this.lightColorList[this.trackMap[r][c]];
                this.trackTiles[r][c].getComponent(cc.Sprite).spriteFrame = this.squareFrame;
                if (this.trackMap[r][c] === 0) { // space
                    this.trackTiles[r][c].opacity = 0;
                } else {
                    this.trackTiles[r][c].opacity = this.trackOpacity;
                }

                this.colorTiles[r][c].stopAllActions();
                const oldTile: number = this.getOldColor(r, c);
                if (oldTile !== null && this.colorMap[r][c] !== oldTile) {
                    const newColor: cc.Color = this.lightColorList[this.colorMap[r][c]];
                    this.colorTiles[r][c].color = this.lightColorList[oldTile];
                    this.colorTiles[r][c].runAction(cc.tintTo(this.nextDuration / 1000,
                        newColor.getR(), newColor.getG(), newColor.getB()));
                } else {
                    this.colorTiles[r][c].color = this.lightColorList[this.colorMap[r][c]];
                }
            }
        }
    }

    onWorldChange(deltaTime: number): void {
        // let cur: number = Date.now();
        this.adjustDuration(deltaTime);
        this.updateTiles();
        this.updateHeads();
        // console.log('world change costs ' + (Date.now() - cur) + 'ms');
    }

    /**
     * add colors and tracks sprites for later manipulation.
     * only tiles in the view will be rendered.
     */
    onLoad(): void {
        for (let c of GameView.colorList) {
            this.lightColorList.push(cc.color(...GameView.toRGBTuple(c)));
            this.darkColorList.push(cc.color(...GameView.toRGBTuple(c.clone().darken(20))));
        }
        this.colorRoot = this.node.getChildByName('ColorMapRoot');
        this.trackRoot = this.node.getChildByName('TrackMapRoot');
        this.headRoot = this.node.getChildByName('HeadRoot');
        this.particleRoot = this.node.getChildByName('ParticleRoot');
        for (let i: number = this.nRows * this.nCols; i > 0; i--) {
            this.colorRoot.addChild(cc.instantiate(this.spritePrefab));
            this.trackRoot.addChild(cc.instantiate(this.spritePrefab));
        }
    }

    /**
     * change all players' position based on the time.
     * if the map needs to be updated, update it.
     */
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
