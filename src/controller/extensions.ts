import { MaximizeMode, VirtualDesktop, Window } from "kwin-api";
import { Workspace } from "kwin-api/qml";
import { Desktop } from "./desktop";
import { WindowHooks } from "./actions/windowhooks";
import { GPoint, GRect } from "../util/geometry";
import { Log } from "../util/log";

export class WorkspaceExtensions {
    // things added that we need
    public lastActivity: string;
    public lastDesktop: VirtualDesktop;
    public lastActiveWindow: Window | null = null;

    // hidden stuff to track changes with
    private currentActivity: string;
    private currentDesktop: VirtualDesktop;
    private workspace: Workspace;
    private currentActiveWindow: Window | null = null;
    //private logger: Log;

    constructor(workspace: Workspace) {
        this.workspace = workspace;
        //this.logger = logger;
        this.currentActivity = this.workspace.currentActivity;
        this.currentDesktop = this.workspace.currentDesktop;
        this.lastActivity = this.currentActivity;
        this.lastDesktop = this.currentDesktop;
        this.currentActiveWindow = this.workspace.activeWindow;

        this.workspace.currentActivityChanged.connect(this.repoll.bind(this));
        this.workspace.currentDesktopChanged.connect(this.repoll.bind(this));
        this.workspace.windowActivated.connect(this.windowActivated.bind(this));
    }

    // this flickers to null and then back so account for null
    private windowActivated(window: Window) {
        if (window == null) {
            return;
        }
        this.lastActiveWindow = this.currentActiveWindow;
        this.currentActiveWindow = window;
    }

    private repoll(): void {
        this.lastActivity = this.currentActivity;
        this.lastDesktop = this.currentDesktop;
        this.currentActivity = this.workspace.currentActivity;
        this.currentDesktop = this.workspace.currentDesktop;
    }
}

// important that this is connected first to new windows
export class WindowExtensions {
    // only store state of full maximization (who maximizes only directionally?)
    maximized: boolean = false;
    previousDesktops: Desktop[] = [];
    private previousDesktopsInternal: Desktop[] = [];
    isTiled: boolean = false; // not is in a tile, but is registered in engine
    wasTiled: boolean = false; // windows that were tiled when they could be (minimized/maximized/fullscreen)
    lastTiledLocation: GPoint | null = null;
    clientHooks: WindowHooks | null = null;
    isSingleMaximized: boolean = false; // whether the window is solo maximized or not (in accordance with maximize single windows)

    private window: Window;

    constructor(window: Window) {
        this.window = window;

        window.maximizedAboutToChange.connect(
            (m: MaximizeMode) =>
                (this.maximized = m == MaximizeMode.MaximizeFull),
        );
        window.tileChanged.connect(this.tileChanged.bind(this));
        window.desktopsChanged.connect(this.previousDesktopsChanged.bind(this));
        window.activitiesChanged.connect(
            this.previousDesktopsChanged.bind(this),
        );
        window.outputChanged.connect(this.previousDesktopsChanged.bind(this));

        this.tileChanged();
        this.previousDesktopsChanged();
    }

    private tileChanged(): void {
        this.lastTiledLocation =
            this.window.tile != null
                ? new GRect(this.window.tile.absoluteGeometry).center
                : null;
    }

    private previousDesktopsChanged(): void {
        this.previousDesktops = this.previousDesktopsInternal;
        this.previousDesktopsInternal = [];
        for (const desktop of this.window.desktops) {
            for (const activity of this.window.activities) {
                this.previousDesktopsInternal.push(
                    new Desktop(desktop, activity, this.window.output),
                );
            }
        }
    }
}
