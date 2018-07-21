import GameView from './GameView';
import { RemoteClient } from './RemoteClient';

const { ccclass, property } = cc._decorator;

@ccclass
export default class NewClass extends cc.Component {
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
            console.log('close');// todo
        });
    }
}
