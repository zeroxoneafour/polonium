// driver/driver.ts - Mapping from engines to Kwin API

import { TilingEngine, TilingEngineType, EngineParameters, Window, Tile, WindowRef } from "../engine";
import { Window as KwinWindow, Output, VirtualDesktop, Tile as KwinTile } from "kwin-api";

export class KwinTilingDriver {
    private engine: TilingEngine;
    private kwinRootTile: KwinTile;

    constructor(
        enginetype: TilingEngineType,
        engineParameters: EngineParameters,
        customSettings: object,
        rootTile: KwinTile,
        virtualDesktop: VirtualDesktop,
        output: Output
    ) {
        this.engine = new TilingEngine(enginetype);
        this.engine.engineParameters = engineParameters;
        this.engine.customSettings = customSettings;
        this.kwinRootTile = rootTile;
    }

    addWindow(kwinWindow: KwinWindow, insertionPoint?: ): void {
    }
}