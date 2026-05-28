// engine/index.ts - Wrapper around the engines to interact with the driver
import { QPoint } from "kwin-api/qt";
import { TilingEngineInterface, Window, Tile, Direction } from "./engine";
import BTreeEngine from "./layouts/btree";

export { Window, Tile, Direction };

export enum TilingEngineType {
    BTree = 0,
}

export class TilingEngine {
    private engine: TilingEngineInterface;
    private engineRootTile: Tile;

    constructor(type: TilingEngineType) {
        switch (type) {
            case TilingEngineType.BTree:
                this.engine = new BTreeEngine();
                break;
        }
        this.engineRootTile = this.engine.buildLayout();
    }

    get engineSettings() {
        return this.engine.engineSettings;
    }
    set engineSettings(settings: object) {
        this.engine.engineSettings = settings;
    }

    buildLayout(): Tile {
        this.engineRootTile = this.engine.buildLayout();
        return this.engineRootTile;
    }
    addWindow(window: Window): void {
        return this.engine.addWindow(window);
    }
    placeWindow(window: Window, tile: Tile, direction?: Direction) {
        return this.engine.placeWindow(window, tile, direction);
    }
    removeWindow(window: Window): void {
        return this.engine.removeWindow(window);
    }
    updateTiles(rootTile: Tile): void {
        return this.engine.updateTiles(rootTile);
    }
}