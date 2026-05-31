import { Workspace } from "kwin-api/qml";
import { config, createWindowHandler, getWindowHandler, queueEvent } from "..";
import { Output, VirtualDesktop, Window } from "kwin-api";
import { BorderSetting } from "../config";

export class WorkspaceHandler {
    private workspace: Workspace;
    private previousActivated: Window | null;

    constructor(workspace: Workspace) {
        this.workspace = workspace;
        this.previousActivated = this.workspace.activeWindow;

        this.workspace.windowAdded.connect(this.windowAdded.bind(this));
        this.workspace.windowRemoved.connect(this.windowRemoved.bind(this));
        this.workspace.currentDesktopChanged.connect(
            this.currentDesktopChanged.bind(this),
        );
        this.workspace.screensChanged.connect(this.updateDrivers.bind(this));
        this.workspace.desktopsChanged.connect(this.updateDrivers.bind(this));
        this.workspace.windowActivated.connect(this.windowActivated.bind(this));
    }

    windowAdded(window: Window) {
        // this _should_ not garbage collect I think while the window exists... no ref map needed?
        // never friggin mind we need a ref map to store "tiled" state across shortcut handler as well
        const windowHandler = createWindowHandler(window);
        if (!windowHandler.tiled) return;
        queueEvent({
            t: "tileWindow",
            window: window,
            desktops: window.desktops,
            output: window.output,
        });
    }

    windowRemoved(window: Window) {
        // slice operator because window.desktops may be destroyed
        queueEvent({
            t: "untileWindow",
            window: window,
            desktops: [...window.desktops],
            output: window.output,
        });
        queueEvent({
            t: "removeWindow",
            window: window,
        });
    }

    currentDesktopChanged(
        previousDesktop: VirtualDesktop,
        currentDesktop: VirtualDesktop,
        output: Output,
    ) {
        // never mind we still have to do stuff
        queueEvent({ t: "rebuildDesktops" });
    }

    updateDrivers() {
        queueEvent({ t: "updateDrivers" });
    }

    windowActivated(window: Window) {
        if (
            config().borders == BorderSetting.BorderActive ||
            config().borders == BorderSetting.BorderFloatingActive
        ) {
            if (windowIsTiled(window)) {
                queueEvent({
                    t: "setWindowProperties",
                    window: window,
                    noBorder: false,
                });
            }
            if (
                this.previousActivated != null &&
                (windowIsTiled(this.previousActivated) ||
                    config().borders == BorderSetting.BorderActive)
            ) {
                queueEvent({
                    t: "setWindowProperties",
                    window: this.previousActivated,
                    noBorder: true,
                });
            }
        }
        this.previousActivated = window;
    }
}

// undefined if the window handler is undefined (ie window was either never registered or has been destroyed)
function windowIsTiled(window: Window): boolean | undefined {
    return window.tile != null || getWindowHandler(window)?.tiled;
}
