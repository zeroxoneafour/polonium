import { Workspace } from "kwin-api/qml";
import { Shortcuts } from "../../extern";
import { getWindowHandler, queueEvent } from "..";
import { TilingEngineType } from "../../engine";

export class ShortcutsHandler {
    workspace: Workspace;
    shortcuts: Shortcuts;

    constructor(workspace: Workspace, shortcuts: Shortcuts) {
        this.workspace = workspace;
        this.shortcuts = shortcuts;

        this.shortcuts
            .getToggleActiveTiling()
            .activated.connect(this.toggleActiveTiling.bind(this));
        this.shortcuts
            .getSetEngineBTree()
            .activated.connect(this.setEngineBTree.bind(this));
        this.shortcuts
            .getSetEngineHalf()
            .activated.connect(this.setEngineHalf.bind(this));
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
                output: window.output,
            });
        } else {
            windowHandler.wantsTiled = true;
            windowHandler.tiled = true;
            queueEvent({
                t: "tileWindow",
                window: window,
                desktops: window.desktops,
                output: window.output,
            });
        }
    }

    setEngineBTree() {
        queueEvent({
            t: "changeEngine",
            desktop: this.workspace.currentDesktop,
            output: this.workspace.activeScreen,
            engineType: TilingEngineType.BTree,
        });
    }

    setEngineHalf() {
        queueEvent({
            t: "changeEngine",
            desktop: this.workspace.currentDesktop,
            output: this.workspace.activeScreen,
            engineType: TilingEngineType.Half,
        });
    }
}
