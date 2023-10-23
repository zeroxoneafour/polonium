// factory.ts - Tiling engine factory

import { TilingEngine } from "./";
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
    newEngine(t: EngineType): TilingEngine
    {
        t %= EngineType._loop;
        switch (t)
        {
            case EngineType.BTree:
                return new BTreeEngine();
            case EngineType.Half:
                return new HalfEngine();
            default:
                Log.error("Engine not found for engine type", t);
                return new BTreeEngine();
        }
    }
}
