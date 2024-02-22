import { MaximizeMode, QmlWorkspace, VirtualDesktop, Window } from "kwin-api";
import { Desktop } from "./desktop";
import { GPoint, GRect } from "../util/geometry";

export class WorkspaceExtensions {
    // things added that we need
    public lastActivity: string;
    public lastDesktop: VirtualDesktop;

    // hidden stuff to track changes with
    private currentActivity: string;
    private currentDesktop: VirtualDesktop;
    private workspace: QmlWorkspace;

    constructor(workspace: QmlWorkspace) {
        this.workspace = workspace;
        this.currentActivity = this.workspace.currentActivity;
        this.currentDesktop = this.workspace.currentDesktop;
        this.lastActivity = this.currentActivity;
        this.lastDesktop = this.currentDesktop;

        this.workspace.currentActivityChanged.connect(this.repoll);
        this.workspace.currentDesktopChanged.connect(this.repoll);
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
    hooksRegistered: boolean = false;

    private window: Window;

    constructor(window: Window) {
        this.window = window;
        
        window.maximizedAboutToChange.connect(
            (m: MaximizeMode) =>
                (this.maximized = m == MaximizeMode.MaximizeFull),
        );
        window.tileChanged.connect(this.tileChanged);
        window.desktopsChanged.connect(this.previousDesktopsChanged);
        window.activitiesChanged.connect(this.previousDesktopsChanged);
        window.outputChanged.connect(this.previousDesktopsChanged);
        
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
