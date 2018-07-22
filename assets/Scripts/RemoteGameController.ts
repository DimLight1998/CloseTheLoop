import GameView from './GameView';
import { RemoteClient } from './RemoteClient';
import { ExitStatus } from './Config';

const { ccclass, property } = cc._decorator;

@ccclass
export default class RemoteGameController extends cc.Component {
    @property(GameView)
    view: GameView = null;

    @property
    hostname: string = 'localhost';

    @property(cc.Integer)
    port: number = 12306;

    client: RemoteClient = null;

    onEnable(): void {
        this.client = new RemoteClient(this.view, this.hostname, this.port, () => {
            this.view.startGame();
        }, () => {
            if (ExitStatus.isNormal()) {
                cc.director.loadScene('Splash');
            } else {
                cc.director.loadScene('ConnLost');
            }
        });
    }
}
