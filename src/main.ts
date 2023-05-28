import * as Engine from "./engine/common";
// to build with a different engine, change this to a different file
import * as BTree from "./engine/btree";
import { Borders, config, printDebug, doTileClient } from "./util";

// change this to set the engine, may have a feature to edit this in real time in the future
export const engine: Engine.TilingEngine = new BTree.TilingEngine;

export function rebuildLayout() {
    const desktop = new Engine.Desktop;
    engine.buildLayout(workspace.tilingForScreen(workspace.activeScreen).rootTile, desktop);
    for (const client of engine.placeClients(desktop)) {
        client[0].wasTiled = true;
        client[0].tile = client[1];
    }
}

export function clientDesktopChange(this: any, client: KWin.AbstractClient) {
    if (!client.wasTiled) return;
    printDebug("Desktop, screen, or activity changed on " + client.resourceClass, false);
    engine.updateClientDesktop(client);
    rebuildLayout();
}

export function tileClient(this: any, client: KWin.AbstractClient): void {
    engine.addClient(client);
    if (client.hasBeenTiled == undefined) {
        client.desktopChanged.connect(clientDesktopChange.bind(this, client));
        client.frameGeometryChanged.connect(clientGeometryChange);
        client.hasBeenTiled = true;
    }
    if (config.borders == Borders.NoBorderTiled) {
        client.noBorder = true;
    }
    rebuildLayout();
}

export function untileClient(this: any, client: KWin.AbstractClient): void {
    client.wasTiled = false;
    engine.removeClient(client);
    if (config.borders == Borders.NoBorderTiled) {
        client.noBorder = false;
    }
    rebuildLayout();
    client.tile = null;
}

export function clientGeometryChange(this: any, client: KWin.AbstractClient, _oldgeometry: Qt.QRect): void {
    // only allow this function to handle movements when the client is visible
    let desktop = new Engine.Desktop;
    if (client.screen != desktop.screen || !client.activities.includes(desktop.activity) || client.desktop != desktop.desktop) return;
    // if removed from tile
    if (client.wasTiled && client.tile == null) {
        printDebug(client.resourceClass + " was moved out of a tile", false);
        untileClient(client);
    } else if (!client.wasTiled && client.tile != null) { // if added to tile
        client.wasTiled = true;
        engine.putClientInTile(client, client.tile);
        if (config.borders == Borders.NoBorderTiled) {
            client.noBorder = true;
        }
        rebuildLayout();
    }
}


export function addClient(client: KWin.AbstractClient): void {
    if (config.borders == Borders.NoBorderAll || config.borders == Borders.BorderSelected) {
        client.noBorder = true;
    }
    if (doTileClient(client)) {
        printDebug(client.resourceClass + " added", false);
        tileClient(client);
    }
}

export function removeClient(client: KWin.AbstractClient): void {
    printDebug(client.resourceClass + " removed", false);
    untileClient(client);
}

// for borders
export function clientActivated(client: KWin.AbstractClient) {
    if (workspace.lastActiveClient != null) {
        if (config.borders == Borders.BorderSelected) {
            workspace.lastActiveClient.noBorder = true;
        }
    }
    workspace.lastActiveClient = client;
    if (config.borders == Borders.BorderSelected && client.tile != null) {
        client.noBorder = false;
    }
}
