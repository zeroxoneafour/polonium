// this file wraps everything together and serves as an entry point

import * as main from "./main";
import * as shortcuts from "./shortcuts";
import { config } from "./util";

workspace.clientAdded.connect(main.addClient);
workspace.clientRemoved.connect(main.removeClient);

workspace.currentDesktopChanged.connect(main.currentDesktopChange);
workspace.currentActivityChanged.connect(main.currentDesktopChange);

workspace.clientActivated.connect(main.clientActivated);
workspace.clientMinimized.connect(main.clientMinimized);
workspace.clientUnminimized.connect(main.clientUnminimized);
workspace.clientFullScreenSet.connect(main.clientFullScreenSet);

registerShortcut("PoloniumRetileWindow", "Polonium: Untile/Retile Window", "Meta+Shift+Space", shortcuts.retileWindow);
registerShortcut("PoloniumCycleLayouts", "Polonium: Cycle layouts", "Meta+\\", shortcuts.cycleEngine);

registerShortcut("PoloniumFocusAbove", "Polonium: Focus Above", "Meta+K", shortcuts.focus.bind(this, shortcuts.Direction.Above));
registerShortcut("PoloniumSwapAbove", "Polonium: Swap Above", "Ctrl+Meta+K", shortcuts.swap.bind(this, shortcuts.Direction.Above));
registerShortcut("PoloniumInsertAbove", "Polonium: Insert Above", "Meta+Shift+K", shortcuts.insert.bind(this, shortcuts.Direction.Above));

registerShortcut("PoloniumFocusBelow", "Polonium: Focus Below", "Meta+J", shortcuts.focus.bind(this, shortcuts.Direction.Below));
registerShortcut("PoloniumSwapBelow", "Polonium: Swap Below", "Ctrl+Meta+J", shortcuts.swap.bind(this, shortcuts.Direction.Below));
registerShortcut("PoloniumInsertBelow", "Polonium: Insert Below", "Meta+Shift+J", shortcuts.insert.bind(this, shortcuts.Direction.Below));

registerShortcut("PoloniumFocusLeft", "Polonium: Focus Left", "Meta+H", shortcuts.focus.bind(this, shortcuts.Direction.Left));
registerShortcut("PoloniumSwapLeft", "Polonium: Swap Left", "Ctrl+Meta+H", shortcuts.swap.bind(this, shortcuts.Direction.Left));
registerShortcut("PoloniumInsertLeft", "Polonium: Insert Left", "Meta+Shift+H", shortcuts.insert.bind(this, shortcuts.Direction.Left));

registerShortcut("PoloniumFocusRight", "Polonium: Focus Right", "Meta+L", shortcuts.focus.bind(this, shortcuts.Direction.Right));
registerShortcut("PoloniumSwapRight", "Polonium: Swap Right", "Ctrl+Meta+L", shortcuts.swap.bind(this, shortcuts.Direction.Right));
registerShortcut("PoloniumInsertRight", "Polonium: Insert Right", "Meta+Shift+L", shortcuts.insert.bind(this, shortcuts.Direction.Right));

// build first time
main.rebuildLayout();
