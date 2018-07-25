import { IClientAdapter } from './IAdapter';
import CameraController from './CameraController';
import { GameRoom } from './GameRoom';
import tinycolor = require('../Lib/tinycolor.js');
import { PayLoad, MyPointProto, IMyPointProto, IPlayerInfoProto, ILeaderBoardItem } from './PayLoadProtobuf';
import { ColorUtil } from './Config';

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
    darkerColorList: cc.Color[] = [];

    static toRGBTuple(color: tinycolorInstance): [number, number, number] {
        const tmp: ColorFormats.RGBA = color.toRgb();
        return [tmp.r, tmp.g, tmp.b];
    }

    static ccColorToRGBTuple(color: cc.Color): [number, number, number] {
        return [color.getR(), color.getG(), color.getB()];
    }

    @property(cc.Node)
    foregroundNode: cc.Node = null;

    @property(cc.Node)
    cameraNode: cc.Node = null;

    @property(cc.Node)
    haloNode: cc.Node = null;

    @property(cc.Node)
    leaderBoardRoot: cc.Node = null;

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

    @property(cc.Prefab)
    leaderBoardPrefab: cc.Prefab = null;

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

    @property
    leaderBoardTopN: number = 5;

    @property(cc.AudioClip)
    soundCloseLoop: cc.AudioClip = null;

    @property(cc.AudioClip)
    soundKill: cc.AudioClip = null;

    @property(cc.AudioClip)
    soundKilled: cc.AudioClip = null;

    @property(cc.AudioClip)
    backgroundMusic: cc.AudioClip = null;

    @property(cc.Node)
    shareBoard: cc.Node = null;

    @property(cc.Node)
    exitBoard: cc.Node = null;

    viewWidth: number;
    viewHeight: number;

    colorRoot: cc.Node;
    trackRoot: cc.Node;
    headRoot: cc.Node;
    particleRoot: cc.Node;
    colorTiles: cc.Node[][] = null;
    trackTiles: cc.Node[][] = null;

    colorMap: number[][] = null;
    trackMap: number[][] = null;
    players: IPlayerInfoProto[] = [];

    oldColorMap: number[][] = null;
    leaderBoard: ILeaderBoardItem[] = [];

    myPlayerID: number;
    myRoomID: number;
    leftTop: IMyPointProto = null;

    leaderBoardBars: cc.Node[] = [];
    leaderBoardDetails: cc.Node[] = [];

    clientAdapter: IClientAdapter;

    // which sound to play this round
    roundSoundFx: number;

    firstFlag: boolean = true;

    asking: boolean = false;
    myLastPercentage: number = 0;

    hasReborn: boolean = false;

    timer: any = null;

    spriteWidth: number;
    spriteHeight: number;

    headSpeedX: number;
    headSpeedY: number;

    timeLeft: number;

    leftTopChanged: boolean;

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
    public setLeftTop(newLeftTop: IMyPointProto, mapString: Uint8Array): void {
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
                const charCode: number = mapString[cnt];
                // tslint:disable-next-line:no-bitwise
                this.colorMap[newLeftTop.x + i][newLeftTop.y + j] = charCode & ((1 << 4) - 1);
                // tslint:disable-next-line:no-bitwise
                this.trackMap[newLeftTop.x + i][newLeftTop.y + j] = (charCode >> 4) & ((1 << 4) - 1);
                cnt++;
            }
        }

        const cameraPos: cc.Vec2 = this.getRowColPosition(newLeftTop.x, newLeftTop.y)
            .add(cc.v2(this.viewWidth / 2 - this.spriteWidth / 2, -this.viewHeight / 2 + this.spriteHeight / 2));
        // @note when using this strategy, disable CameraController
        if (this.leftTop === null) {
            this.leftTop = newLeftTop;
            this.leftTopChanged = true;
            this.cameraNode.position = cameraPos;
        } else if (this.leftTop.x !== newLeftTop.x || this.leftTop.y !== newLeftTop.y) {
            this.leftTop.x = newLeftTop.x;
            this.leftTop.y = newLeftTop.y;
            this.leftTopChanged = true;
            this.cameraNode.stopAllActions();
            this.cameraNode.runAction(cc.moveTo(0.1, cameraPos));
        } else {
            this.leftTopChanged = false;
        }
    }

    /**
     * Call this function after game starts (the game should have a client adapter).
     * This function should only be called once in a game.
     */
    public startGame(): void { // call it after setting client adapter
        this.asking = true;
        this.clientAdapter.registerPlayer(
            (playerId: number, roomId: number): void => {
                [this.myPlayerID, this.myRoomID] = [playerId, roomId];

                this.clientAdapter.registerViewPort(this.myPlayerID, this.myRoomID,
                    this.nRows, this.nCols, this.refreshData.bind(this));

                this.fetchNewWorld();
            }
        );
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
        return cc.v2(this.spriteWidth * col, -this.spriteHeight * row);
    }

    updateHeadsFirstTime(): void {
        for (let i: number = 0; i < this.players.length; i++) {
            this.headRoot.addChild(cc.instantiate(this.playerPrefab));
            this.headRoot.children[i].color = this.darkColorList[this.players[i].playerID];
        }
    }


    updateHeads(): void {
        for (let i: number = 0; i < this.players.length; i++) {
            const info: IPlayerInfoProto = this.players[i];

            let ix: number, iy: number;
            if (info.state === 0) {
                ix = info.headPos.x - GameRoom.directions[info.headDirection].x;
                iy = info.headPos.y - GameRoom.directions[info.headDirection].y;
                this.headRoot.children[i].position = this.getRowColPosition(ix, iy);
            } else if (info.state === 3) {
                const pos: cc.Vec2 = this.getRowColPosition(info.headPos.x, info.headPos.y);
                this.headRoot.children[i].position = pos;

                this.headRoot.children[i].color = this.darkColorList[info.playerID];

                if (info.playerID === this.myPlayerID) {
                    this.haloNode.color = this.lightColorList[this.myPlayerID];
                    if (this.foregroundNode !== null) {
                        this.foregroundNode.destroy();
                        this.foregroundNode = null;
                    }
                    this.asking = false;
                }
            } else if (info.state === 1) {
                this.headRoot.children[i].position = cc.v2(1e9, 1e9);

                const explosion: cc.Node = cc.instantiate(this.particlePrefab);
                const particle: cc.ParticleSystem = explosion.getComponent(cc.ParticleSystem);
                particle.startColor = particle.endColor = this.darkColorList[info.playerID];
                particle.endColor.setA(0);
                explosion.position = this.getRowColPosition(info.headPos.x, info.headPos.y);

                this.particleRoot.addChild(cc.instantiate(explosion));
            }

            for (let t of info.tracks) {
                if (!this.outOfView(t.x, t.y)) {
                    this.trackTiles[t.x][t.y].getComponent(cc.Sprite).spriteFrame = this.triangleFrames[t.d];
                    this.trackTiles[t.x][t.y].opacity = this.angleOpacity;
                }
            }
        }
    }

    fetchNewWorld(): void {
        this.clientAdapter.requestNewWorld(Date.now());
    }

    public refreshData(info: PayLoad, deltaTime: number): void {
        this.setLeftTop(info.leftTop, info.mapString);
        this.players = info.players;
        if (this.firstFlag) {
            this.updateHeadsFirstTime();
        }
        this.leaderBoard = info.leaderBoard;
        if (cc.random0To1() < 0.05) {
            console.log(this.leaderBoard); // fixme
        }
        this.roundSoundFx = info.soundFx;
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
        this.headSpeedX = this.spriteWidth * 1000 / (this.nextDuration + 0.1);
        this.headSpeedY = this.spriteHeight * 1000 / (this.nextDuration + 0.1);
        this.timeLeft = this.nextDuration / 1000;
    }

    updateTiles(): void {
        for (let r: number = this.leftTop.x; r < this.leftTop.x + this.nRows; r++) {
            for (let c: number = this.leftTop.y; c < this.leftTop.y + this.nCols; c++) {

                if (this.leftTopChanged) {
                    this.colorTiles[r][c].position = this.trackTiles[r][c].position = this.getRowColPosition(r, c);
                }

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

    updateLeaderBoard(): void {
        let baseCount: number = this.leaderBoard[0].ratio;
        for (let i: number = 0; i < this.leaderBoardTopN; i++) {
            let leaderBoardPlayerId: number = this.leaderBoard[i].id;
            let leaderBoardPlayerCount: number = this.leaderBoard[i].ratio;
            let duration: number = this.nextDuration / 1000 * 2;

            // update leader board color
            let playerColor: cc.Color = this.lightColorList[leaderBoardPlayerId];

            // update leader board width
            let scaleRatio: number = leaderBoardPlayerCount / baseCount;

            let label: cc.Label = this.leaderBoardDetails[i].getComponent<cc.Label>(cc.Label);
            label.string =
                `${(leaderBoardPlayerCount * 100).toFixed(1)}%  ${this.players[leaderBoardPlayerId - 1].nKill}杀`;
            label.node.color = this.darkerColorList[leaderBoardPlayerId];

            this.leaderBoardBars[i].stopAllActions();
            this.leaderBoardBars[i].runAction(cc.spawn(
                cc.tintTo(duration / 2, playerColor.getR(), playerColor.getG(), playerColor.getB()),
                cc.scaleTo(duration, scaleRatio, 1).easing(cc.easeOut(1))
            ));
        }

        // update myLastPercentage
        for (let i: number = 0; i < this.leaderBoard.length; i++) {
            if (this.leaderBoard[i].id === this.myPlayerID) {
                this.myLastPercentage = this.leaderBoard[i].ratio;
            }
        }
    }

    updateRebornAsk(): void {
        if (!this.asking && !GameRoom.isAlive(this.players[this.myPlayerID - 1])) {
            this.asking = true;

            // send player score to sub domain
            wx.postMessage({
                command: 'UpdatePlayerScore',
                param1: this.myLastPercentage,
                param2: this.players[this.myPlayerID - 1].nKill
            });

            // show corresponding board
            if (this.hasReborn) {
                this.exitBoard.active = true;
                this.exitBoard.color = this.lightColorList[this.myPlayerID];
                this.exitBoard.getChildByName('IKnowButton').color = this.darkColorList[this.myPlayerID];
                this.exitBoard.getChildByName('ExitButton').color = this.darkColorList[this.myPlayerID];
            } else {
                this.shareBoard.active = true;
                this.shareBoard.color = this.lightColorList[this.myPlayerID];
                this.shareBoard.getChildByName('ShareButton').color = this.darkColorList[this.myPlayerID];
                this.shareBoard.getChildByName('ExitButton').color = this.darkColorList[this.myPlayerID];
            }
        }
    }

    onShareButtonClick(): void {
        cc.loader.loadRes('share', cc.SpriteFrame, (err, data) => {
            wx.shareAppMessage({
                title: '你能圈住多大的地盘呢？',
                imageUrl: data._textureFilename,
            });
        });
        this.shareBoard.getChildByName('ShareButton').getChildByName('Label').getComponent<cc.Label>(cc.Label).string = '复活';
        this.shareBoard.getChildByName('ShareButton').off('click', this.onShareButtonClick, this);
        this.shareBoard.getChildByName('ShareButton').on('click', () => {
            this.shareBoard.active = false;
            this.hasReborn = true;
            this.clientAdapter.rebornPlayer(this.myPlayerID);
        }, this);
        this.shareBoard.getChildByName('ExitButton').active = false;
    }

    async onWorldChange(deltaTime: number): Promise<void> {
        let currentTime: number = Date.now();
        this.clientAdapter.wxFireRoundStartEvent();// call server to complete the next turn
        this.adjustDuration(deltaTime);
        await this.updateTiles();
        await this.updateHeads();
        this.updateLeaderBoard();
        this.playSound();
        this.updateRebornAsk();
        if (this.firstFlag) {
            this.firstFlag = false;
        }
        let duration: number = currentTime + this.nextDuration - Date.now();
        if (duration < 0) {
            duration = 0;
        }
        this.timer = setTimeout(this.fetchNewWorld.bind(this), duration);
    }

    playSound(): void {
        switch (this.roundSoundFx) {
            case 0:
                break;
            case 1:
                cc.audioEngine.play(this.soundCloseLoop, false, 1);
                break;
            case 2:
                cc.audioEngine.play(this.soundKill, false, 1);
                break;
            case 3:
                cc.audioEngine.play(this.soundKilled, false, 1);
                break;
        }
    }


    /**
     * add colors and tracks sprites for later manipulation.
     * only tiles in the view will be rendered.
     */
    onLoad(): void {

        this.firstFlag = true;
        this.asking = false;

        this.viewWidth = cc.view.getVisibleSize().width;
        this.viewHeight = cc.view.getVisibleSize().height;
        this.nCols = Math.ceil(this.nRows * this.viewWidth / this.viewHeight);

        for (let c of GameView.colorList) {
            this.lightColorList.push(cc.color(...GameView.toRGBTuple(c)));
            this.darkColorList.push(cc.color(...GameView.toRGBTuple(c.clone().darken(20))));
            this.darkerColorList.push(cc.color(...GameView.toRGBTuple(c.clone().darken(50))));
        }
        this.colorRoot = this.node.getChildByName('ColorMapRoot');
        this.trackRoot = this.node.getChildByName('TrackMapRoot');
        this.headRoot = this.node.getChildByName('HeadRoot');
        this.particleRoot = this.node.getChildByName('ParticleRoot');
        for (let i: number = this.nRows * this.nCols; i > 0; i--) {
            this.colorRoot.addChild(cc.instantiate(this.spritePrefab));
            this.trackRoot.addChild(cc.instantiate(this.spritePrefab));
        }
        if (this.colorRoot.childrenCount > 0) {
            this.spriteWidth = this.colorRoot.children[0].width;
            this.spriteHeight = this.colorRoot.children[0].height;
        }

        for (let i: number = 0; i < this.leaderBoardTopN; i++) {
            this.leaderBoardRoot.addChild(cc.instantiate(this.leaderBoardPrefab));
        }
        for (let i: number = 0; i < this.leaderBoardTopN; i++) {
            this.leaderBoardBars.push(this.leaderBoardRoot.children[i].getChildByName('LeaderBoardBar'));
            this.leaderBoardDetails.push(this.leaderBoardRoot.children[i].getChildByName('Detail'));
            this.leaderBoardRoot.children[i].setPositionX(0);
            this.leaderBoardRoot.children[i].setPositionY(- i * this.leaderBoardBars[i].height);
        }

        // replace scale halo by using widget

        [this.foregroundNode.getChildByName('LoadLabel').color, this.haloNode.color]
            = ColorUtil.getInstance().getRandomColor().slice(0, 2);

        // play bgm
        cc.audioEngine.play(this.backgroundMusic, true, 1);

        // buttons on boards
        this.shareBoard.getChildByName('ShareButton').on('click', this.onShareButtonClick, this);
        this.shareBoard.getChildByName('ExitButton').on('click',
            () => {
                this.clientAdapter.leaveRoom(this.myPlayerID);
                cc.director.loadScene('Splash');
            }, this);
        this.exitBoard.getChildByName('IKnowButton').on('click',
            () => {
                this.clientAdapter.leaveRoom(this.myPlayerID);
                cc.director.loadScene('Splash');
            }, this);
        this.exitBoard.getChildByName('ExitButton').on('click',
            () => {
                this.clientAdapter.leaveRoom(this.myPlayerID);
                cc.director.loadScene('Splash');
            }, this);
    }

    /**
     * change all players' position based on the time.
     * if the map needs to be updated, update it.
     */
    update(_dt: number): void {
        let dt: number = _dt;
        if (dt > this.timeLeft) {
            dt = this.timeLeft;
        }
        if (dt > 0) {
            this.timeLeft -= dt;
            for (let i: number = 0; i < this.players.length; i++) {
                const info: IPlayerInfoProto = this.players[i];
                if (info.state === 0) {// only state 0 is moving
                    const playerNode: cc.Node = this.headRoot.children[i];
                    playerNode.setPositionX(playerNode.x + GameRoom.directions[info.headDirection].y * this.headSpeedX * dt);
                    playerNode.setPositionY(playerNode.y - GameRoom.directions[info.headDirection].x * this.headSpeedY * dt);
                }
            }
        }
    }

    onDestroy(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}
