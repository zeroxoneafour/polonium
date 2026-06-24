import { Window } from "../engine";

export class WindowBox {
    window: Window;
    size: number = 1;

    constructor(window: Window) {
        this.window = window;
    }
}

export class BoxIndex {
    readonly boxes: WindowBox[];
    // take snapshot of length at time of creation to know if boxes has changed in size
    readonly boxesLength: number;
    private rawIndex: number;
    constructor(boxes: WindowBox[], index: number) {
        this.boxes = boxes;
        this.boxesLength = boxes.length;
        this.rawIndex = index;
    }
    get index(): number {
        let ret = this.rawIndex;
        if (ret < 0) {
            ret = 0;
        }
        if (ret >= this.boxes.length) {
            ret = this.boxes.length - 1;
        }
        return ret;
    }
    set index(idx: number) {
        this.rawIndex = idx;
    }
    get box(): WindowBox | undefined {
        return this.boxes[this.index];
    }
    set box(box: WindowBox) {
        this.boxes[this.index] = box;
    }
}
