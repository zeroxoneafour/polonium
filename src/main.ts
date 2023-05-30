import copy from "fast-copy";

import { EngineManager, Desktop } from "./engine/engine";
// to build with a different engine, change this to a different file
import { Borders, config, printDebug, doTileClient } from "./util";

// change this to set the engine, may have a feature to edit this in real time in the future
export const engine: EngineManager = new EngineManager;

export function rebuildLayout() {
    const desktop = new Desktop;
    engine.buildLayout(workspace.tilingForScreen(workspace.activeScreen).rootTile, desktop);
    for (const client of engine.placeClients(desktop)) {
        if (client[1] != null) {
            client[0].wasTiled = true;
            if (config.borders == Borders.NoBorderTiled) {
                client[0].noBorder = true;
            }
            if (config.keepTiledBelow) {
                client[0].keepBelow = true;
            }
        } else {
            client[0].wasTiled = false;
            if (config.borders == Borders.NoBorderTiled) {
                client[0].noBorder = false;
            }
            if (config.keepTiledBelow) {
                client[0].keepBelow = false;
            }
        }
        client[0].tile = client[1];
    }
}

export function clientDesktopChange(this: any, client: KWin.AbstractClient) {
    if (client.oldScreen == undefined || client.oldActivities == undefined || client.oldDesktop == undefined || !client.wasTiled) {
        client.oldDesktop = client.desktop;
        client.oldScreen = client.screen;
        client.oldActivities = new Array;
        for (const activity of client.activities) client.oldActivities.push(activity);
        return;
    }
    const vdesktop = client.oldDesktop;
    const screen = client.oldScreen;
    const activities = copy(client.oldActivities);
    client.oldDesktop = client.desktop;
    client.oldScreen = client.screen;
    client.oldActivities = new Array;
    for (const activity of client.activities) client.oldActivities.push(activity);
    printDebug("Desktop, screen, or activity changed on " + client.resourceClass, false);
    let oldDesktops: Array<Desktop> = new Array;
    printDebug("Activity = " + activities, false);
    if (client.desktop == -1) {
        for (let i = 0; i < workspace.desktops; i += 1) {
            for (const activity of client.activities) {
                const desktop = new Desktop;
                desktop.screen = client.screen;
                desktop.activity = activity;
                desktop.desktop = i;
                oldDesktops.push(desktop);
            }
        }
    } else {
        for (const activity of client.activities) {
            const desktop = new Desktop;
            desktop.screen = client.screen;
            desktop.activity = activity;
            desktop.desktop = client.desktop;
            oldDesktops.push(desktop);
        }
    }
    engine.updateClientDesktop(client, oldDesktops);
    rebuildLayout();
}

// if tile is defined, only tiles on a single desktop
export function tileClient(this: any, client: KWin.AbstractClient, tile?: KWin.Tile): void {
    client.wasTiled = true;
    if (tile != undefined) {
        engine.putClientInTile(client, tile);
    } else {
        engine.addClient(client);
    }
    if (client.hasBeenTiled == undefined) {
        client.desktopChanged.connect(clientDesktopChange.bind(this, client));
        client.frameGeometryChanged.connect(clientGeometryChange);
        client.hasBeenTiled = true;
    }
    rebuildLayout();
}

export function untileClient(this: any, client: KWin.AbstractClient): void {
    client.wasTiled = false;
    engine.removeClient(client);
    rebuildLayout();
    client.tile = null;
}

export function clientGeometryChange(this: any, client: KWin.AbstractClient, _oldgeometry: Qt.QRect): void {
    // dont interfere with minimizing
    if (client.minimized) return;
    // only allow this function to handle movements when the client is visible
    let desktop = new Desktop;
    if (client.screen != desktop.screen || !client.activities.includes(desktop.activity) || client.desktop != desktop.desktop) return;
    // if removed from tile
    if (client.wasTiled && client.tile == null) {
        printDebug(client.resourceClass + " was moved out of a tile", false);
        untileClient(client);
    } else if (!client.wasTiled && client.tile != null) { // if added to tile
        printDebug(client.resourceClass + " was moved into a tile", false);
        tileClient(client, client.tile);
    }
}

export function addClient(client: KWin.AbstractClient): void {
    client.oldDesktop = client.desktop;
    client.oldScreen = client.screen;
    client.oldActivities = new Array;
    for (const activity of client.activities) client.oldActivities.push(activity);
    
    if (config.borders == Borders.NoBorderAll || config.borders == Borders.BorderSelected) {
        client.noBorder = true;
    }
    
    if (doTileClient(client)) {
        printDebug("Adding and tiling " + client.resourceClass, false);
        tileClient(client);
    } else {
        printDebug("Adding and not tiling " + client.resourceClass, false);
    }
}

export function removeClient(client: KWin.AbstractClient): void {
    printDebug(client.resourceClass + " was removed and untiled", false);
    untileClient(client);
}

export function clientFullScreenSet(client: KWin.AbstractClient, fullScreen: boolean, _user: boolean): void {
    if (fullScreen) {
        printDebug(client.resourceClass + " enabled fullscreen", false);
        untileClient(client);
    } else {
        printDebug(client.resourceClass + " disabled fullscreen", false);
        tileClient(client);
    }
}

export function clientMinimized(client: KWin.AbstractClient): void {
    if (!client.wasTiled) return;
    printDebug(client.resourceClass + " was minimized", false);
    untileClient(client);
    client.wasTiled = true;
}

export function clientUnminimized(client: KWin.AbstractClient): void {
    if (!client.wasTiled) return;
    printDebug(client.resourceClass + " was unminimized", false);
    tileClient(client);
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
