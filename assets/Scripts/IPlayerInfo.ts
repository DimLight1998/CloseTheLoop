export interface IPoint {
    x: number;
    y: number;
}

export interface IColor {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface IPlayerInfo {
    playerColor: IColor;
    headPos: IPoint;
    headDirection: number;
    nBlocks: number;
    state: number;// 0 活着，1正在爆炸，2死了
}