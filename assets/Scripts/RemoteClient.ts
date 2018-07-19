import { IClientAdapter } from './IAdapter';
import { IPayLoadJson } from './IPlayerInfo';
import GameView from './GameView';

export class RemoteClient implements IClientAdapter {
    webSocket: WebSocket = null;
    view: GameView = null;

    constructor() {
        this.webSocket = new WebSocket('ws://');// todo 2018/07/20 星期五 02:14:23
    }

    changeDirection(playerID: number, direction: number): void {
        throw new Error('Method not implemented.');
    }

    requestNewWorld(currentTime: number): void {
        throw new Error('Method not implemented.');
    }

    registerPlayer(): [number, number] {
        throw new Error('Method not implemented.');
    }

    registerViewPort(playerID2Track: number, roomID: number,
        nRows: number, nCols: number,
        callback: (info: PayLoadJson, deltaTime: number) => void): void {
        throw new Error('Method not implemented.');
    }
}