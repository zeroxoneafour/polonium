// threecolumn.ts - Three columns idk bro

import { rotateDirection } from "../../util";
import {
    Tile,
    Window,
    TilingEngineInterface,
    Direction,
    BaseEngineSettings,
    LayoutDirection,
} from "../engine";
import { WindowBox } from "./stackingcommon";

class ThreeColumnEngineSettings extends BaseEngineSettings {
    side1Size: number = 0.25;
    side2Size: number = 0.25;
    swapInsertSide: boolean = false;
    rotateLayout: boolean = false;
}

export class ThreeColumnEngine implements TilingEngineInterface {
    // this is what I came up with
    // [WindowBox[], number] - Side and index of tile
    // boolean - true if center, false if invalid
    tileMap: Map<Tile, [WindowBox[], number] | boolean> = new Map();
    side1: WindowBox[] = [];
    center: WindowBox | null = null;
    side2: WindowBox[] = [];

    settings = new ThreeColumnEngineSettings();

    getEngineSettings(): object {
        return this.settings.getProps();
    }
    setEngineSettings(settings: object): void {
        this.settings.setProps(settings);
        if (this.settings.side1Size < 0.15) {
            this.settings.side1Size = 0.15;
        }
        if (this.settings.side2Size < 0.15) {
            this.settings.side2Size = 0.15;
        }
        if (this.settings.side1Size + this.settings.side2Size > 0.85) {
            const side1Ratio =
                this.settings.side1Size /
                (this.settings.side1Size + this.settings.side2Size);
            this.settings.side1Size = 0.85 * side1Ratio;
            this.settings.side2Size = 0.85 * (1 - side1Ratio);
        }
    }

    buildLayout(): Tile {
        const rootTile = new Tile();
        rootTile.layoutDirection = this.settings.rotateLayout
            ? LayoutDirection.Vertical
            : LayoutDirection.Horizontal;
        this.tileMap.clear();

        if (this.side1.length == 0 && this.side2.length == 0) {
            if (this.center !== null) {
                rootTile.windows.push(this.center.window);
                this.tileMap.set(rootTile, true);
            }
            return rootTile;
        }

        if (this.side1.length > 0) {
            const side1Tile = rootTile.addChild();
            side1Tile.size = this.settings.side1Size * 3;
            if (this.side1.length == 1) {
                side1Tile.windows.push(this.side1[0].window);
                this.tileMap.set(side1Tile, [this.side1, 0]);
            } else {
                for (let i = 0; i < this.side1.length; i += 1) {
                    const box = this.side1[i];
                    const tile = side1Tile.addChild();
                    tile.windows.push(box.window);
                    tile.size = box.size;
                    this.tileMap.set(tile, [this.side1, i]);
                }
            }
        }

        const centerTile = rootTile.addChild();
        centerTile.size = 3;
        centerTile.size -=
            this.side1.length > 0 ? this.settings.side1Size * 3 : 0;
        centerTile.size -=
            this.side2.length > 0 ? this.settings.side2Size * 3 : 0;
        if (this.center !== null) {
            centerTile.windows.push(this.center.window);
            this.tileMap.set(centerTile, true);
        }

        if (this.side2.length > 0) {
            const side2Tile = rootTile.addChild();
            side2Tile.size = this.settings.side2Size * 3;
            if (this.side2.length == 1) {
                side2Tile.windows.push(this.side2[0].window);
                this.tileMap.set(side2Tile, [this.side2, 0]);
            } else {
                for (let i = 0; i < this.side2.length; i += 1) {
                    const box = this.side2[i];
                    const tile = side2Tile.addChild();
                    tile.windows.push(box.window);
                    tile.size = box.size;
                    this.tileMap.set(tile, [this.side2, i]);
                }
            }
        }

        return rootTile;
    }

    addWindow(window: Window) {
        const box = new WindowBox(window);
        if (this.center === null) {
            this.center = box;
            return;
        }
        const lengthDiff = this.side1.length - this.side2.length;
        if (
            (lengthDiff == 0 && this.settings.swapInsertSide) ||
            lengthDiff > 0
        ) {
            this.side2.push(box);
        } else {
            this.side1.push(box);
        }
    }

    removeWindow(window: Window) {
        if (this.center?.window == window) {
            this.center = null;
            if (this.side1.length == 0 && this.side2.length == 0) return;
            const lengthDiff = this.side1.length - this.side2.length;
            if (
                (lengthDiff == 0 && this.settings.swapInsertSide) ||
                lengthDiff < 0
            ) {
                this.center = this.side2.splice(0, 1)[0];
            } else {
                this.center = this.side1.splice(0, 1)[0];
            }
            return;
        }
        let idx = this.side1.findIndex((x) => x.window == window);
        if (idx != -1) {
            this.side1.splice(idx, 1);
            if (this.side1.length == 0 && this.side2.length > 1) {
                this.side1.push(this.side2.splice(0, 1)[0]);
            }
            return;
        }
        idx = this.side2.findIndex((x) => x.window == window);
        if (idx == -1) return;
        this.side2.splice(idx, 1);
        if (this.side2.length == 0 && this.side1.length > 1) {
            this.side2.push(this.side1.splice(0, 1)[0]);
        }
    }

    // default to inserting below
    placeWindow(window: Window, tile: Tile, direction?: Direction) {
        // center must always be occupied
        if (this.center === null) {
            this.addWindow(window);
            return;
        }
        if (direction === undefined) {
            direction = Direction.Vertical;
        }
        if (this.settings.rotateLayout) {
            direction = rotateDirection(direction);
        }
        const target = this.tileMap.get(tile);
        if (target === undefined || target === false) {
            this.addWindow(window);
            return;
        }
        if (
            (target === true && this.center.window === window) ||
            (target !== true && target[0][target[1]]?.window === window)
        ) {
            return;
        }
        if (
            this.side1.some((x) => x.window === window) ||
            this.side2.some((x) => x.window === window) ||
            this.center?.window === window
        ) {
            this.removeWindow(window);
        }
        const newBox = new WindowBox(window);
        if (target === true) {
            // if there are no windows in the chosen side, then add it to that side
            if (!(direction & Direction.Right) && this.side1.length == 0) {
                this.side1.push(newBox);
            } else if (direction & Direction.Right && this.side2.length == 0) {
                this.side2.push(newBox);
            } else {
                // otherwise simply readd center as a new window
                const oldCenter = this.center;
                this.center = newBox;
                this.addWindow(oldCenter.window);
            }
        } else {
            let idx = target[1];
            if (idx >= target[0].length) {
                idx = target[0].length - 1;
            }
            if (direction & Direction.Down) {
                idx += 1;
            }
            target[0].splice(idx, 0, newBox);
        }
    }

    windowActivated(window: Window): boolean {
        return false;
    }

    updateTiles(rootTile: Tile): void {
        if (this.side1.length > 0) {
            this.settings.side1Size =
                rootTile.children[0].size / rootTile.totalChildrenSize();
            if (this.side2.length > 0) {
                this.settings.side2Size =
                    rootTile.children[2].size / rootTile.totalChildrenSize();
            }
        } else if (this.side2.length > 0) {
            this.settings.side2Size =
                rootTile.children[1].size / rootTile.totalChildrenSize();
        }
        for (const [tile, boxPointer] of this.tileMap) {
            if (boxPointer === true || boxPointer === false) {
                continue;
            }
            const box = boxPointer[0][boxPointer[1]];
            if (box === undefined) {
                continue;
            }
            if (boxPointer[0].length > 1) {
                box.size = tile.size;
            }
        }
    }
}
