import { IClientAdapter } from './IAdapter';
import { PayLoadJson } from './PlayerInfo';
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
    onWorldRequestSuccess: (info: PayLoadJson, deltaTime: number) => void;

    onRegisterSuccess: (playerId: number, roomId: number) => void;

    constructor(view: GameView, hostname: string, port: number, openCallback: () => void, closeCallback: () => void) {
        this.webSocket = new WebSocket(`wss://${hostname}:${port}`);
        this.webSocket.onopen = openCallback;
        this.webSocket.onerror = (event: Event) => {
            console.log('error occured: ' + event);
            this.webSocket.close();
        };
        this.webSocket.onclose = closeCallback;

        this.view = view;
        this.view.setClientAdapter(this);

        this.webSocket.onmessage = this.handleIncomingMessage.bind(this);
    }

    changeDirection(playerID: number, direction: number): void {// @bug
        this.webSocket.send(`CHDIR@${playerID}@${this.myRoomId}@${this.myClientSocketId}@${direction}`);
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
        callback: (info: PayLoadJson, deltaTime: number) => void): void {
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
                    if (this.waitingQueue.length === 0) {
                        if (this.infoQueue.length > 0) {
                            console.log('Warning! Still have ' + this.infoQueue.length + ' round to consume!');
                            this.infoQueue = [];
                            this.arriveQueue = [];
                        }
                        this.infoQueue.push(content);
                        this.arriveQueue.push(Date.now());
                    } else {
                        this.onWorldRequestSuccess(JSON.parse(content), Date.now() - this.waitingQueue.shift());
                    }
                    break;
            }
        } else {
            let sections: string[] = message.split('@');
            switch (sections[0]) {
                case 'REG_OK':
                    [this.myPlayerId, this.myRoomId, this.myClientSocketId] =
                        [sections[1], sections[2], sections[3]].map((x) => parseInt(x, 10));
                    this.onRegisterSuccess(this.myPlayerId, this.myRoomId);
                    break;
            }
        }
    }

    rebornPlayer(playerId: number): void {
        this.webSocket.send(`REBORN@${playerId}@${this.myRoomId}`);
    }
}