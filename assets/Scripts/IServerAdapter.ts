import { IPlayerInfo } from './IPlayerInfo';

export interface IServerAdapter {
    // 视图发玩家操作给逻辑
    changeDirection(playerID: number, direction: number): void;

    // 传入Date.now()，得到地图信息和 收到服务器消息时间-读取时间 ，方便调整下一回合的时间
    getMapInfo(currentTime: number, callback: (mapArray: Array<Array<number>>, players: IPlayerInfo[]) => void, deltaTime: number): void;
}