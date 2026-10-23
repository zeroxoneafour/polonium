// pager.ts - Tiling engine for pager (monocle-like) layout

import { rotateDirection } from "../../util";
import {
    BaseEngineSettings,
    Direction,
    LayoutDirection,
    Tile,
    TilingEngineInterface,
    Window,
} from "../engine";

class PagerSettings extends BaseEngineSettings {
    pageWidth: number = 0.15;
    swapInsertSide: boolean = false;
    rotateLayout: boolean = false;
}

// have to set a fixer to prevent pageWidth from going below the minimum tile size
// right now its 0.15 but hopefully someday it will be zero
const floatingPointFix = 0.00001;

export class PagerEngine implements TilingEngineInterface {
    private settings: PagerSettings = new PagerSettings();
    private pageWidth: number = this.settings.pageWidth + floatingPointFix;
    private windows: Window[] = [];
    // track the window itself as indices shift when windows are added/removed
    private activeWindow: Window | null = null;

    getEngineSettings(): object {
        return this.settings.getProps();
    }
    setEngineSettings(settings: object): void {
        this.settings.setProps(settings);
        this.settings.pageWidth = Math.min(
            Math.max(this.settings.pageWidth, 0.15),
            0.2,
        );
        this.pageWidth = this.settings.pageWidth + floatingPointFix;
    }

    buildLayout(): Tile {
        const rootTile = new Tile();
        if (this.settings.rotateLayout) {
            rootTile.layoutDirection = LayoutDirection.Vertical;
        } else {
            rootTile.layoutDirection = LayoutDirection.Horizontal;
        }
        const len = this.windows.length;
        if (len == 0) {
            return rootTile;
        }
        if (len == 1) {
            rootTile.windows.push(this.windows[0]);
            return rootTile;
        }
        // shrink pages when there are too many to fit so the active page never goes negative
        const pageWidth = Math.min(this.pageWidth, 1 / len);
        for (let i = 0; i < len; i += 1) {
            const tile = rootTile.addChild();
            tile.windows.push(this.windows[i]);
            if (this.windows[i] === this.activeWindow) {
                tile.size = (1 - pageWidth * (len - 1)) * len;
            } else {
                tile.size = pageWidth * len;
            }
        }
        return rootTile;
    }

    addWindow(window: Window) {
        if (!this.settings.swapInsertSide) {
            this.windows.push(window);
        } else {
            this.windows.splice(0, 0, window);
        }
    }

    placeWindow(window: Window, tile: Tile, direction?: Direction): void {
        if (direction === undefined) {
            direction = Direction.None;
        }
        if (this.settings.rotateLayout) {
            direction = rotateDirection(direction);
        }
        if (tile.windows.length == 0 || tile.windows.includes(window)) {
            return;
        }
        if (this.windows.includes(window)) {
            this.removeWindow(window);
        }
        let idx = this.windows.findIndex((w) => tile.windows.includes(w));
        if (direction & Direction.Right) {
            idx += 1;
        }
        this.windows.splice(idx, 0, window);
    }

    windowActivated(window: Window): boolean {
        if (window === this.activeWindow || !this.windows.includes(window)) {
            return false;
        }
        this.activeWindow = window;
        return true;
    }

    removeWindow(window: Window) {
        const idx = this.windows.indexOf(window);
        if (idx == -1) {
            return;
        }
        if (this.activeWindow === window) {
            this.activeWindow = null;
        }
        this.windows.splice(idx, 1);
    }

    updateTiles(rootTile: Tile): void {}
}
