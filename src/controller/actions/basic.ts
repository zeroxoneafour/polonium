// actions/basic.ts - Basic actions performed by the window manager, such as adding or deleting clients

import { Window } from "kwin-api";
import { Controller } from "../";
import { Log } from "../../util/log";
import { Config, Borders } from "../../util/config";
import { WindowExtensions } from "../extensions";

export class WorkspaceActions {
    private logger: Log;
    private config: Config;
    private ctrl: Controller;
    constructor(ctrl: Controller) {
        this.logger = ctrl.logger;
        this.config = ctrl.config;
        this.ctrl = ctrl;

    }
    
    // done later after loading
    addHooks(): void {
        const workspace = this.ctrl.workspace;
        workspace.windowAdded.connect(this.windowAdded.bind(this));
        workspace.windowRemoved.connect(this.windowRemoved.bind(this));
        workspace.currentActivityChanged.connect(this.currentDesktopChange.bind(this));
        workspace.currentDesktopChanged.connect(this.currentDesktopChange.bind(this));
        workspace.windowActivated.connect(this.windowActivated.bind(this));
    }

    doTileWindow(c: Window): boolean {
        if (
            c.normalWindow &&
            !((c.popupWindow || c.transient) && !this.config.tilePopups)
        ) {
            // check for things like max/min/fullscreen
            if (c.fullScreen || c.minimized) {
                return false;
            }
            // check if caption/resourceclass is substring as well
            for (const s of this.config.filterProcess) {
                if (s.length > 0 && c.resourceClass.includes(s)) {
                    return false;
                }
            }
            for (const s of this.config.filterCaption) {
                if (s.length > 0 && c.caption.includes(s)) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    }

    windowAdded(window: Window): void {
        this.ctrl.windowExtensions.set(window, new WindowExtensions(window));
        this.ctrl.windowHookManager.attachWindowHooks(window);
        if (!this.doTileWindow(window)) {
            this.logger.debug("Not tiling window", window.resourceClass);
            return;
        }
        if (this.config.borders == Borders.NoAll) {
            window.noBorder = true;
        }
        this.logger.debug("Window", window.resourceClass, "added");
        this.ctrl.driverManager.addWindow(window);
        this.ctrl.driverManager.rebuildLayout();
    }

    windowRemoved(window: Window): void {
        this.logger.debug("Window", window.resourceClass, "removed");
        this.ctrl.windowExtensions.delete(window);
        this.ctrl.driverManager.removeWindow(window);
        this.ctrl.driverManager.rebuildLayout();
    }

    currentDesktopChange(): void {
        // have to set this because this function temp untiles all windows
        this.ctrl.driverManager.buildingLayout = true;
        // set geometry for all clients manually to avoid resizing when tiles are deleted
        for (const window of this.ctrl.workspace.windows) {
            if (
                window.tile != null &&
                window.activities.includes(
                    this.ctrl.workspaceExtensions.lastActivity!,
                ) &&
                window.desktops.includes(
                    this.ctrl.workspaceExtensions.lastDesktop,
                )
            ) {
                const tile = window.tile;
                window.tile = null;
                window.frameGeometry = tile.absoluteGeometry;
                window.frameGeometry.width -= 2 * tile.padding;
                window.frameGeometry.height -= 2 * tile.padding;
                window.frameGeometry.x += tile.padding;
                window.frameGeometry.y += tile.padding;
            }
        }
        this.ctrl.driverManager.rebuildLayout();
    }

    windowActivated(_window: Window) {
        // _window is null??? kwin fix your api
        if (this.config.borders == Borders.Selected) {
            this.ctrl.workspace.activeWindow!.noBorder = false;
            const lastActiveWindow = this.ctrl.workspaceExtensions.lastActiveWindow;
            this.logger.debug(lastActiveWindow?.resourceClass);
            if (
                lastActiveWindow != null &&
                this.ctrl.windowExtensions.get(
                    lastActiveWindow,
                )!.isTiled
            ) {
                lastActiveWindow.noBorder = true;
            }
        }
    }
}
