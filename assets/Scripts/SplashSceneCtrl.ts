import { ColorUtil, SingleMultipleSelector, WorkerStatus } from './Config';
const { ccclass, property } = cc._decorator;

@ccclass
export default class SplashSceneCtrl extends cc.Component {
    @property(cc.Sprite)
    haloSprint: cc.Sprite = null;

    @property(cc.Button)
    singlePlayerButton: cc.Button = null;

    @property(cc.Button)
    multiPlayerButton: cc.Button = null;

    @property(cc.Button)
    helpButton: cc.Button = null;

    @property(cc.Button)
    leaderBoardButton: cc.Button = null;

    lightColor: cc.Color;
    darkColor: cc.Color;
    darkerColor: cc.Color;

    onLoad(): void {
        [this.lightColor, this.darkColor, this.darkerColor] = ColorUtil.getInstance().getRandomColor();

        // put halo to right place
        this.haloSprint.node.color = this.lightColor;

        this.singlePlayerButton.node.color = this.darkColor;
        this.multiPlayerButton.node.color = this.darkColor;
        this.helpButton.node.color = this.darkColor;
        this.leaderBoardButton.node.color = this.darkColor;

        this.singlePlayerButton.node.on('click', () => {
            if (WorkerStatus.workerTerminated) {// prevent entering single mode when worker is not terminated
                SingleMultipleSelector.setSingle();
                cc.director.loadScene('Gaming');
            }
        }, this);
        this.multiPlayerButton.node.on('click', () => {
            SingleMultipleSelector.setMultiple();
            cc.director.loadScene('Gaming');
        }, this);
        this.helpButton.node.on('click', () => cc.director.loadScene('Help'), this);
        this.leaderBoardButton.node.on('click', () => { this.enterLeaderBoard(); }, this);
    }

    enterLeaderBoard(): void {
        wx.postMessage({
            command: 'DisplayFriendsScore'
        });

        cc.director.loadScene('LeaderBoard');
    }
}
