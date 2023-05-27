import * as Engine from "./engine/common";
import * as BTree from "./engine/btree";
import { printDebug, doTileClient } from "./util";

// change this to set the engine, may have a feature to edit this in real time in the future
const engine: Engine.TilingEngine = new BTree.TilingEngine;

export function rebuildLayout() {
    const desktop = new Engine.Desktop;
    engine.buildLayout(workspace.tilingForScreen(workspace.activeScreen).rootTile, desktop);
    for (const client of engine.placeClients(desktop)) {
        client[0].tile = client[1];
    }
}

export function clientDesktopChange(this: any, client: KWin.AbstractClient) {
    printDebug("Desktop, screen, or activity changed on " + client.resourceClass, false);
    engine.updateClientDesktop(client);
    rebuildLayout();
}

export function tileClient(this: any, client: KWin.AbstractClient): void {
    engine.registerClient(client);
    client.desktopChanged.connect(clientDesktopChange.bind(this, client));
    rebuildLayout();
}

export function untileClient(this: any, client: KWin.AbstractClient): void {
    engine.removeClient(client);
    client.desktopChanged.disconnect(clientDesktopChange.bind(this, client));
    rebuildLayout();
}


export function addClient(client: KWin.AbstractClient): void {
    if (doTileClient(client)) {
        printDebug(client.resourceClass + " added", false);
        tileClient(client);
    }
}

export function removeClient(client: KWin.AbstractClient): void {
    printDebug(client.resourceClass + " removed", false);
    untileClient(client);
}

