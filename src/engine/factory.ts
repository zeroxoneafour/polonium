// factory.ts - Tiling engine factory

import { TilingEngine, IEngineConfig } from "./";
import BTreeEngine from "./layouts/btree";
import HalfEngine from "./layouts/half";
import ThreeColumnEngine from "./layouts/threecolumn";
import KwinEngine from "./layouts/kwin";
import { Log } from "../util/log";

export const enum EngineType {
    BTree = 0,
    Half,
    ThreeColumn,
    Kwin,
    _loop,
}

export class TilingEngineFactory {
    logger: Log;
    
    constructor(logger: Log) {
        this.logger = logger;
    }
    
    newEngine(t: EngineType, config?: IEngineConfig): TilingEngine {
        t %= EngineType._loop;
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
                this.logger.error("Engine not found for engine type", t);
                return new BTreeEngine(config);
        }
    }
}
