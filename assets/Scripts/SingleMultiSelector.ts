import { SingleMultipleSelector } from './Config';
const { ccclass, property } = cc._decorator;

@ccclass
export default class SingleMultiSelector extends cc.Component {
    @property(cc.Node)
    localGameNode: cc.Node = null;

    @property(cc.Node)
    remoteGameNode: cc.Node = null;

    onEnable(): void {
        if (SingleMultipleSelector.isSingle()) {
            this.localGameNode.active = true;
            this.remoteGameNode.active = false;
        } else {
            this.localGameNode.active = false;
            this.remoteGameNode.active = true;
        }
    }
}
