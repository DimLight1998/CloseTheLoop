import { GameRoom } from './GameRoom';

export class GameAI {
    // 供ai操作的游戏对象
    game: GameRoom;
    constructor(game: GameRoom) {
        this.game = game;
    }
    registerEvent(eventEmitter: any): void {
        // todo
    }
    unregisterEvent(eventEmitter: any): void {
        // todo
    }
}