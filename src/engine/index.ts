// engines/index.ts - Common classes and structures used by the engines

import { Config } from "../util/config";
import { Direction } from "../util/geometry";
import { LayoutDirection, Window } from "kwin-api";
import { QSize } from "kwin-api/qt";
import {
    EngineCapability,
    EngineSettings,
    EngineConfig as InternalEngineConfig,
    Client as IClient,
} from "./engine";
import BTreeEngine from "./layouts/btree";
import HalfEngine from "./layouts/half";
import ThreeColumnEngine from "./layouts/threecolumn";
import MonocleEngine from "./layouts/monocle";
import KwinEngine from "./layouts/kwin";

export interface EngineConfig extends InternalEngineConfig {
    engineType: EngineType;
    // intentionally undefined when coming from settings dialog
    engineSettings: EngineSettings | undefined;
}

export { EngineCapability, EngineSettings };

export const enum EngineType {
    BTree = 0,
    Half,
    ThreeColumn,
    Monocle,
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
    requestedSize: QSize;
    relativeSize: number;
    clients: Client[];

    get client(): Client | null;
    set client(value: Client | null);

    addChild(alterSiblingRatios?: boolean): Tile;

    addChildParallel(alterSiblingRatios?: boolean): Tile;

    split(): void;

    secede(): void;

    // removes a tile and all its children
    remove(batchRemove?: boolean): void;

    removeChildren(): void;

    // fix possible relative size conflicts
    fixRelativeSizing(): void;
}

export interface TilingEngine {
    rootTile: Tile;
    config: InternalEngineConfig;
    readonly engineCapability: EngineCapability;

    get engineSettings(): EngineSettings;
    set engineSettings(settings: EngineSettings | null);

    // initializes optional stuff in the engine if necessary
    initEngine(): void;
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
                engineSettings: {},
            };
        }
        const t = config.engineType % EngineType._loop;
        let engine: TilingEngine;
        switch (t) {
            case EngineType.BTree:
                engine = new BTreeEngine(config);
                break;
            case EngineType.Half:
                engine = new HalfEngine(config);
                break;
            case EngineType.ThreeColumn:
                engine = new ThreeColumnEngine(config);
                break;
            case EngineType.Monocle:
                engine = new MonocleEngine(config);
                break;
            case EngineType.Kwin:
                engine = new KwinEngine(config);
                break;
            default:
                throw new Error("Engine not found for engine type " + t);
        }
        engine.initEngine();
        engine.engineSettings = config.engineSettings ?? {};
        return engine;
    }
}
