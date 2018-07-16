const { ccclass, property } = cc._decorator;

@ccclass
export default class NewClass extends cc.Component {
    public update(): void {
        this.node.position = cc.find('Canvas/Player').position;
    }
}
