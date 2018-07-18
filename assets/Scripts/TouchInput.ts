import GameView from './GameView';

const { ccclass, property } = cc._decorator;

@ccclass
export default class TouchInput extends cc.Component {

    @property
    judgeDistance: number = 100;

    @property(GameView)
    view: GameView = null;

    prevPos: cc.Vec2;

    touchID: number;

    handleTouchStart(event: cc.Event.EventTouch): void {
        this.prevPos = this.node.convertTouchToNodeSpace(event.touch);
        this.touchID = event.getID();
    }

    handleTouchMove(event: cc.Event.EventTouch): void {
        if (event.getID() === this.touchID) {
            const curPos: cc.Vec2 = this.node.convertTouchToNodeSpace(event.touch);
            const vector: cc.Vec2 = curPos.sub(this.prevPos);
            if (vector.mag() >= this.judgeDistance) {
                const rad: number = Math.atan2(vector.y, vector.x);
                let dir: number;
                if (-Math.PI / 4 <= rad && rad < Math.PI / 4) {
                    dir = 1; // right
                } else if (Math.PI / 4 <= rad && rad < Math.PI * 3 / 4) {
                    dir = 0; // up
                } else if (-Math.PI * 3 / 4 <= rad && rad < -Math.PI / 4) {
                    dir = 2; // down
                } else {
                    dir = 3; // left
                }
                if (this.view !== null) {
                    this.view.changeDirection(dir);
                }
                this.prevPos = curPos;
            }
        }
    }

    onEnable(): void {
        this.node.on(cc.Node.EventType.TOUCH_START, this.handleTouchStart.bind(this));
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.handleTouchMove.bind(this));

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, event => {
            if (this.view !== null) {
                switch (event.keyCode) {
                    case cc.KEY.w: this.view.changeDirection(0); break;
                    case cc.KEY.a: this.view.changeDirection(3); break;
                    case cc.KEY.s: this.view.changeDirection(2); break;
                    case cc.KEY.d: this.view.changeDirection(1); break;
                }
            }
        });
    }
    onDisable(): void {
        this.node.off(cc.Node.EventType.TOUCH_START, this.handleTouchStart.bind(this));
        this.node.off(cc.Node.EventType.TOUCH_MOVE, this.handleTouchMove.bind(this));
    }
}
