import copy from "fast-copy";

import { EngineManager, Desktop } from "./engine/engine";
// to build with a different engine, change this to a different file
import { Borders, config, printDebug, doTileClient } from "./util";

// change this to set the engine, may have a feature to edit this in real time in the future
export const engine: EngineManager = new EngineManager;

// boolean to stop geometrychange from interfering
let buildingLayout: boolean = false;
export function rebuildLayout(this: any, isRepeat = false) {
    buildingLayout = true;
    let repeatRebuild = false;
    let desktops = new Array<Desktop>;
    for (let i = 0; i < workspace.numScreens; i += 1) {
        let desktop = new Desktop;
        desktop.screen = i;
        desktops.push(desktop);
    }
    for (const desktop of desktops) {
        let tileManager = workspace.tilingForScreen(desktop.screen);
        if (tileManager == undefined) {
            printDebug("No root tile found for desktop " + desktop, true);
            return;
        }
        engine.buildLayout(tileManager.rootTile, desktop);
        const clientTiles = engine.placeClients(desktop);
        for (const clientTile of clientTiles) {
            const client = clientTile[0];
            const tile = clientTile[1];
            if (client.isSingleTile) {
                client.setMaximize(false, false);
                repeatRebuild = true;
            }
            // maximize' single windows if enabled in config
            if (config.maximizeSingle && (tile == tileManager.rootTile || clientTiles.length == 1)) {
                client.isSingleTile = true;
                client.setMaximize(true, true);
            }
            if (tile != null) {
                client.wasTiled = true;
                if (config.borders == Borders.NoBorderTiled) {
                    client.noBorder = true;
                }
                if (config.keepTiledBelow) {
                    client.keepBelow = true;
                }
                if (!client.isSingleTile) {
                    client.tile = tile;
                }
            } else {
                client.wasTiled = false;
                if (config.borders == Borders.NoBorderTiled) {
                    client.noBorder = false;
                }
                if (config.keepTiledBelow) {
                    client.keepBelow = false;
                }
                client.tile = null;
            }
            if (client.hasBeenTiled == undefined) {
                client.desktopChanged.connect(clientDesktopChange.bind(this, client));
                client.activitiesChanged.connect(clientDesktopChange);
                client.screenChanged.connect(clientDesktopChange.bind(this, client));
                client.frameGeometryChanged.connect(clientGeometryChange);
                client.clientMaximizedStateChanged.connect(clientMaximized);
                client.hasBeenTiled = true;
            }
        }
    }
    buildingLayout = false;

    // workaround for setMaximize(false,false) breaking the layout on first run
    if (!isRepeat && repeatRebuild) {
        let timer = new QTimer();
        timer.singleShot = true;
        timer.timeout.connect(rebuildLayout.bind(this, true));
        timer.start(config.timerDelay);
    }
}

export function currentDesktopChange(): void {
    rebuildLayout();
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
    const oldScreen = client.oldScreen;
    const activities = copy(client.oldActivities);
    client.oldDesktop = client.desktop;
    client.oldScreen = client.screen;
    client.oldActivities = new Array;
    for (const activity of client.activities) client.oldActivities.push(activity);
    printDebug("Desktop, screen, or activity changed on " + client.resourceClass, false);
    let oldDesktops: Array<Desktop> = new Array;
    if (vdesktop == -1) {
        for (let i = 0; i < workspace.desktops; i += 1) {
            for (const activity of activities) {
                const desktop = new Desktop(oldScreen, activity, i);
                oldDesktops.push(desktop);
            }
        }
    } else {
        for (const activity of activities) {
            const desktop = new Desktop(oldScreen, activity, vdesktop);
            oldDesktops.push(desktop);
        }
    }
    engine.updateClientDesktop(client, oldDesktops);
    rebuildLayout();
}

// if tile is defined, only tiles on a single desktop
export function tileClient(this: any, client: KWin.AbstractClient, tile?: KWin.Tile): void {
    // if a tile is specified, make sure to tile normally on other desktops where the tile doesnt exist
    if (tile != undefined) {
        let currentDesktop = new Desktop;
        let desktops: Array<Desktop> = new Array;
        if (client.desktop == -1) {
            for (let i = 0; i < workspace.desktops; i += 1) {
                for (const activity of client.activities) {
                    const desktop = new Desktop(client.screen, activity, i);
                    desktops.push(desktop);
                }
            }
        } else {
            for (const activity of client.activities) {
                const desktop = new Desktop(client.screen, activity, client.desktop);
                desktops.push(desktop);
            }
        }
        for (const desktop of desktops) {
            if (desktop.toString() == currentDesktop.toString()) {
                engine.putClientInTile(client, tile);
            } else {
                engine.addClient(client, desktop);
            }
        }
    } else {
        engine.addClient(client);
    }
    rebuildLayout();
}

export function untileClient(this: any, client: KWin.AbstractClient): void {
    client.wasTiled = false;
    client.tile = null;
    engine.removeClient(client);
    if (config.borders == Borders.NoBorderTiled) {
        client.noBorder = false;
    }
    if (config.keepTiledBelow) {
        client.keepBelow = false;
    }
    rebuildLayout();
}

export function clientGeometryChange(this: any, client: KWin.AbstractClient, _oldgeometry: Qt.QRect): void {
    // dont interfere with minimizing, maximizing, fullscreening, being the single tile, or layout building
    if (client.minimized || buildingLayout || client.maximized != 0 || client.fullScreen || client.isSingleTile) return;
    // because kwin doesnt have a separate handler for screen changing, add it here
    if (client.oldScreen != client.screen) {
        clientDesktopChange(client);
        return;
    }
    // only allow this function to handle movements when the client is visible
    let desktop = new Desktop;
    if (client.screen != desktop.screen || !client.activities.includes(desktop.activity) || !(client.desktop == desktop.desktop || client.desktop == -1)) return;
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
    client.maximized = 0;
    client.isSingleTile = false;
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
    if (!client.wasTiled) return;
    if (fullScreen) {
        printDebug(client.resourceClass + " enabled fullscreen", false);
        untileClient(client);
        client.wasTiled = true;
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

export function clientMaximized(client: KWin.AbstractClient, mode: KWin.MaximizeMode) {
    client.maximized = mode;
    if (!client.wasTiled) return;
    if (client.isSingleTile && mode == 0) {
        client.isSingleTile = false;
        return;
    } else if (client.isSingleTile) {
        client.wasTiled = true;
        return;
    }
    printDebug("Maximize mode on " + client.resourceClass + " was changed to " + mode, false);
    switch (mode) {
        case 0: tileClient(client);
        default: untileClient(client);
    }
    client.wasTiled = true;
}

// for borders
export function clientActivated(client: KWin.AbstractClient) {
    if (workspace.tmpLastActiveClient != null) {
        if (config.borders == Borders.BorderSelected) {
            workspace.tmpLastActiveClient.noBorder = true;
        }
        workspace.previousActiveClient = workspace.tmpLastActiveClient;
    }
    workspace.tmpLastActiveClient = client;
    if (config.borders == Borders.BorderSelected && client.tile != null) {
        client.noBorder = false;
    }
}
