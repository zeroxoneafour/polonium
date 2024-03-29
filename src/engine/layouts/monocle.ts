// monocle.ts - Monocle layout

import { TilingEngine, EngineCapability, Client, Tile } from "../engine";
import { Direction } from "../../util/geometry";

export default class MonocleEngine extends TilingEngine {
    engineCapability = EngineCapability.None;
    clients: Client[] = [];
    engineSettigns = {};

    buildLayout() {
        this.rootTile = new Tile();
        for (const client of this.clients) {
            this.rootTile.clients.push(client);
        }
    }

    addClient(client: Client) {
        if (!this.clients.includes(client)) {
            this.clients.push(client);
        }
        return;
    }

    removeClient(client: Client) {
        const index = this.clients.indexOf(client);
        if (index >= 0) {
            this.clients.splice(index, 1);
        }
    }

    putClientInTile(client: Client, _tile: Tile, _direction?: Direction) {
        this.addClient(client);
    }

    regenerateLayout() {
        return;
    }
}
