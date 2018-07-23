import { IRoomMangerAdapter } from './IAdapter';
import LocalGameController from './LocalGameController';
import { LocalServer } from './LocalServer';

/**
 * This class is used for room management for a local game.
 */
export class LocalRoomManger implements IRoomMangerAdapter {

    ctrl: LocalGameController = null;
    onlyServer: LocalServer = null;

    constructor(ctrl: LocalGameController) {
        this.ctrl = ctrl;

        this.onlyServer = new LocalServer(this.ctrl);
    }

    /**
     * Try to allocate a room for the player and return the id of the player,
     * which will eventually success.
     */
    handleRegisterPlayer(): [number, number] {
        while (true) {
            if (this.onlyServer === null) {
                this.onlyServer = new LocalServer(this.ctrl);
            }
            const playerID: number = this.onlyServer.handleRegisterToThisRoom();
            if (playerID === null) {
                console.log('Local room is full! Restart a new room.');
                this.onlyServer = null;// delete this room
            } else {
                return [playerID, 0];
            }
        }
    }
    handlePlayerDisconnect(playerID: number, roomID: number): void {
        if (roomID !== 0) {
            console.log('impossible! disconnect room ID is ' + roomID);
        }
    }
}