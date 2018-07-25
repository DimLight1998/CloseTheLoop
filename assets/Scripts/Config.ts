import tinycolor = require('../Lib/tinycolor.js');
const { ccclass, property } = cc._decorator;

const TileSize: number = 40;

export class SingleMultipleSelector {
    private static isSingleMode: boolean = true;
    public static setSingle(): void {
        SingleMultipleSelector.isSingleMode = true;
    }

    public static setMultiple(): void {
        SingleMultipleSelector.isSingleMode = false;
    }

    public static isSingle(): boolean {
        return SingleMultipleSelector.isSingleMode;
    }
}

export function GetTileSize(): number { return TileSize; }

export class ColorUtil {
    private static instance: ColorUtil = null;

    public static getInstance(): ColorUtil {
        if (ColorUtil.instance === null) {
            ColorUtil.instance = new ColorUtil();
        }

        return ColorUtil.instance;
    }

    private static colorList: tinycolorInstance[] = [
        tinycolor('#ba68c8'),
        tinycolor('#7986cb'),
        tinycolor('#64b5f6'),
        tinycolor('#e57373'),
        tinycolor('#4dd0e1'),
        tinycolor('#4db6ac'),
        tinycolor('#81c784'),
        tinycolor('#aed581'),
        tinycolor('#dce775'),
        tinycolor('#90a4ae'),
        tinycolor('#ffd54f'),
        tinycolor('#ffb74d'),
        tinycolor('#ff8a65'),
        tinycolor('#a1887f'),
    ];

    private static brightColors: cc.Color[] = [];
    private static darkColors: cc.Color[] = [];
    private static darkerColors: cc.Color[] = [];

    private static toRGBTuple(color: tinycolorInstance): [number, number, number] {
        const tmp: ColorFormats.RGBA = color.toRgb();
        return [tmp.r, tmp.g, tmp.b];
    }

    private constructor() {
        for (let i: number = 0; i < ColorUtil.colorList.length; i++) {
            ColorUtil.brightColors.push(cc.color(...ColorUtil.toRGBTuple(ColorUtil.colorList[i])));
            ColorUtil.darkColors.push(cc.color(...ColorUtil.toRGBTuple(ColorUtil.colorList[i].clone().darken(20))));
            ColorUtil.darkerColors.push(cc.color(...ColorUtil.toRGBTuple(ColorUtil.colorList[i].clone().darken(50))));
        }
    }

    public getRandomColor(): [cc.Color, cc.Color, cc.Color] {
        let i: number = Math.floor(Math.random() * ColorUtil.colorList.length);
        return [ColorUtil.brightColors[i], ColorUtil.darkColors[i], ColorUtil.darkerColors[i]];
    }
}

export class ExitStatus {
    private static isNormalExit: boolean = false;

    static setToNormal(): void {
        ExitStatus.isNormalExit = true;
    }

    static setToExceptional(): void {
        ExitStatus.isNormalExit = false;
    }

    static isNormal(): boolean {
        return ExitStatus.isNormalExit;
    }
}

export class WorkerStatus {
    static workerTerminated: boolean = true;
}