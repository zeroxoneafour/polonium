// threecolumn.ts - Three columns idk bro

import { translateDirection } from "../../util/geometry";
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

class ThreeColumnEngineSettings extends BaseEngineSettings {
    side1Size: number = 0.25;
    side2Size: number = 0.25;
    swapInsertSide: boolean = false;
    rotateLayout: boolean = false;
}

export class ThreeColumnEngine implements TilingEngineInterface {
    tileMap: Map<Tile, WindowBox> = new Map();
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
                this.tileMap.set(rootTile, this.center);
            }
            return rootTile;
        }

        if (this.side1.length > 0) {
            const side1Tile = rootTile.addChild();
            side1Tile.size = this.settings.side1Size * 3;
            if (this.side1.length == 1) {
                side1Tile.windows.push(this.side1[0].window);
                this.tileMap.set(side1Tile, this.side1[0]);
            } else {
                for (const box of this.side1) {
                    const tile = side1Tile.addChild();
                    tile.windows.push(box.window);
                    tile.size = box.size;
                    this.tileMap.set(tile, box);
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
            this.tileMap.set(centerTile, this.center);
        }

        if (this.side2.length > 0) {
            const side2Tile = rootTile.addChild();
            side2Tile.size = this.settings.side2Size * 3;
            if (this.side2.length == 1) {
                side2Tile.windows.push(this.side2[0].window);
                this.tileMap.set(side2Tile, this.side2[0]);
            } else {
                for (const box of this.side2) {
                    const tile = side2Tile.addChild();
                    tile.windows.push(box.window);
                    tile.size = box.size;
                    this.tileMap.set(tile, box);
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
            lengthDiff < 0
        ) {
            this.side1.push(box);
        } else {
            this.side2.push(box);
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
            direction = translateDirection(direction);
        }
        if (this.tileMap.get(tile)?.window === window) {
            return;
        }
        if (
            this.side1.some((x) => x.window === window) ||
            this.side2.some((x) => x.window === window) ||
            this.center?.window === window
        ) {
            this.removeWindow(window);
        }
        const targetBox = this.tileMap.get(tile);
        if (targetBox == undefined) {
            this.addWindow(window);
            return;
        }
        const newBox = new WindowBox(window);
        if (targetBox === this.center) {
            // if there are no windows in the chosen side, then add it to that side
            if (!(direction & Direction.Right) && this.side1.length == 0) {
                this.side1.push(newBox);
            } else if (direction & Direction.Right && this.side2.length == 0) {
                this.side2.push(newBox);
                // if inserted into right side of center and there are windows in right, push center to the left stack
            } else if (direction & Direction.Right) {
                this.side1.push(this.center);
                this.center = newBox;
                // if inserted into left side and there are windows in left, push center into right stack
            } else {
                this.side2.push(this.center);
                this.center = newBox;
            }
        } else {
            // normal half style insertion (but even less complex!) if just putting in on side
            const side = this.side1.includes(targetBox)
                ? this.side1
                : this.side2;
            const idx = side.indexOf(targetBox);
            if (direction & Direction.Down) {
                side.splice(idx + 1, 0, newBox);
            } else {
                side.splice(idx, 0, newBox);
            }
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
        for (const [tile, box] of this.tileMap) {
            if (
                (this.side1.includes(box) && this.side1.length > 1) ||
                (this.side2.includes(box) && this.side2.length > 1)
            ) {
                box.size = tile.size;
            }
        }
    }
}
