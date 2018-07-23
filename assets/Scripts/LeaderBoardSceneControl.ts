import { ColorUtil } from './Config';
const { ccclass, property } = cc._decorator;

@ccclass
export default class LeaderBoardSceneControl extends cc.Component {
    @property(cc.Sprite)
    display: cc.Sprite = null;

    @property(cc.Button)
    exitButton: cc.Button = null;

    @property(cc.Sprite)
    haloSprite: cc.Sprite = null;

    texture2D: cc.Texture2D = null;

    start(): void {
        this.haloSprite.node.height = this.node.height;
        this.haloSprite.node.width = this.node.width;
        [this.haloSprite.node.color, this.exitButton.node.color] =
            ColorUtil.getInstance().getRandomColor().slice(0, 2);

        this.texture2D = new cc.Texture2D();
        this.exitButton.node.on('click', () => {
            wx.postMessage({
                command: 'HideFriendsScore'
            });
            cc.director.loadScene('Splash');
        }, this);
    }

    updateSubDomainInCanvas(): void {
        if (this.texture2D === null) {
            return;
        }

        let context: any = wx.getOpenDataContext();
        let sharedCanvas: any = context.canvas;
        this.texture2D.initWithElement(sharedCanvas);
        this.texture2D.handleLoadedTexture();
        this.display.spriteFrame = new cc.SpriteFrame(this.texture2D);
        console.log([this.display.node.height, this.display.node.width]);
    }

    update(): void {
        this.updateSubDomainInCanvas();
    }
}
