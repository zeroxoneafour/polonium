// this file wraps everything together and serves as an entry point

import * as main from "./main";
import * as shortcuts from "./shortcuts";

workspace.clientAdded.connect(main.addClient);
workspace.clientRemoved.connect(main.removeClient);
workspace.currentDesktopChanged.connect(main.rebuildLayout);
workspace.clientActivated.connect(main.clientActivated);

registerShortcut("PoloniumRetileWindow", "Polonium: Untile/Retile Window", "Meta+Shift+Space", shortcuts.retileWindow);

// build first time
main.rebuildLayout();
