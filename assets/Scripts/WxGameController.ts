import GameView from './GameView';
import { WxClient } from './WxClient';

const { ccclass, property } = cc._decorator;

@ccclass
export default class WxGameController extends cc.Component {
    @property(GameView)
    view: GameView = null;

    client: WxClient = null;
    worker: WxWorker = null;

    handleIncomingMessage(message: any): void {
        const command: string = message.command;
        if (command === 'REG_OK') {
            let playerId: number = message.playerId;
            let roomId: number = message.roomId;
            this.client.onRegisterSuccess(playerId, roomId);
        } else if (command === 'WORLD') {
            let payload: Uint8Array = message.payload;
            this.client.pushNewWorldResponse(payload);
        }
    }

    onEnable(): void {
        console.log('creating worker');// fixme
        this.worker = wx.createWorker('workers/workerscripts/WxRoomManager.js');
        this.worker.onMessage(this.handleIncomingMessage.bind(this));
        this.client = new WxClient(this, this.view);
        this.view.startGame();
        // start the first tick in WxClient
    }

    onDestroy(): void {
        if (this.worker !== null) {
            this.worker.terminate();
        }
    }
}
