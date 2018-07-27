"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Uint16PairQueue {
    constructor(size) {
        this.queueA = new Uint16Array(new ArrayBuffer(size * 2));
        this.queueB = new Uint16Array(new ArrayBuffer(size * 2));
        this.clear();
    }
    clear() {
        this.head = this.tail = 0;
    }
    push(a, b) {
        this.queueA[this.tail] = a;
        this.queueB[this.tail] = b;
        this.tail++;
    }
    shift() {
        const res = [this.queueA[this.head], this.queueB[this.head]];
        this.head++;
        return res;
    }
    empty() {
        return this.head === this.tail;
    }
}
exports.Uint16PairQueue = Uint16PairQueue;
