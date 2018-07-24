import { IClientAdapter } from './IAdapter';
import { PayLoad } from './PayLoadProtobuf';
import GameView from './GameView';
import WxGameController from './WxGameController';

export class WxClient implements IClientAdapter {

    infoQueue: Uint8Array[] = [];
    waitingQueue: number[] = [];
    arriveQueue: number[] = [];

    view: GameView = null;
    ctrl: WxGameController = null;
    newWorldCallBack: (info: PayLoad, deltaTime: number) => void;

    onRegisterSuccess: (playerId: number, roomId: number) => void;

    firstRequestFlag: boolean;

    constructor(ctrl: WxGameController, view: GameView) {
        this.ctrl = ctrl;

        this.view = view;
        this.view.setClientAdapter(this);

        this.firstRequestFlag = true;
    }

    changeDirection(playerId: number, direction: number): void {
        this.ctrl.worker.postMessage({
            command: 'CHDIR',
            playerId,
            direction
        });
    }

    requestNewWorld(currentTime: number): void {
        if (this.firstRequestFlag) {
            this.firstRequestFlag = false;
            this.wxFireRoundStartEvent();
        }
        if (this.infoQueue.length === 0) {
            this.waitingQueue.push(currentTime);
        } else {
            this.arriveQueue.shift();
            this.newWorldCallBack(PayLoad.decode(this.infoQueue.shift()), 0);
        }
    }

    registerPlayer(onSuccess: (playerId: number, roomId: number) => void): void {
        this.onRegisterSuccess = onSuccess;
        this.ctrl.worker.postMessage({
            command: 'REG'
        });
    }

    rebornPlayer(playerId: number): void {
        this.ctrl.worker.postMessage({
            command: 'REBORN',
            playerId
        });
    }

    leaveRoom(playerId: number): void {
        this.ctrl.worker.postMessage({
            command: 'EXIT',
            playerId
        });
    }

    wxFireRoundStartEvent(): void {
        this.ctrl.worker.postMessage({
            command: 'START'
        });
    }

    registerViewPort(playerID2Track: number, roomId: number,
        nRows: number, nCols: number,
        callback: (info: PayLoad, deltaTime: number) => void): void {
        this.newWorldCallBack = callback;
        this.ctrl.worker.postMessage({
            command: 'REG_VP',
            playerId: playerID2Track,
            roomId,
            nRows,
            nCols
        });
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
            this.waitingQueue.shift();
            this.newWorldCallBack(PayLoad.decode(infoArray), 0);
        }
    }
}