import { IServerAdapter } from './IAdapter';
import LocalGameController from './LocalGameController';
import { GameRoom } from './GameRoom';
import { LocalClient } from './LocalClient';
import { IPayLoadJson } from './IPlayerInfo';

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
        return this.room.registerPlayer();
    }
    dispatchNewWorld(): void {
        for (let listener of this.listeners) {
            const obj: IPayLoadJson = this.room.getListenerView(listener.playerID2Track, listener.viewNRows, listener.viewNCols);
            listener.client.pushNewWorldResponse(JSON.stringify(obj));
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
}