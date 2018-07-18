import { IClientAdapter } from './IAdapter';
import LocalGameController from './LocalGameController';
import GameView from './GameView';
import { IPayLoadJson } from './IPlayerInfo';

/**
 * This class is an implementation of the ClientAdapter for local game.
 */
export class LocalClient implements IClientAdapter {

    /**
     * Save incoming information about the world.
     */
    infoQueue: string[] = [];
    waitingQueue: number[] = [];
    arriveQueue: number[] = [];
    ctrl: LocalGameController = null;
    view: GameView = null;
    newWorldCallBack: (info: IPayLoadJson, deltaTime: number) => void;

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
            this.newWorldCallBack(JSON.parse(this.infoQueue.shift()),
                this.arriveQueue.shift() - currentTime);
        }
    }

    pushNewWorldResponse(infoString: string): void {
        if (this.waitingQueue.length === 0) {
            this.infoQueue.push(infoString);
            this.arriveQueue.push(Date.now());
        } else {
            this.newWorldCallBack(JSON.parse(infoString),
                Date.now() - this.waitingQueue.shift());
        }
    }

    registerPlayer(): [number, number] {
        return this.ctrl.roomManger.handleRegisterPlayer();
    }

    registerViewPort(playerID2Track: number, roomID: number, nRows: number, nCols: number,
        callback: (info: IPayLoadJson, deltaTime: number) => void): void {
        this.newWorldCallBack = callback;
        this.ctrl.roomManger.onlyServer.addNewWorldListener(this, playerID2Track, nRows, nCols);
    }
}