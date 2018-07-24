const { ccclass } = cc._decorator;

@ccclass
export default class CameraController extends cc.Component {
    private follower: cc.Node = null;

    public setFollower(follower: cc.Node): void {
        this.follower = follower;
    }

    update(): void {
        this.node.position = this.follower.position;
    }
}
