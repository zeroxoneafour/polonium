// monocle.ts - Monocle layout

import {
    TilingEngine,
    EngineCapability,
    Client,
    Tile,
    EngineSettings,
} from "../engine";
import { Direction } from "../../util/geometry";

export default class MonocleEngine extends TilingEngine {
    engineCapability = EngineCapability.None;
    clients: Client[] = [];
    get engineSettings(): EngineSettings {
        return {};
    }
    set engineSettings(_: EngineSettings) {}

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

    // handle switching order of windows through side-based insertion
    // inserting above/right puts window on top, inserting
    putClientInTile(client: Client, _tile: Tile, direction?: Direction) {
        if (this.clients.includes(client)) {
            return;
        }
        if (direction == undefined) {
            this.addClient(client);
            return;
        }
        // if up or right then cycle forwards (assuming the window inserted was previously on top)
        if (
            (direction & Direction.Up && direction & Direction.Vertical) ||
            (direction & Direction.Right && !(direction & Direction.Vertical))
        ) {
            // turns out this just means inserting the window normally
            // (its automatically pushed to the back)
            this.clients.push(client);
        } else {
            // cycle backwards, bring the window in the last position to the front
            const lastClient = this.clients.pop();
            if (lastClient == undefined) {
                // empty array so order doesnt matter anyways
                this.clients.push(client);
            } else {
                this.clients.splice(0, 0, lastClient, client);
            }
        }
    }

    regenerateLayout() {
        return;
    }
}
