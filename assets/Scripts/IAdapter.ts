import GameView from './GameView';
import { IPayLoadJson } from './IPlayerInfo';

// 一个视图需要一个adapter
export interface IClientAdapter {
    // 视图发玩家操作给逻辑
    changeDirection(playerID: number, direction: number): void;

    // 传入Date.now()，得到地图信息和 收到服务器消息时间-读取时间 ，方便调整下一回合的时间
    requestNewWorld(currentTime: number): void;

    registerPlayer(): [number, number];// 多人模式下，在这里也能建立websocket连接

    registerViewPort(playerID2Track: number, roomID: number,
        nRows: number, nCols: number, callback: (info: IPayLoadJson) => void): void;
}

// 一个房间需要一个server adapter
export interface IServerAdapter {
    handleChangeDirection(playerID: number, direction: number): void;

    handleRegisterToThisRoom(): number;

    dispatchNewWorld(): void;// 向所有注册的客户端发送各自的数据
}

export interface IRoomMangerAdapter {
    handleRegisterPlayer(): [number, number];// playerID, roomID

    handlePlayerDisconnect(playerID: number, roomID: number): void;
}