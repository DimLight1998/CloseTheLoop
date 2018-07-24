const { ccclass } = cc._decorator;

@ccclass
export default class CameraController extends cc.Component {
    private follower: cc.Node = null;
    private static updateFreqInit = 1;
    private updateCount = 0;

    public setFollower(follower: cc.Node): void {
        this.follower = follower;
    }

    update(): void {
        if (this.updateCount !== 0) {
            this.updateCount--;
            return;
        } else if (this.follower !== null) {
            this.node.position = this.follower.position;
            this.updateCount = CameraController.updateFreqInit;
        }
    }
}
