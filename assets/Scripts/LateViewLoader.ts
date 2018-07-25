import { ColorUtil } from './Config';

const { ccclass, property } = cc._decorator;

@ccclass
export default class LateViewLoader extends cc.Component {
    @property(cc.Node)
    viewNode: cc.Node = null;

    @property(cc.Node)
    foregroundNode: cc.Node = null;

    @property(cc.Node)
    haloNode: cc.Node = null;

    tickCount: number;

    onLoad(): void {
        this.tickCount = 0;
        [this.foregroundNode.getChildByName('LoadLabel').color, this.haloNode.color]
            = ColorUtil.getInstance().getRandomColor().slice(0, 2);
    }

    update(dt: number): void {
        this.tickCount++;
        if (this.tickCount >= 2) {
            this.viewNode.active = true;
            this.enabled = false;
        }
    }
}
