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

// actually this works out to where you can do bit flags
// style & Snake works for both Snake and SnakeUp,
// style & RowsUp works for both RowsUp and SnakeUp
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
        if (this.pillars.length == 0) return;
        // removes old pillars past the count and adds their windows back into the system
        while (this.pillars.length > this.settings.pillarCount) {
            const pillar = this.pillars.pop();
            if (pillar !== undefined) {
                for (const box of pillar.boxes) {
                    this.addWindow(box.window);
                }
            }
        }
        // tries to find pillars with too many boxes and cycles those redundant boxes back into the system
        // to try and get the pillar count up to what it should be
        while (this.pillars.length < this.settings.pillarCount) {
            const pillar = this.getPillarWithMost(this.pillars.length - 1);
            if (pillar.boxes.length <= 1) break;
            const window = pillar.boxes[pillar.boxes.length - 1].window;
            this.removeWindow(window);
            this.addWindow(window);
        }
    }

    buildLayout(): Tile {
        const rootTile = new Tile();
        rootTile.layoutDirection = this.settings.rotateLayout
            ? LayoutDirection.Vertical
            : LayoutDirection.Horizontal;
        this.tileMap.clear();

        for (const pillar of this.pillars) {
            let pillarTile = rootTile;
            if (this.pillars.length > 1) {
                pillarTile = rootTile.addChild();
                pillarTile.size = pillar.size;
            }
            if (pillar.boxes.length == 1) {
                pillarTile.windows.push(pillar.boxes[0].window);
                this.tileMap.set(pillarTile, pillar.boxes[0]);
            } else {
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
        const style = this.settings.insertionStyle;
        while (true) {
            // swapInsertSide does pillars in reverse order
            const pillar = this.settings.swapInsertSide
                ? this.pillars[this.pillars.length - pillarIdx - 1]
                : this.pillars[pillarIdx];
            if (pillar.boxes.length <= rowIdx) {
                // insert at top for rowsup/snakeup
                if (style & InsertionStyle.RowsUp) {
                    pillar.boxes.splice(0, 0, windowBox);
                } else {
                    pillar.boxes.push(windowBox);
                }
                return;
            }
            // go backwards every other row for snake/snakeup
            if (style & InsertionStyle.Snake && rowIdx % 2 != 0) {
                pillarIdx -= 1;
            } else {
                pillarIdx += 1;
            }
            if (pillarIdx >= this.pillars.length || pillarIdx < 0) {
                rowIdx += 1;
                if (style & InsertionStyle.Snake && rowIdx % 2 != 0) {
                    pillarIdx = this.pillars.length - 1;
                } else {
                    pillarIdx = 0;
                }
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
            const pillarWithMost = this.getPillarWithMost(boxIdx);
            if (pillarWithMost.boxes.length > 1) {
                pillar.boxes.push(pillarWithMost.boxes.pop()!);
            } else {
                this.pillars.splice(pillarIdx, 1);
            }
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
        if (this.pillars.length < this.settings.pillarCount) {
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

    // get pillar with most children
    // use refIdx as a reference, tries to return the pillar closest to the index with the most
    private getPillarWithMost(refIdx?: number): Pillar {
        return this.pillars.reduce<[Pillar, number]>(
            ([r, ri], p, i) => {
                if (p.boxes.length > r.boxes.length) {
                    return [p, i];
                    // prioritize pillars closer to the center
                    // and slightly prioritize those that come later
                } else if (
                    p.boxes.length == r.boxes.length &&
                    refIdx !== undefined &&
                    Math.abs(i - refIdx) >= ri - refIdx
                ) {
                    return [p, i];
                }
                return [r, ri];
            },
            [this.pillars[0], 0],
        )[0];
    }
}
