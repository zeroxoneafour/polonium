import { Workspace } from "kwin-api/qml";
import { Shortcuts } from "../../extern";
import { getWindowHandler, queueEvent } from "..";
import { TilingEngineType } from "../../engine";
import { createTileEvents, createUntileEvents } from "../event";

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
            for (const ev of createUntileEvents(window)) {
                queueEvent(ev);
            }
        } else {
            windowHandler.wantsTiled = true;
            windowHandler.tiled = true;
            for (const ev of createTileEvents(window)) {
                queueEvent(ev);
            }
        }
    }

    setEngineBTree() {
        queueEvent({
            t: "changeEngine",
            desktop: this.workspace.currentDesktop,
            activity: this.workspace.currentActivity,
            output: this.workspace.activeScreen,
            engineType: TilingEngineType.BTree,
        });
    }

    setEngineHalf() {
        queueEvent({
            t: "changeEngine",
            desktop: this.workspace.currentDesktop,
            activity: this.workspace.currentActivity,
            output: this.workspace.activeScreen,
            engineType: TilingEngineType.Half,
        });
    }
}
