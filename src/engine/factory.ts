// factory.ts - Tiling engine factory

import { TilingEngine, IEngineConfig } from "./";
import BTreeEngine from "./layouts/btree";
import HalfEngine from "./layouts/half";
import Log from "../util/log";

export const enum EngineType
{
    BTree = 0,
    Half,
    _loop,
}

export class TilingEngineFactory
{
    newEngine(t: EngineType, config?: IEngineConfig): TilingEngine
    {
        t %= EngineType._loop;
        switch (t)
        {
            case EngineType.BTree:
                return new BTreeEngine(config);
            case EngineType.Half:
                return new HalfEngine(config);
            default:
                Log.error("Engine not found for engine type", t);
                return new BTreeEngine(config);
        }
    }
}
