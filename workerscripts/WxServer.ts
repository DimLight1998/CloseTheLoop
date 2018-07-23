import { IServerAdapter } from '../assets/Scripts/IAdapter';
import { GameRoom } from '../assets/Scripts/GameRoom';
import { PayLoad } from '../assets/Scripts/PayLoadProtobuf';

export class WechatListener {
    playerID2Track: number;
    viewNRows: number;
    viewNCols: number;
}

export class WxServer implements IServerAdapter {

    static NRows: number = 80;
    static NCols: number = 80;
    static NPlayers: number = 13;

    room: GameRoom;

    listeners: WechatListener[] = [];

    constructor() {
        this.room = new GameRoom(WxServer.NRows, WxServer.NCols, WxServer.NPlayers);
        this.room.inWx = true;
        this.room.setServerAdapter(this);
        this.room.startNewGame();
    }

    handleChangeDirection(playerID: number, direction: number): void {
        this.room.changeDirection(playerID, direction);
    }

    handleRegisterToThisRoom(): number {
        return this.room.replaceAIWithPlayer();
    }

    handleRebornPlayer(playerId: number): void {
        this.room.rebornHumanPlayer(playerId);
    }

    dispatchNewWorld(): void {
        this.room.initPlayerInfoProto();
        for (let listener of this.listeners) {
            const payload: PayLoad = this.room.getListenerViewProtobuf(listener.playerID2Track, listener.viewNRows, listener.viewNCols);
            worker.postMessage({
                command: 'WORLD',
                payload: PayLoad.encode(payload).finish().buffer
            });
        }
    }

    addNewWorldListener(playerID2Track: number,
        viewNRows: number, viewNCols: number): void {
        this.listeners.push({
            playerID2Track,
            viewNRows,
            viewNCols
        });
    }

    startCompute(): void {
        this.room.updateRound();
    }

}