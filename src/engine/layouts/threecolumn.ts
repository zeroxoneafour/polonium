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
import { BoxIndex, WindowBox } from "./stackingcommon";

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
    tileMap: Map<Tile, BoxIndex> = new Map();
    side1: WindowBox[] = [];
    center: WindowBox[] = [];
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
            if (this.center.length > 0) {
                rootTile.windows.push(this.center[0].window);
                this.tileMap.set(rootTile, new BoxIndex(this.center, 0));
            }
            return rootTile;
        }

        if (this.side1.length > 0) {
            const side1Tile = rootTile.addChild();
            side1Tile.size = this.settings.side1Size * 3;
            if (this.side1.length == 1) {
                side1Tile.windows.push(this.side1[0].window);
                this.tileMap.set(side1Tile, new BoxIndex(this.side1, 0));
            } else {
                for (let i = 0; i < this.side1.length; i += 1) {
                    const box = this.side1[i];
                    const tile = side1Tile.addChild();
                    tile.windows.push(box.window);
                    tile.size = box.size;
                    this.tileMap.set(tile, new BoxIndex(this.side1, i));
                }
            }
        }

        const centerTile = rootTile.addChild();
        centerTile.size = 3;
        centerTile.size -=
            this.side1.length > 0 ? this.settings.side1Size * 3 : 0;
        centerTile.size -=
            this.side2.length > 0 ? this.settings.side2Size * 3 : 0;
        if (this.center.length > 0) {
            centerTile.windows.push(this.center[0].window);
            this.tileMap.set(centerTile, new BoxIndex(this.center, 0));
        }

        if (this.side2.length > 0) {
            const side2Tile = rootTile.addChild();
            side2Tile.size = this.settings.side2Size * 3;
            if (this.side2.length == 1) {
                side2Tile.windows.push(this.side2[0].window);
                this.tileMap.set(side2Tile, new BoxIndex(this.side2, 0));
            } else {
                for (let i = 0; i < this.side2.length; i += 1) {
                    const box = this.side2[i];
                    const tile = side2Tile.addChild();
                    tile.windows.push(box.window);
                    tile.size = box.size;
                    this.tileMap.set(tile, new BoxIndex(this.side2, i));
                }
            }
        }

        return rootTile;
    }

    addWindow(window: Window) {
        const box = new WindowBox(window);
        if (this.center.length == 0) {
            this.center.push(box);
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
        if (this.center[0]?.window == window) {
            this.center.pop();
            if (this.side1.length == 0 && this.side2.length == 0) return;
            const lengthDiff = this.side1.length - this.side2.length;
            if (
                (lengthDiff == 0 && this.settings.swapInsertSide) ||
                lengthDiff < 0
            ) {
                this.center.push(this.side2.splice(0, 1)[0]);
            } else {
                this.center.push(this.side1.splice(0, 1)[0]);
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
        if (target?.box === undefined) {
            this.addWindow(window);
            return;
        }
        if (target.box?.window === window) {
            return;
        }
        for (const [_tile, idx] of this.tileMap) {
            const box = idx.box;
            if (box?.window !== window) {
                continue;
            }
            if (idx.boxes !== target.boxes) {
                this.removeWindow(box.window);
            } else {
                idx.box = target.box;
                target.box = box;
                return;
            }
            break;
        }
        const newBox = new WindowBox(window);
        if (target.boxes === this.center) {
            // if there are no windows in the chosen side, then add it to that side
            if (!(direction & Direction.Right) && this.side1.length == 0) {
                this.side1.push(newBox);
            } else if (direction & Direction.Right && this.side2.length == 0) {
                this.side2.push(newBox);
            } else {
                // otherwise simply readd center as a new window
                const oldCenter = this.center[0];
                this.center.splice(0, 1, newBox);
                this.addWindow(oldCenter.window);
            }
        } else {
            let idx = target.index;
            if (idx >= target.boxes.length) {
                idx = target.boxes.length - 1;
            }
            if (direction & Direction.Down) {
                idx += 1;
            }
            target.boxes.splice(idx, 0, newBox);
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
        for (const [tile, idx] of this.tileMap) {
            if (idx.boxes === this.center) {
                continue;
            }
            const box = idx.box;
            if (box === undefined) {
                continue;
            }
            if (idx.boxes.length > 1) {
                box.size = tile.size;
            }
        }
    }
}
