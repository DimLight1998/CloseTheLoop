import { IRoomMangerAdapter } from '../assets/Scripts/IAdapter';
import { WxServer } from './WxServer';

export class WxRoomManager implements IRoomMangerAdapter {

    server: WxServer = null;

    constructor() {
        console.log('worker start');

        this.server = new WxServer();

        worker.onMessage(this.handleIncomingMessage.bind(this));
    }

    handleRegisterPlayer(): [number, number] {
        while (true) {
            if (this.server === null) {
                this.server = new WxServer();
            }
            const playerID: number = this.server.handleRegisterToThisRoom();
            if (playerID === null) {
                console.log('Wechat room is full! Restart a new room.');
                this.server = null;// delete this room
            } else {
                return [playerID, 0];
            }
        }
    }

    handlePlayerDisconnect(playerID: number, roomID: number): void {
        this.server.room.replacePlayerWithAI(playerID);
    }

    handleIncomingMessage(message: any): void {
        const command: string = message.command;
        switch (command) {
            case 'REG': {
                let [playerId, roomId] = this.handleRegisterPlayer();
                worker.postMessage({
                    command: 'REG_OK',
                    playerId,
                    roomId
                });
                break;
            }
            case 'EXIT': {
                let playerId: number = message.playerId;
                this.handlePlayerDisconnect(playerId, 0);
                break;
            }
            case 'CHDIR': {
                let playerId: number = message.playerId;
                let direction: number = message.direction;
                this.server.handleChangeDirection(playerId, direction);
                break;
            }
            case 'REG_VP': {
                let playerID2Track: number = message.playerId;
                let roomId: number = message.roomId;
                let nRows: number = message.nRows;
                let nCols: number = message.nCols;
                if (roomId !== 0) {
                    console.log('impossible!');
                }
                this.server.addNewWorldListener(playerID2Track, nRows, nCols);
                break;
            }
            case 'REBORN': {
                let playerId: number = message.playerId;
                this.server.handleRebornPlayer(playerId);
                break;
            }
            case 'START': {
                this.server.startCompute();
                break;
            }
            default: {
                console.log('unknow command ' + command);
            }
        }
    }
}

// worker entrance

let manager: WxRoomManager = new WxRoomManager();