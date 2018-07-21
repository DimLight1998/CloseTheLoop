const { ccclass, property } = cc._decorator;

@ccclass
export default class NewClass extends cc.Component {
    @property(cc.Sprite)
    haloSprite: cc.Sprite = null;

    @property(cc.Button)
    button1: cc.Button = null;

    @property(cc.Button)
    button2: cc.Button = null;

    @property(cc.Button)
    button3: cc.Button = null;

    @property(cc.Button)
    button4: cc.Button = null;

    @property(cc.Sprite)
    bottom: cc.Sprite = null;

    onLoad(): void {
        this.haloSprite.node.height = this.node.height;
        this.haloSprite.node.width = this.node.width;

        this.button1.node.on(
            'click',
            () => { this.bottom.node.runAction(cc.moveBy(0.5, cc.v2(-2000, 0)).easing(cc.easeOut(2.0))); },
            this
        );

        this.button2.node.on(
            'click',
            () => { this.bottom.node.runAction(cc.moveBy(0.5, cc.v2(-2000, 0)).easing(cc.easeOut(2.0))); },
            this
        );

        this.button3.node.on(
            'click',
            () => { this.bottom.node.runAction(cc.moveBy(0.5, cc.v2(-2000, 0)).easing(cc.easeOut(2.0))); },
            this
        );

        this.button4.node.on(
            'click',
            () => { cc.director.loadScene('Splash'); },
            this
        );
    }
}
