// engine/index.ts - Wrapper around the engines to interact with the driver
import { console } from "../controller";
import { TilingEngineInterface, Window, Tile, Direction } from "./engine";
import BTreeEngine from "./layouts/btree";
import HalfEngine from "./layouts/half";

export { Window, Tile, Direction };

export enum TilingEngineType {
    BTree = 0,
    Half = 1,
    _Loop = 2,
}

export class TilingEngine {
    private engine: TilingEngineInterface;
    private engineRootTile: Tile;

    readonly engineType: TilingEngineType;

    constructor(type: TilingEngineType, settings: object) {
        this.engineType = type;
        switch (type) {
            case TilingEngineType.BTree:
                this.engine = new BTreeEngine();
                break;
            case TilingEngineType.Half:
                this.engine = new HalfEngine();
                break;
            default:
                console().warn("Invalid tiling engine type", type);
                this.engineType = TilingEngineType.BTree;
                this.engine = new BTreeEngine();
                break;
        }
        this.engine.setEngineSettings(settings);
        this.engineRootTile = this.engine.buildLayout();
    }

    getEngineSettings(): object {
        return this.engine.getEngineSettings();
    }
    setEngineSettings(settings: object): void {
        this.engine.setEngineSettings(settings);
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
