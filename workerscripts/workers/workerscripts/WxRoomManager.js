"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WxServer_1 = require("./WxServer");
class WxRoomManager {
    constructor() {
        this.server = null;
        console.log('worker start');
        this.server = new WxServer_1.WxServer();
        worker.onMessage(this.handleIncomingMessage.bind(this));
    }
    handleRegisterPlayer() {
        while (true) {
            if (this.server === null) {
                this.server = new WxServer_1.WxServer();
            }
            const playerID = this.server.handleRegisterToThisRoom();
            if (playerID === null) {
                console.log('Wechat room is full! Restart a new room.');
                this.server = null; // delete this room
            }
            else {
                return [playerID, 0];
            }
        }
    }
    handlePlayerDisconnect(playerID, roomID) {
        this.server.room.replacePlayerWithAI(playerID);
    }
    handleIncomingMessage(message) {
        const command = message.command;
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
                let playerId = message.playerId;
                this.handlePlayerDisconnect(playerId, 0);
                break;
            }
            case 'CHDIR': {
                let playerId = message.playerId;
                let direction = message.direction;
                this.server.handleChangeDirection(playerId, direction);
                break;
            }
            case 'REG_VP': {
                let playerID2Track = message.playerId;
                let roomId = message.roomId;
                let nRows = message.nRows;
                let nCols = message.nCols;
                if (roomId !== 0) {
                    console.log('impossible!');
                }
                this.server.addNewWorldListener(playerID2Track, nRows, nCols);
                break;
            }
            case 'REBORN': {
                let playerId = message.playerId;
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
exports.WxRoomManager = WxRoomManager;
// worker entrance
let manager = new WxRoomManager();
