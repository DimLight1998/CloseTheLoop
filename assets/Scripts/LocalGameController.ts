import { IClientAdapter, IServerAdapter, IRoomMangerAdapter } from './IAdapter';
import GameView from './GameView';
import { GameRoom } from './GameRoom';
import { IPayLoadJson } from './IPlayerInfo';

const { ccclass, property } = cc._decorator;

@ccclass
export default class LocalGameController extends cc.Component implements IClientAdapter, IServerAdapter, IRoomMangerAdapter {
    @property
    totalNRows: number = 80;

    @property
    totalNCols: number = 80;

    @property
    totalNPlayers: number = 13;

    @property(GameView)
    view: GameView = null;

    room: GameRoom = null;
    infoQueue: string[] = [];
    waitingQueue: number[] = [];
    arriveQueue: number[] = [];

    retrieveNewWorld(currentTime: number): void {
        if (this.infoQueue.length === 0) {
            this.waitingQueue.push(currentTime);
        } else {
            this.view.refreshData(JSON.parse(this.infoQueue.shift()), this.arriveQueue.shift() - currentTime);
        }
    }

    incomingNewWorld(infoString: string): void {
        if (this.waitingQueue.length === 0) {
            this.infoQueue.push(infoString);
            this.arriveQueue.push(Date.now());
        } else {
            this.view.refreshData(JSON.parse(infoString), Date.now() - this.waitingQueue.shift());
        }
    }

    changeDirection(playerID: number, direction: number): void {
        throw new Error('Method not implemented.');
    }

    registerPlayer(view: GameView): number {
        this.view = view;
        this.room.eventEmitter.on('worldchanged', this.incomingNewWorld.bind(this));
        const res: number = this.room.registerPlayer();
        if (res === null) {
            // todo handle this
        } else {
            return res;
        }
    }

    onLoad(): void {
        this.room = new GameRoom(this.node, this.totalNRows, this.totalNCols, this.totalNPlayers);
        this.view.myPlayerID = this.registerPlayer(this.view);
        this.view.serverAdapter = this;
        this.view.fetchNewWorld();
    }
}
