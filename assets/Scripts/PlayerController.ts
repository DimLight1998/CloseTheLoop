const { ccclass, property } = cc._decorator;

@ccclass
export default class PlayerController extends cc.Component {
    @property
    public MoveSpeed: number = 0;

    // possible value is 'w', 'a', 's' or 'd'
    private _movingDirection = 'w';

    public onLoad(): void {
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, event => this.OnKeyDown(event));
    }

    public update(dt: number): void {
        // move player
        let pos: cc.Vec2 = this.node.position;
        switch (this._movingDirection) {
            case 'w': this.node.setPositionY(pos.y + dt * this.MoveSpeed); break;
            case 'a': this.node.setPositionX(pos.x - dt * this.MoveSpeed); break;
            case 's': this.node.setPositionY(pos.y - dt * this.MoveSpeed); break;
            case 'd': this.node.setPositionX(pos.x + dt * this.MoveSpeed); break;
        }
    }

    private OnKeyDown(event: cc.Event.EventCustom): void {
        switch (event.keyCode) {
            case cc.KEY.w: this._movingDirection = 'w'; break;
            case cc.KEY.a: this._movingDirection = 'a'; break;
            case cc.KEY.s: this._movingDirection = 's'; break;
            case cc.KEY.d: this._movingDirection = 'd'; break;
        }
    }
}
