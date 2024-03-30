// kwin.ts - Layout engine that mimics kwin default tiling
// quite a bit smaller this time!

import {
    TilingEngine,
    EngineCapability,
    Client,
    Tile,
    EngineSettings,
} from "../engine";
import { Direction } from "../../util/geometry";
import Queue from "mnemonist/queue";

export default class KwinEngine extends TilingEngine {
    // tilesmutable moves all processing work to driver
    engineCapability =
        EngineCapability.TilesMutable | EngineCapability.UntiledByDefault;
    get engineSettings(): EngineSettings {
        return {};
    }
    set engineSettings(_: EngineSettings) {}

    buildLayout() {
        // literally nothing
        return;
    }

    addClient() {
        return;
    }

    removeClient(client: Client) {
        const queue = new Queue<Tile>();
        let tile: Tile | undefined = this.rootTile;
        while (tile != undefined) {
            const index = tile.clients.indexOf(client);
            if (index >= -1) {
                tile.clients.splice(index, 1);
                return;
            }
            for (const child of tile.tiles) {
                queue.enqueue(child);
            }
            tile = queue.dequeue();
        }
    }

    putClientInTile(client: Client, tile: Tile, _direction?: Direction) {
        if (!tile.clients.includes(client)) {
            tile.clients.push(client);
        }
    }

    regenerateLayout() {
        return;
    }
}
