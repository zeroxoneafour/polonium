import { Workspace } from "kwin-api/qml";
import { Shortcuts } from "../../extern";
import { getWindowHandler, queueEvent } from "..";

export class ShortcutsHandler {
    workspace: Workspace;
    shortcuts: Shortcuts;

    constructor(workspace: Workspace, shortcuts: Shortcuts) {
        this.workspace = workspace;
        this.shortcuts = shortcuts;

        this.shortcuts.getToggleActiveTiling().activated.connect(this.toggleActiveTiling.bind(this));
    }

    toggleActiveTiling() {
        const window = this.workspace.activeWindow;
        if (window == null) return;
        const windowHandler = getWindowHandler(window);
        if (windowHandler == undefined) return;
        if (windowHandler.tiled) {
            windowHandler.wantsTiled = false;
            windowHandler.tiled = false;
            queueEvent({
                t: "untileWindow",
                window: window,
                desktops: window.desktops,
                output: window.output
            });
        } else {
            windowHandler.wantsTiled = true;
            windowHandler.tiled = true;
            queueEvent({
                t: "tileWindow",
                window: window,
                desktops: window.desktops,
                output: window.output
            });
        }
    }
}