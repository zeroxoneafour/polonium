// engines/index.ts - Common classes and structures used by the engines

import { Config } from "../util/config";
import { Direction } from "../util/geometry";
import { LayoutDirection, QSize, Window } from "kwin-api";
import {
    EngineCapability,
    EngineConfig as InternalEngineConfig,
    Client as IClient
} from "./engine";
import BTreeEngine from "./layouts/btree";
import HalfEngine from "./layouts/half";
import ThreeColumnEngine from "./layouts/threecolumn";
import KwinEngine from "./layouts/kwin";

export interface EngineConfig extends InternalEngineConfig {
    engineType: EngineType;
}

export { EngineCapability };

export const enum EngineType {
    BTree = 0,
    Half,
    ThreeColumn,
    Kwin,
    _loop,
}

export class Client implements IClient {
    name: string;
    minSize: QSize;

    constructor(window: Window) {
        this.name = window.resourceClass;
        this.minSize = window.minSize;
    }
}

export interface Tile {
    parent: Tile | null;
    tiles: Tile[];
    layoutDirection: LayoutDirection;
    requestedSize: QSize | null;
    clients: Client[];

    get client(): Client | null;
    set client(value: Client | null);

    addChild(): Tile;

    addChildParallel(): Tile;

    split(): void;

    secede(): void;

    // removes a tile and all its children
    remove(batchRemove?: boolean): void;

    removeChildren(): void;
}

export interface TilingEngine {
    rootTile: Tile;
    untiledClients: Client[];
    config: InternalEngineConfig;
    readonly engineCapability: EngineCapability;

    // creates the root tile layout
    buildLayout(): void;
    // adds a new client to the engine
    addClient(c: Client): void;
    // removes a client
    removeClient(c: Client): void;
    // places a client in a specific tile, in the direction d
    putClientInTile(c: Client, t: Tile, d?: Direction): void;
    // called after subtiles are edited (ex. sizes) so the engine can update them internally if needed
    regenerateLayout(): void;
}

export class TilingEngineFactory {
    config: Config;

    public constructor(config: Config) {
        this.config = config;
    }

    public newEngine(optConfig?: EngineConfig): TilingEngine {
        let config = optConfig;
        if (config == undefined) {
            config = {
                engineType: this.config.engineType,
                insertionPoint: this.config.insertionPoint,
                rotateLayout: this.config.rotateLayout,
            };
        }
        const t = config.engineType % EngineType._loop;
        switch (t) {
            case EngineType.BTree:
                return new BTreeEngine(config);
            case EngineType.Half:
                return new HalfEngine(config);
            case EngineType.ThreeColumn:
                return new ThreeColumnEngine(config);
            case EngineType.Kwin:
                return new KwinEngine(config);
            default:
                throw new Error("Engine not found for engine type " + t);
        }
    }
}
