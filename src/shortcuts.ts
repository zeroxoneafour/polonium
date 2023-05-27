let retileWindow = function() {
    let client = workspace.activeClient;
    if (client == null) return;
    if (client.tile != null) {
        printDebug("Untiling client " + client.resourceClass, false);
        untileClient(client);
    } else {
        printDebug("Retiling client " + client.resourceClass, false);
        tileClient(client);
    }
}
registerShortcut("PoloniumRetileWindow", "Polonium: Untile/Retile Window", "Meta+Shift+Space", retileWindow);
