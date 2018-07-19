import { GameRoom } from './GameRoom';

export class GameAI {
    // 供ai操作的游戏对象
    game: GameRoom;
    playerID: number;

    constructor(game: GameRoom, playerID: number) {
        this.game = game;
        this.playerID = playerID;
    }

    updateAI(): void {
        // todo
    }
}