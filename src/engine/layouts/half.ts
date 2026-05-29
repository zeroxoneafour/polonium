// half.ts - Tiling engine for the half/split layout

import { LayoutDirection } from "kwin-api";
import { Tile, Window, TilingEngineInterface, Direction } from "../engine";

class WindowBox {
    window: Window;
    size: number = 1;

    constructor(window: Window) {
        this.window = window;
    }
}

class HalfEngineSettings {
    middleSplit: number = 0.5;
    side1Dominant: boolean = true;

    constructor(obj: any) {
        for (const key in this) {
            if (obj.hasOwnProperty(key)) this[key] = obj[key];
        }
    }
}

export default class HalfEngine implements TilingEngineInterface {
    tileMap: Map<Tile, WindowBox> = new Map();
    side1: WindowBox[] = [];
    side2: WindowBox[] = [];

    settings = new HalfEngineSettings({});

    get engineSettings(): object {
        return this.settings;
    }
    set engineSettings(settings: object) {
        this.settings = new HalfEngineSettings(settings);
    }

    buildLayout(): Tile {
        const rootTile = new Tile();
        rootTile.layoutDirection = LayoutDirection.Horizontal;
        this.tileMap.clear();
        if (this.side1.length == 0 && this.side2.length == 0) return rootTile;
        if (this.side1.length == 0 || this.side2.length == 0) {
            const dominantSide =
                this.side1.length == 0 ? this.side2 : this.side1;
            if (rootTile.layoutDirection == LayoutDirection.Horizontal) {
                rootTile.layoutDirection = LayoutDirection.Vertical;
            } else {
                rootTile.layoutDirection = LayoutDirection.Horizontal;
            }
            for (const box of dominantSide) {
                const tile = rootTile.addChild();
                tile.windows.push(box.window);
                tile.size = box.size;
                this.tileMap.set(tile, box);
            }
            return rootTile;
        }
        const side1Tile = rootTile.addChild();
        const side2Tile = rootTile.addChild();
        side1Tile.size = this.settings.middleSplit * 2;
        side2Tile.size = (1 - this.settings.middleSplit) * 2;
        for (const box of this.side1) {
            const tile = side1Tile.addChild();
            tile.windows.push(box.window);
            tile.size = box.size;
            this.tileMap.set(tile, box);
        }
        for (const box of this.side2) {
            const tile = side2Tile.addChild();
            tile.windows.push(box.window);
            tile.size = box.size;
            this.tileMap.set(tile, box);
        }
        return rootTile;
    }

    addWindow(window: Window) {
        if (this.settings.side1Dominant) {
            if (this.side1.length == 0) {
                this.side1.push(new WindowBox(window));
            } else {
                this.side2.push(new WindowBox(window));
            }
        } else {
            if (this.side2.length == 0) {
                this.side2.push(new WindowBox(window));
            } else {
                this.side1.push(new WindowBox(window));
            }
        }
    }

    removeWindow(window: Window) {
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
    placeWindow(
        window: Window,
        tile: Tile,
        direction: Direction = Direction.Vertical,
    ) {
        const targetBox = this.tileMap.get(tile);
        if (targetBox == undefined) {
            this.addWindow(window);
            return;
        }
        const newBox = new WindowBox(window);
        const [side, otherSide] = this.side1.includes(targetBox)
            ? [this.side1, this.side2]
            : [this.side2, this.side1];
        const idx = side.indexOf(targetBox);
        // if other side has nothing in it and the window is being inserted on the other side, then add it to the other side
        if (
            otherSide.length == 0 &&
            ((side == this.side1 && direction & Direction.Right) ||
                (side == this.side2 && !(direction & Direction.Right)))
        ) {
            otherSide.push(newBox);
        } else {
            if (direction & Direction.Up) {
                side.splice(idx, 0, newBox);
            } else {
                side.splice(idx + 1, 0, newBox);
            }
        }
    }

    updateTiles(rootTile: Tile): void {
        if (rootTile.children.length == 2) {
            this.settings.middleSplit =
                rootTile.children[0].size / rootTile.totalChildrenSize();
        }
    }
}
