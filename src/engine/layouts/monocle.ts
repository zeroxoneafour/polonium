// monocle.ts - Monocle layout

import { TilingEngine, EngineCapability, Client, Tile } from "../engine";
import { Direction } from "../../util/geometry";

export default class MonocleEngine extends TilingEngine {
    // tilesmutable moves all processing work to driver
    engineCapability =
        EngineCapability.TilesMutable | EngineCapability.UntiledByDefault;

    buildLayout() {
        // literally nothing
        return;
    }

    addClient() {
        return;
    }

    removeClient() {
        return;
    }

    putClientInTile(client: Client, tile: Tile, _direction?: Direction) {
        tile.client = client;
    }

    regenerateLayout() {
        return;
    }
}
