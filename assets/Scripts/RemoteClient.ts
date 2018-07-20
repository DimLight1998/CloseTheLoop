import { IClientAdapter } from './IAdapter';
import { IPayLoadJson } from './IPlayerInfo';
import GameView from './GameView';

export class RemoteClient implements IClientAdapter {
    webSocket: WebSocket = null;
    view: GameView = null;
    myPlayerId: number = -1;
    myRoomId: number = -1;
    myClientSocketId: number = -1;

    infoQueue: string[] = [];
    waitingQueue: number[] = [];
    arriveQueue: number[] = [];
    onWorldRequestSuccess: (info: IPayLoadJson, deltaTime: number) => void;

    onRegisterSuccess: (playerId: number, roomId: number) => void;

    constructor(view: GameView) {
        this.webSocket = new WebSocket('ws://192.144.178.46:12306');
        this.view = view;
        this.webSocket.onmessage = this.handleIncomingMessage;
    }

    changeDirection(playerID: number, direction: number): void {
        this.webSocket.send(`CHDIR@${this.myPlayerId}@${this.myRoomId}@${this.myClientSocketId}`);
    }

    requestNewWorld(currentTime: number): void {
        if (this.infoQueue.length === 0) {
            this.waitingQueue.push(currentTime);
        } else {
            this.onWorldRequestSuccess(JSON.parse(this.infoQueue.shift()), this.arriveQueue.shift() - currentTime);
        }
    }

    registerPlayer(onSuccess: (playerId: number, roomId: number) => void): void {
        this.onRegisterSuccess = onSuccess;
        this.webSocket.send('REG');
    }

    registerViewPort(playerID2Track: number, roomID: number,
        nRows: number, nCols: number,
        callback: (info: IPayLoadJson, deltaTime: number) => void): void {
        this.onWorldRequestSuccess = callback;
        this.webSocket.send(`REG_VP@${playerID2Track}@${roomID}@${nRows}@${nCols}@${this.myClientSocketId}`);
    }

    handleIncomingMessage(msgEvt: MessageEvent): void {
        let message: string = msgEvt.data.toString();
        if (message[0] === '{') {
            let messageObj: any = JSON.parse(message);
            let type: string = messageObj.type;
            let content: string = messageObj.content;
            switch (type) {
                case 'WORLD':
                    this.infoQueue.push(JSON.parse(content));
                    this.arriveQueue.push(Date.now());
                    break;
            }
        } else {
            let sections: string[] = message.split('@');
            switch (sections[0]) {
                case 'REG_OK':
                    [this.myPlayerId, this.myRoomId, this.myClientSocketId] =
                        [sections[1], sections[2], sections[3]].map(parseInt);
                    this.onRegisterSuccess(this.myPlayerId, this.myRoomId);
                    break;
            }
        }
    }
}