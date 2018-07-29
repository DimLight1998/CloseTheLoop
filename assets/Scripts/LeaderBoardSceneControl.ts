import { ColorUtil } from './Config';
const { ccclass, property } = cc._decorator;

@ccclass
export default class LeaderBoardSceneControl extends cc.Component {
    @property(cc.Sprite)
    display: cc.Sprite = null;

    @property(cc.Button)
    exitButton: cc.Button = null;

    @property(cc.Button)
    nextPageButton: cc.Button = null;

    @property(cc.Button)
    prevPageButton: cc.Button = null;

    @property(cc.Sprite)
    haloSprite: cc.Sprite = null;

    texture2D: cc.Texture2D = null;

    start(): void {
        [this.haloSprite.node.color, this.exitButton.node.color] =
            ColorUtil.getInstance().getRandomColor().slice(0, 2);

        this.nextPageButton.node.color = this.exitButton.node.color;
        this.prevPageButton.node.color = this.exitButton.node.color;

        this.texture2D = new cc.Texture2D();
        this.exitButton.node.on('click', () => {
            wx.postMessage({
                command: 'HideFriendsScore'
            });
            cc.director.loadScene('Splash');
        }, this);
        this.nextPageButton.node.on('click', () => {
            wx.postMessage({
                command: 'NextPage'
            });
        }, this);
        this.prevPageButton.node.on('click', () => {
            wx.postMessage({
                command: 'PrevPage'
            });
        }, this);
    }

    updateSubDomainInCanvas(): void {
        if (!this.texture2D) {
            return;
        }

        let context: any = wx.getOpenDataContext();
        let sharedCanvas: any = context.canvas;
        this.texture2D.initWithElement(sharedCanvas);
        this.texture2D.handleLoadedTexture();
        this.display.spriteFrame = new cc.SpriteFrame(this.texture2D);
    }

    update(): void {
        this.updateSubDomainInCanvas();
    }
}
