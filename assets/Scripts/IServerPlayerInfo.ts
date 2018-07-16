import { GameAI } from "./GameAI";
import { IPlayerInfo } from "./IPlayerInfo";

export interface IServerPlayerInfo extends IPlayerInfo {
    playerID: number;
    isAI: boolean;
    aiInstance: GameAI;
    nextDirection: number;
}