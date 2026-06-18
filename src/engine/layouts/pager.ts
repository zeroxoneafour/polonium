// pager.ts - Tiling engine for pager (monocle-like) layout

import {
    BaseEngineSettings,
    Direction,
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
    private activeWindowIdx: number = 0;

    getEngineSettings(): object {
        return this.settings.getProps();
    }
    setEngineSettings(settings: object): void {
        this.settings.setProps(settings);
        this.pageWidth = this.settings.pageWidth + floatingPointFix;
    }

    buildLayout(): Tile {
        const rootTile = new Tile();
        const len = this.windows.length;
        if (len == 0) {
            return rootTile;
        }
        if (len == 1) {
            rootTile.windows.push(this.windows[0]);
            return rootTile;
        }
        for (let i = 0; i < len; i += 1) {
            const tile = rootTile.addChild();
            tile.windows.push(this.windows[i]);
            if (i == this.activeWindowIdx) {
                tile.size = (1 - this.pageWidth * (len - 1)) * len;
            } else {
                tile.size = this.pageWidth * len;
            }
        }
        return rootTile;
    }

    addWindow(window: Window) {
        this.windows.push(window);
    }

    placeWindow(window: Window, tile: Tile, direction?: Direction): void {
        this.addWindow(window);
    }

    windowActivated(window: Window): boolean {
        const idx = this.windows.indexOf(window);
        if (idx === this.activeWindowIdx || idx === -1) {
            return false;
        }
        this.activeWindowIdx = idx;
        return true;
    }

    removeWindow(window: Window) {
        this.windows.splice(this.windows.indexOf(window), 1);
    }

    updateTiles(rootTile: Tile): void {}
}
