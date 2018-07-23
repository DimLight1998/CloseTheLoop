"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GameRoom_1 = require("../assets/Scripts/GameRoom");
const PayLoadProtobuf_1 = require("../assets/Scripts/PayLoadProtobuf");
class WechatListener {
}
exports.WechatListener = WechatListener;
class WxServer {
    constructor() {
        this.listeners = [];
        this.room = new GameRoom_1.GameRoom(WxServer.NRows, WxServer.NCols, WxServer.NPlayers);
        this.room.inWx = true;
        this.room.setServerAdapter(this);
        this.room.startNewGame();
    }
    handleChangeDirection(playerID, direction) {
        this.room.changeDirection(playerID, direction);
    }
    handleRegisterToThisRoom() {
        return this.room.replaceAIWithPlayer();
    }
    handleRebornPlayer(playerId) {
        this.room.rebornHumanPlayer(playerId);
    }
    dispatchNewWorld() {
        this.room.initPlayerInfoProto();
        for (let listener of this.listeners) {
            const payload = this.room.getListenerViewProtobuf(listener.playerID2Track, listener.viewNRows, listener.viewNCols);
            worker.postMessage({
                command: 'WORLD',
                payload: PayLoadProtobuf_1.PayLoad.encode(payload).finish().buffer
            });
        }
    }
    addNewWorldListener(playerID2Track, viewNRows, viewNCols) {
        this.listeners.push({
            playerID2Track,
            viewNRows,
            viewNCols
        });
    }
    startCompute() {
        this.room.updateRound();
    }
}
WxServer.NRows = 80;
WxServer.NCols = 80;
WxServer.NPlayers = 13;
exports.WxServer = WxServer;
