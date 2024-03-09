import { MaximizeMode, VirtualDesktop, Window } from "kwin-api";
import { Workspace } from "kwin-api/qml";
import { Desktop } from "./desktop";
import { WindowHooks } from "./actions/windowhooks";
import { GPoint, GRect } from "../util/geometry";

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

    constructor(workspace: Workspace) {
        this.workspace = workspace;
        this.currentActivity = this.workspace.currentActivity;
        this.currentDesktop = this.workspace.currentDesktop;
        this.lastActivity = this.currentActivity;
        this.lastDesktop = this.currentDesktop;

        this.workspace.currentActivityChanged.connect(this.repoll.bind(this));
        this.workspace.currentDesktopChanged.connect(this.repoll.bind(this));
        this.workspace.windowActivated.connect(((_window: Window) => {
            this.lastActiveWindow = this.currentActiveWindow;
            this.currentActiveWindow = this.workspace.activeWindow;
        }).bind(this));
    }

    private repoll(): void {
        this.lastActivity = this.currentActivity;
        this.lastDesktop = this.currentDesktop;
        this.currentActivity = this.workspace.currentActivity;
        this.currentDesktop = this.workspace.currentDesktop;
    }
}

export class WindowExtensions {
    // only store state of full maximization (who maximizes only directionally?)
    maximized: boolean = false;
    previousDesktops: Desktop[] = [];
    private previousDesktopsInternal: Desktop[] = [];
    isTiled: boolean = false; // not is in a tile, but is registered in engine
    lastTiledLocation: GPoint | null = null;
    clientHooks: WindowHooks | null = null;

    private window: Window;

    constructor(window: Window) {
        this.window = window;

        window.maximizedAboutToChange.connect(
            (m: MaximizeMode) =>
                (this.maximized = m == MaximizeMode.MaximizeFull),
        );
        window.tileChanged.connect(this.tileChanged.bind(this));
        window.desktopsChanged.connect(this.previousDesktopsChanged.bind(this));
        window.activitiesChanged.connect(this.previousDesktopsChanged.bind(this));
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
