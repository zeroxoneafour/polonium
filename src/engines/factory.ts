// factory.ts - Tiling engine factory

import { TilingEngine } from "./";
import { BTreeEngine } from "./btree";

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
        return new BTreeEngine();
    }
}
