// pillars.ts - Tiling engine for the pillars layout

import { rotateDirection } from "../../util";
import {
    Tile,
    Window,
    TilingEngineInterface,
    Direction,
    BaseEngineSettings,
    LayoutDirection,
} from "../engine";

class WindowBox {
    window: Window;
    size: number = 1;

    constructor(window: Window) {
        this.window = window;
    }
}

class Pillar {
    boxes: WindowBox[] = [];
    size: number = 1;
}

export enum InsertionStyle {
    Rows = 0,
    Snake,
    RowsUp,
    SnakeUp,
}

class PillarEngineSettings extends BaseEngineSettings {
    pillarCount: number = 3;
    swapInsertSide: boolean = false;
    rotateLayout: boolean = false;
    insertInActive: boolean = false;
    insertionStyle: InsertionStyle = InsertionStyle.Rows;
}

export class PillarEngine implements TilingEngineInterface {
    tileMap: Map<Tile, WindowBox> = new Map();
    pillars: Pillar[] = [];

    settings = new PillarEngineSettings();

    getEngineSettings(): object {
        return this.settings.getProps();
    }
    setEngineSettings(settings: object): void {
        this.settings.setProps(settings);
        if (this.settings.pillarCount < 1) {
            this.settings.pillarCount = 1;
        }
    }

    buildLayout(): Tile {
        const rootTile = new Tile();
        rootTile.layoutDirection = this.settings.rotateLayout
            ? LayoutDirection.Vertical
            : LayoutDirection.Horizontal;
        this.tileMap.clear();

        for (const pillar of this.pillars) {
            const pillarTile =
                this.pillars.length == 1 ? rootTile : rootTile.addChild();
            if (pillar.boxes.length == 1) {
                pillarTile.windows.push(pillar.boxes[0].window);
                this.tileMap.set(pillarTile, pillar.boxes[0]);
            } else {
                pillarTile.size = pillar.size;
                for (const box of pillar.boxes) {
                    const tile = pillarTile.addChild();
                    tile.windows.push(box.window);
                    tile.size = box.size;
                    this.tileMap.set(tile, box);
                }
            }
        }

        return rootTile;
    }

    addWindow(window: Window, tile?: Tile, direction?: Direction): void {
        if (tile !== undefined && this.settings.insertInActive) {
            this.placeWindow(window, tile, direction);
            return;
        }
        const windowBox = new WindowBox(window);
        if (this.pillars.length < this.settings.pillarCount) {
            const pillar = new Pillar();
            pillar.boxes.push(windowBox);
            if (this.settings.swapInsertSide) {
                this.pillars.splice(0, 0, pillar);
            } else {
                this.pillars.push(pillar);
            }
            return;
        }
        let pillarIdx: number = 0;
        let rowIdx: number = 0;
        while (true) {
            if (this.pillars[pillarIdx].boxes.length < rowIdx) {
                this.pillars[pillarIdx].boxes.push(windowBox);
                return;
            }
            pillarIdx += 1;
            if (pillarIdx >= this.pillars.length) {
                pillarIdx = 0;
                rowIdx += 1;
            }
        }
    }

    removeWindow(window: Window) {
        const pillarIdx = this.pillars.findIndex((p) =>
            p.boxes.some((b) => b.window == window),
        );
        if (pillarIdx === -1) return;
        const pillar = this.pillars[pillarIdx];
        const boxIdx = pillar.boxes.findIndex((b) => b.window == window);
        if (boxIdx === -1) return;
        pillar.boxes.splice(boxIdx, 1);
        if (pillar.boxes.length == 0) {
            this.pillars.splice(pillarIdx, 1);
        }
    }

    placeWindow(window: Window, tile: Tile, direction?: Direction) {
        if (direction === undefined) {
            direction = Direction.None;
        }
        if (this.settings.rotateLayout) {
            direction = rotateDirection(direction);
        }
        if (tile.windows.includes(window)) {
            return;
        }
        for (const pillar of this.pillars) {
            if (pillar.boxes.some((b) => b.window === window)) {
                this.removeWindow(window);
                break;
            }
        }
        const newBox = new WindowBox(window);
        const box = this.tileMap.get(tile);
        if (box === undefined) {
            return;
        }
        // this could def be more efficient but whatever
        const pillarIdx = this.pillars.findIndex((p) => p.boxes.includes(box));
        if (pillarIdx === -1) {
            return;
        }
        if (
            this.pillars.length < this.settings.pillarCount &&
            !(direction & Direction.Vertical)
        ) {
            let idx = pillarIdx;
            if (direction & Direction.Right) {
                idx += 1;
            }
            const pillar = new Pillar();
            pillar.boxes.push(newBox);
            this.pillars.splice(idx, 0, pillar);
            return;
        }
        const pillar = this.pillars[pillarIdx];
        const boxIdx = pillar.boxes.findIndex((b) => b === box);
        if (pillar === undefined || boxIdx === -1) {
            return;
        }
        let idx = boxIdx;
        if (direction & Direction.Down) {
            idx += 1;
        }
        pillar.boxes.splice(idx, 0, newBox);
    }

    windowActivated(window: Window): boolean {
        return false;
    }

    updateTiles(rootTile: Tile): void {
        if (
            rootTile.children.length == 0 ||
            rootTile.children.length == 1 ||
            this.pillars.length == 0
        ) {
            return;
        }
        for (let i = 0; i < rootTile.children.length; i += 1) {
            let subTile = rootTile;
            const pillar = this.pillars[i];
            if (this.pillars.length > 1) {
                subTile = rootTile.children[i];
                pillar.size = subTile.size;
            } else {
                // skip next iteration of loop if subTile is just rootTile
                // ie there is one column and we are handling it this loop
                i += rootTile.children.length;
            }
            for (let j = 0; j < subTile.children.length; j += 1) {
                pillar.boxes[j].size = subTile.children[j].size;
            }
        }
    }
}
