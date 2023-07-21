// this file wraps everything together and serves as an entry point

import * as main from "./main";
import * as shortcuts from "./shortcuts";
import { createConfig, printDebug } from "./util";

export let workspace: KWin.WorkspaceWrapper;
export let options: KWin.Options;
export let kwin: KWin.Api;
export let print: (...values: any[]) => void;
export let createTimer: () => Qt.QTimer;
export let createDBusCall: () => KWin.DBusCall;
export let showDialog: (text: string) => void;
export let settingsDialog: Qml.SettingsDialog;
export let dbusClientInstalled: boolean = false;

export function init(this: any, api: CoreApi, qmlObjects: Qml.Main): void {
    workspace = api.workspace;
    options = api.options;
    kwin = api.kwin;
    print = qmlObjects.rootScript.printQml;
    createTimer = qmlObjects.rootScript.createTimer;
    createDBusCall = qmlObjects.rootScript.createDBusCall;
    showDialog = qmlObjects.dialog.show;
    settingsDialog = qmlObjects.settings;
    
    createConfig();
    options.configChanged.connect(createConfig);
    
    workspace.clientAdded.connect(main.addClient);
    workspace.clientRemoved.connect(main.removeClient);

    workspace.currentDesktopChanged.connect(main.currentDesktopChange);
    workspace.currentActivityChanged.connect(main.currentDesktopChange);

    workspace.clientActivated.connect(main.clientActivated);

    kwin.registerShortcut("PoloniumRetileWindow", "Polonium: Untile/Retile Window", "Meta+Shift+Space", shortcuts.retileWindow);
    kwin.registerShortcut("PoloniumCycleLayouts", "Polonium: Cycle layouts", "Meta+\\", shortcuts.cycleEngine);
    kwin.registerShortcut("PoloniumRebuildLayout", "Polonium: Rebuild Layout", "Meta+Ctrl+Space", main.rebuildLayout);
    kwin.registerShortcut("PoloniumShowSettings", "Polonium: Show Settings Dialog", "Meta+|", shortcuts.showSettingsDialog);

    kwin.registerShortcut("PoloniumFocusAbove", "Polonium: Focus Above", "Meta+K", shortcuts.focus.bind(this, shortcuts.Direction.Above));
    kwin.registerShortcut("PoloniumSwapAbove", "Polonium: Swap Above", "Ctrl+Meta+K", shortcuts.swap.bind(this, shortcuts.Direction.Above));
    kwin.registerShortcut("PoloniumInsertAbove", "Polonium: Insert Above", "Meta+Shift+K", shortcuts.insert.bind(this, shortcuts.Direction.Above));

    kwin.registerShortcut("PoloniumFocusBelow", "Polonium: Focus Below", "Meta+J", shortcuts.focus.bind(this, shortcuts.Direction.Below));
    kwin.registerShortcut("PoloniumSwapBelow", "Polonium: Swap Below", "Ctrl+Meta+J", shortcuts.swap.bind(this, shortcuts.Direction.Below));
    kwin.registerShortcut("PoloniumInsertBelow", "Polonium: Insert Below", "Meta+Shift+J", shortcuts.insert.bind(this, shortcuts.Direction.Below));

    kwin.registerShortcut("PoloniumFocusLeft", "Polonium: Focus Left", "Meta+H", shortcuts.focus.bind(this, shortcuts.Direction.Left));
    kwin.registerShortcut("PoloniumSwapLeft", "Polonium: Swap Left", "Ctrl+Meta+H", shortcuts.swap.bind(this, shortcuts.Direction.Left));
    kwin.registerShortcut("PoloniumInsertLeft", "Polonium: Insert Left", "Meta+Shift+H", shortcuts.insert.bind(this, shortcuts.Direction.Left));

    kwin.registerShortcut("PoloniumFocusRight", "Polonium: Focus Right", "Meta+L", shortcuts.focus.bind(this, shortcuts.Direction.Right));
    kwin.registerShortcut("PoloniumSwapRight", "Polonium: Swap Right", "Ctrl+Meta+L", shortcuts.swap.bind(this, shortcuts.Direction.Right));
    kwin.registerShortcut("PoloniumInsertRight", "Polonium: Insert Right", "Meta+Shift+L", shortcuts.insert.bind(this, shortcuts.Direction.Right));

    kwin.registerShortcut("PoloniumResizeTileUp", "Polonium: Resize Tile Up", "Meta+Shift+Up", shortcuts.resizeTile.bind(this, shortcuts.Direction.Above));
    kwin.registerShortcut("PoloniumResizeTileDown", "Polonium: Resize Tile Down", "Meta+Shift+Down", shortcuts.resizeTile.bind(this, shortcuts.Direction.Below));
    kwin.registerShortcut("PoloniumResizeTileLeft", "Polonium: Resize Tile Left", "Meta+Shift+Left", shortcuts.resizeTile.bind(this, shortcuts.Direction.Left));
    kwin.registerShortcut("PoloniumResizeTileRight", "Polonium: Resize Tile Right", "Meta+Shift+Right", shortcuts.resizeTile.bind(this, shortcuts.Direction.Right));

    workspace.lastActiveScreen = workspace.activeScreen;
    workspace.lastActivity = workspace.currentActivity;
    workspace.lastDesktop = workspace.currentDesktop;

    // build first time
    main.rebuildLayout();
    settingsDialog.saveSettings.connect(main.settingsDialogSaved);
    
    // check if dbus service is installed
    let checkCall = createDBusCall();
    checkCall.service = "org.polonium.SettingSaver";
    checkCall.path = "/saver";
    checkCall.dbusInterface = "org.polonium.SettingSaver";
    checkCall.method = "Exists";
    checkCall.finished.connect((returnValues: boolean[]) => {
        // will always be true if the right method is being called
        dbusClientInstalled = returnValues[0];
        printDebug("DBus service is installed", false);
    });
    checkCall.call();
}
