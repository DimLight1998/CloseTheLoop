const { ccclass, property } = cc._decorator;
import { ColorUtil } from './Config';

@ccclass
export default class ConnLostSceneCtrl extends cc.Component {
    @property(cc.Node)
    haloNode: cc.Node = null;

    @property(cc.Button)
    mainButton: cc.Button = null;

    onLoad(): void {
        let [light, dark, darker]: [cc.Color, cc.Color, cc.Color] = ColorUtil.getInstance().getRandomColor();

        this.haloNode.color = light;
        this.mainButton.node.color = dark;
        this.mainButton.node.on('click', () => { cc.director.loadScene('Splash'); }, this);
    }
}
