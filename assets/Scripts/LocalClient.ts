import { IClientAdapter } from './IAdapter';
import LocalGameController from './LocalGameController';
import GameView from './GameView';
import { PayLoadJson } from './PlayerInfo';
import { PayLoad } from './PayLoadProtobuf';

/**
 * This class is an implementation of the ClientAdapter for local game.
 */
export class LocalClient implements IClientAdapter {

    /**
     * Save incoming information about the world.
     */
    infoQueue: Uint8Array[] = [];
    waitingQueue: number[] = [];
    arriveQueue: number[] = [];
    ctrl: LocalGameController = null;
    view: GameView = null;
    newWorldCallBack: (info: PayLoad, deltaTime: number) => void;

    constructor(ctrl: LocalGameController, view: GameView) {
        this.ctrl = ctrl;

        this.view = view;
        this.view.setClientAdapter(this);
    }

    // iClient
    changeDirection(playerID: number, direction: number): void {
        this.ctrl.roomManger.onlyServer.handleChangeDirection(playerID, direction);
    }

    requestNewWorld(currentTime: number): void {
        if (this.infoQueue.length === 0) {
            this.waitingQueue.push(currentTime);
        } else {
            this.newWorldCallBack(PayLoad.decode(this.infoQueue.shift()),
                this.arriveQueue.shift() - currentTime);
        }
    }

    pushNewWorldResponse(infoArray: Uint8Array): void {
        if (this.waitingQueue.length === 0) {
            if (this.infoQueue.length > 0) {
                console.log('Warning! Still have ' + this.infoQueue.length + ' round to consume!');
                // this.infoQueue = [];
                // this.arriveQueue = [];
            }
            this.infoQueue.push(infoArray);
            this.arriveQueue.push(Date.now());
        } else {
            this.newWorldCallBack(PayLoad.decode(infoArray),
                Date.now() - this.waitingQueue.shift());
        }
    }

    registerPlayer(onSuccess: (playerId: number, roomId: number) => void): void {
        let ret: [number, number] = this.ctrl.roomManger.handleRegisterPlayer();
        onSuccess(ret[0], ret[1]);
    }

    registerViewPort(playerID2Track: number, roomID: number, nRows: number, nCols: number,
        callback: (info: PayLoad, deltaTime: number) => void): void {
        this.newWorldCallBack = callback;
        this.ctrl.roomManger.onlyServer.addNewWorldListener(this, playerID2Track, nRows, nCols);
    }

    rebornPlayer(playerId: number): void {
        this.ctrl.roomManger.onlyServer.handleRebornPlayer(playerId);
    }

    leaveRoom(playerId: number): void {
        this.ctrl.roomManger.handlePlayerDisconnect(playerId, 0);
    }

    wxFireRoundStartEvent(): void {
        // do nothing
    }
}