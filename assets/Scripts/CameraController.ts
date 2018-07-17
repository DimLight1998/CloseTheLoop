const { ccclass } = cc._decorator;

@ccclass
export default class CameraController extends cc.Component {
    follower: cc.Node = null;
    public update(): void {
        if (this.follower !== null) {
            this.node.position = this.follower.position;
        }
    }
}
