import { GameAI } from './GameAI';
import { PlayerInfo } from './PlayerInfo';

export class ServerPlayerInfo extends PlayerInfo {
    isAI: boolean;
    aiInstance: GameAI;
    nextDirection: number;
}