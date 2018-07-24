import { IServerAdapter } from './IAdapter';
import LocalGameController from './LocalGameController';
import { GameRoom } from './GameRoom';
import { LocalClient } from './LocalClient';
import { PayLoadJson } from './PlayerInfo';
import { PayLoad } from './PayLoadProtobuf';

export class LocalListener {
    client: LocalClient;
    playerID2Track: number;
    viewNRows: number;
    viewNCols: number;
}

export class LocalServer implements IServerAdapter {
    room: GameRoom = null;

    ctrl: LocalGameController = null;

    listeners: LocalListener[] = [];

    constructor(ctrl: LocalGameController) {
        this.ctrl = ctrl;

        this.room = new GameRoom(this.ctrl.totalNRows, this.ctrl.totalNCols, this.ctrl.totalNPlayers);
        this.room.setServerAdapter(this);
        this.room.startNewGame();
    }
    // iServer
    handleChangeDirection(playerID: number, direction: number): void {
        this.room.changeDirection(playerID, direction);
    }
    handleRegisterToThisRoom(): number {
        return this.room.replaceAIWithPlayer();
    }
    dispatchNewWorld(): void {
        this.room.initPlayerInfoProto();
        for (let listener of this.listeners) {
            const payload: PayLoad = this.room.getListenerViewProtobuf(listener.playerID2Track, listener.viewNRows, listener.viewNCols);
            listener.client.pushNewWorldResponse(PayLoad.encode(payload).finish());
        }
    }

    addNewWorldListener(client: LocalClient, playerID2Track: number,
        viewNRows: number, viewNCols: number): void {
        this.listeners.push({
            client,
            playerID2Track,
            viewNRows,
            viewNCols
        });
    }

    handleRebornPlayer(playerId: number): void {
        this.room.rebornHumanPlayer(playerId);
    }
}