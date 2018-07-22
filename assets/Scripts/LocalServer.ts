import { IServerAdapter } from './IAdapter';
import LocalGameController from './LocalGameController';
import { GameRoom } from './GameRoom';
import { LocalClient } from './LocalClient';
import { PayLoadJson } from './PlayerInfo';

export interface ILocalListener {
    client: LocalClient;
    playerID2Track: number;
    viewNRows: number;
    viewNCols: number;
}

export class LocalServer implements IServerAdapter {
    room: GameRoom = null;

    ctrl: LocalGameController = null;

    listeners: ILocalListener[] = [];

    constructor(ctrl: LocalGameController) {
        this.ctrl = ctrl;

        this.room = new GameRoom(this.ctrl.totalNRows, this.ctrl.totalNCols, this.ctrl.totalNPlayers);
        this.room.setServerAdapter(this);
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
            const payload: Uint8Array = this.room.getListenerViewProtobuf(listener.playerID2Track, listener.viewNRows, listener.viewNCols);
            listener.client.pushNewWorldResponse(payload);
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