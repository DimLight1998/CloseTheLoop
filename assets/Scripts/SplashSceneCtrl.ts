import tinycolor = require('../Lib/tinycolor.js');

const { ccclass, property } = cc._decorator;

@ccclass
export default class SplashSceneCtrl extends cc.Component {
    @property(cc.Sprite)
    haloSprint: cc.Sprite = null;

    @property(cc.Button)
    singlePlayerButton: cc.Button = null;

    @property(cc.Button)
    multiPlayerButton: cc.Button = null;

    @property(cc.Button)
    helpButton: cc.Button = null;

    @property(cc.Button)
    leaderBoardButton: cc.Button = null;

    static colorList: tinycolorInstance[] = [
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

    lightColor: cc.Color;
    darkColor: cc.Color;

    static toRGBTuple(color: tinycolorInstance): [number, number, number] {
        const tmp: ColorFormats.RGBA = color.toRgb();
        return [tmp.r, tmp.g, tmp.b];
    }

    onLoad(): void {
        let i: number = Math.floor(Math.random() * SplashSceneCtrl.colorList.length);
        this.lightColor = cc.color(...SplashSceneCtrl.toRGBTuple(SplashSceneCtrl.colorList[i]));
        this.darkColor = cc.color(...SplashSceneCtrl.toRGBTuple(SplashSceneCtrl.colorList[i].clone().darken(20)));

        // put halo to right place
        this.haloSprint.node.height = this.node.height;
        this.haloSprint.node.width = this.node.width;
        this.haloSprint.node.color = this.lightColor;

        this.singlePlayerButton.node.color = this.darkColor;
        this.multiPlayerButton.node.color = this.darkColor;
        this.helpButton.node.color = this.darkColor;
        this.leaderBoardButton.node.color = this.darkColor;

        // todo add triggers
        this.singlePlayerButton.node.on('click', () => cc.director.loadScene('Gaming'), this);
        this.helpButton.node.on('click', () => cc.director.loadScene('Help'), this);
    }
}
