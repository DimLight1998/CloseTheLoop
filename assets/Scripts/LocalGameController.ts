import GameView from './GameView';
import { LocalClient } from './LocalClient';
import { LocalRoomManger } from './LocalRoomManger';

const { ccclass, property } = cc._decorator;

@ccclass
export default class LocalGameController extends cc.Component {
    @property
    totalNRows: number = 80;

    @property
    totalNCols: number = 80;

    @property
    totalNPlayers: number = 13;

    @property(GameView)
    view: GameView = null;

    client: LocalClient = null;
    roomManger: LocalRoomManger = null;

    onEnable(): void { // 就是你，负责开始整个单人游戏！
        this.client = new LocalClient(this, this.view);
        this.roomManger = new LocalRoomManger(this);
        this.view.startGame();// view start listening
    }

    onDestroy(): void {
        if (this.roomManger !== null
            && this.roomManger.onlyServer !== null
            && this.roomManger.onlyServer.room !== null) {
            let timer: number = this.roomManger.onlyServer.room.timer;
            if (timer !== null) {
                clearTimeout(timer);
                this.roomManger.onlyServer.room.timer = null;
            }
        }
    }
}
