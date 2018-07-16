const { ccclass, property } = cc._decorator;

@ccclass
export default class GameView extends cc.Component {
    @property(cc.Node)
    cameraNode: cc.Node = undefined;

    
}
