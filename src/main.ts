// change this to set the engine, may have a feature to edit this in real time in the future
const engine: Engine.TilingEngine = new BTree.TilingEngine;

function rebuildLayout() {
    const desktop = new Engine.Desktop;
    engine.buildLayout(workspace.tilingForScreen(workspace.activeScreen).rootTile, desktop);
    for (const client of engine.placeClients(desktop)) {
        client[0].tile = client[1];
    }
}

function clientDesktopChange(this: any, client: KWin.AbstractClient) {
    printDebug("Desktop, screen, or activity changed on " + client.resourceClass, false);
    engine.updateClientDesktop(client);
    rebuildLayout();
}

function tileClient(this: any, client: KWin.AbstractClient): void {
    engine.registerClient(client);
    client.desktopChanged.connect(clientDesktopChange.bind(this, client));
    rebuildLayout();
}

function untileClient(this: any, client: KWin.AbstractClient): void {
    engine.removeClient(client);
    client.desktopChanged.disconnect(clientDesktopChange.bind(this, client));
    rebuildLayout();
}


function addClient(client: KWin.AbstractClient): void {
    if (doTileClient(client)) {
        printDebug(client.resourceClass + " added", false);
        tileClient(client);
    }
}

function removeClient(client: KWin.AbstractClient): void {
    printDebug(client.resourceClass + " removed", false);
    untileClient(client);
}

workspace.clientAdded.connect(addClient);
workspace.clientRemoved.connect(removeClient);

workspace.currentDesktopChanged.connect(rebuildLayout);

// build first time
rebuildLayout();
