import { GetTileSize } from './Config';
const { ccclass, property } = cc._decorator;

@ccclass
export default class PlayerController extends cc.Component {
    @property
    public MoveSpeed: number = 0;

    // possible value is 'w', 'a', 's' or 'd'
    private _nextMovingDirection = 'w';

    public onLoad(): void {
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, event => this.OnKeyDown(event));
        this.UpdatePosition();
    }

    public UpdatePosition(): void {
        this.node.runAction(cc.sequence(
            this.GetNextMoveAction(),
            cc.callFunc(() => this.UpdatePosition(), this)
        ));
    }

    private OnKeyDown(event: cc.Event.EventCustom): void {
        switch (event.keyCode) {
            case cc.KEY.w: this._nextMovingDirection = 'w'; break;
            case cc.KEY.a: this._nextMovingDirection = 'a'; break;
            case cc.KEY.s: this._nextMovingDirection = 's'; break;
            case cc.KEY.d: this._nextMovingDirection = 'd'; break;
        }
    }

    private GetNextMoveAction(): cc.ActionInterval {
        switch (this._nextMovingDirection) {
            case 'w': return cc.moveBy(this.MoveSpeed, 0, +GetTileSize());
            case 'a': return cc.moveBy(this.MoveSpeed, -GetTileSize(), 0);
            case 's': return cc.moveBy(this.MoveSpeed, 0, -GetTileSize());
            case 'd': return cc.moveBy(this.MoveSpeed, +GetTileSize(), 0);
        }
    }
}
