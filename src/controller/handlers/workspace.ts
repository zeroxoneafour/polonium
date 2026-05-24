import { Workspace } from "kwin-api/qml";
import { createWindowHandler, getWindowHandler, queueEvent } from "..";
import { Output, VirtualDesktop, Window } from "kwin-api";

export class WorkspaceHandler {
    private workspace: Workspace;

    constructor(workspace: Workspace) {
        this.workspace = workspace;
        
        this.workspace.windowAdded.connect(this.windowAdded.bind(this));
        this.workspace.windowRemoved.connect(this.windowRemoved.bind(this));
        this.workspace.currentDesktopChanged.connect(this.currentDesktopChanged.bind(this));
        this.workspace.screensChanged.connect(this.updateDrivers.bind(this));
        this.workspace.desktopsChanged.connect(this.updateDrivers.bind(this));
    }

    windowAdded(kwinWindow: Window) {
        // this _should_ not garbage collect I think while the window exists... no ref map needed?
        // never friggin mind we need a ref map to store "tiled" state across shortcut handler as well
        const windowHandler = createWindowHandler(kwinWindow);
        if (!windowHandler.tiled) return;
        queueEvent({
            t: "tileWindow",
            window: kwinWindow,
            desktops: kwinWindow.desktops,
            output: kwinWindow.output
        });
    }
    
    windowRemoved(kwinWindow: Window) {
        // it should just not untile the window if it was never tiled, so we dont need to track that here
        // jk ig we do sometimes
        if (getWindowHandler(kwinWindow)?.tiled) queueEvent({
            t: "untileWindow",
            window: kwinWindow,
            desktops: kwinWindow.desktops,
            output: kwinWindow.output
        });
        queueEvent({
            t: "removeWindow",
            window: kwinWindow
        });
    }

    currentDesktopChanged(previousDesktop: VirtualDesktop, currentDesktop: VirtualDesktop, output: Output) {
        // never mind we still have to do stuff
        queueEvent({t: "rebuildDesktops"});
    }

    updateDrivers() {
        queueEvent({t: "updateDrivers"});
    }
}