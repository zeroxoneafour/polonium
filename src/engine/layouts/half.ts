// half.ts - Tiling engine for the half/split layout

import { rotateDirection } from "../../util/geometry";
import {
    Tile,
    Window,
    TilingEngineInterface,
    Direction,
    BaseEngineSettings,
    LayoutDirection,
} from "../engine";
import { BoxIndex, WindowBox } from "./stackingcommon";
import { console } from "../../controller";

class HalfEngineSettings extends BaseEngineSettings {
    middleSplit: number = 0.5;
    swapInsertSide: boolean = false;
    rotateLayout: boolean = false;
    insertInActive: boolean = false;
    keepMaster: boolean = false;
}

export class HalfEngine implements TilingEngineInterface {
    tileMap: Map<Tile, BoxIndex> = new Map();
    side1: WindowBox[] = [];
    side2: WindowBox[] = [];

    settings = new HalfEngineSettings();

    getEngineSettings(): object {
        return this.settings.getProps();
    }
    setEngineSettings(settings: object): void {
        const prevSwapSide = this.settings.swapInsertSide;
        this.settings.setProps(settings);
        // if keepMaster changed but not swapInsertSide then move windows out of dominant tile
        if (
            this.settings.keepMaster &&
            prevSwapSide === this.settings.swapInsertSide
        ) {
            // remove windows from old master side
            const [masterSide, otherSide] = this.settings.swapInsertSide
                ? [this.side2, this.side1]
                : [this.side1, this.side2];
            while (masterSide.length > 1) {
                const box = masterSide.splice(1, 1);
                otherSide.push(...box);
            }
        } else if (prevSwapSide !== this.settings.swapInsertSide) {
            // just switch sides if keepmaster and the sides switched
            const tmp = this.side1;
            this.side1 = this.side2;
            this.side2 = tmp;
        }
    }

    buildLayout(): Tile {
        const rootTile = new Tile();
        rootTile.layoutDirection = this.settings.rotateLayout
            ? LayoutDirection.Vertical
            : LayoutDirection.Horizontal;
        this.tileMap.clear();

        if (this.side1.length == 0 && this.side2.length == 0) return rootTile;

        // case where only one side has anything
        if (this.side1.length == 0 || this.side2.length == 0) {
            const dominantSide =
                this.side1.length == 0 ? this.side2 : this.side1;
            if (rootTile.layoutDirection == LayoutDirection.Horizontal) {
                rootTile.layoutDirection = LayoutDirection.Vertical;
            } else {
                rootTile.layoutDirection = LayoutDirection.Horizontal;
            }
            for (let i = 0; i < dominantSide.length; i += 1) {
                const box = dominantSide[i];
                const tile = rootTile.addChild();
                tile.windows.push(box.window);
                tile.size = box.size;
                this.tileMap.set(tile, new BoxIndex(dominantSide, i));
            }
            return rootTile;
        }

        // case where both sides have tiles
        for (const side of [this.side1, this.side2]) {
            const sideTile = rootTile.addChild();
            if (side === this.side1) {
                sideTile.size = this.settings.middleSplit * 2;
            } else {
                sideTile.size = (1 - this.settings.middleSplit) * 2;
            }
            if (side.length == 1) {
                sideTile.windows.push(side[0].window);
                this.tileMap.set(sideTile, new BoxIndex(side, 0));
            } else {
                for (let i = 0; i < side.length; i += 1) {
                    const box = side[i];
                    const tile = sideTile.addChild();
                    tile.windows.push(box.window);
                    tile.size = box.size;
                    this.tileMap.set(tile, new BoxIndex(side, i));
                }
            }
        }

        return rootTile;
    }

    addWindow(window: Window, tile?: Tile, direction?: Direction): void {
        if (this.settings.insertInActive && tile !== undefined) {
            this.placeWindow(window, tile, direction);
            return;
        }
        // no need to update indicies
        if (!this.settings.swapInsertSide) {
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
        let [side, otherSide] = this.side1.some((x) => x.window == window) ?
            [this.side1, this.side2] :
            [this.side2, this.side1];
        let idx = side.findIndex((x) => x.window == window);
        if (idx == -1) {
            return;
        }
        side.splice(idx, 1);
        if (side.length == 0 && otherSide.length > 1) {
            side.push(otherSide.splice(0, 1)[0]);
        }
    }

    // default to inserting below
    placeWindow(window: Window, tile: Tile, direction?: Direction) {
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
        // if the window exists in a current tile then just swap them
        for (const [_tile, idx] of this.tileMap) {
            const box = idx.box;
            if (box?.window !== window) {
                continue;
            }
            // just remove the window if the arrays are different
            // this is because if the boxes arrays are different,
            // removing the window will not shift the indexes and cause strange insertion behavior
            if (idx.boxes !== target.boxes) {
                this.removeWindow(box.window);
            } else {
                console().debug("swapping window in half");
                idx.box = target.box;
                target.box = box;
                return;
            }
            break;
        }
        const newBox = new WindowBox(window);
        const [side, otherSide] =
            this.side1 === target.boxes
                ? [this.side1, this.side2]
                : [this.side2, this.side1];
        let idx = target.index;
        if (idx >= side.length) {
            idx = side.length - 1;
        }
        if (otherSide.length == 0) {
            // if side == side 2 and inserting in right or vice versa then push box to other side, else push to same side
            // complex xor but it makes sense in practice trust me
            if ((side == this.side2) != ((direction & Direction.Right) != 0)) {
                otherSide.push(newBox);
            } else {
                otherSide.push(side.splice(0, 1)[0]);
                side.push(newBox);
            }
        } else {
            // if keepmaster and inserting into master tile, then swap the master tile for the new one
            // and move master into the other side
            if (
                this.settings.keepMaster &&
                ((side == this.side1 && !this.settings.swapInsertSide) ||
                    (side == this.side2 && this.settings.swapInsertSide))
            ) {
                const oldBox = side.pop();
                side.push(newBox);
                if (oldBox !== undefined) {
                    otherSide.push(oldBox);
                }
            } else {
                if (direction & Direction.Down) {
                    side.splice(idx + 1, 0, newBox);
                } else {
                    side.splice(idx, 0, newBox);
                }
            }
        }
    }

    windowActivated(window: Window): boolean {
        return false;
    }

    updateTiles(rootTile: Tile): void {
        if (rootTile.children.length == 2) {
            this.settings.middleSplit =
                rootTile.children[0].size / rootTile.totalChildrenSize();
        }
        for (const [tile, boxPointer] of this.tileMap) {
            const box = boxPointer.box;
            if (box === undefined) {
                continue;
            }
            if (boxPointer.boxes.length > 1) {
                box.size = tile.size;
            }
        }
    }
}
