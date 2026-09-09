import { Window } from "kwin-api";
import { QPoint } from "kwin-api/qt";
import { Workspace } from "kwin-api/qml";
import { DBus } from "../../extern";
import { controller as ctrl } from "..";

export class MouseFollowsFocusHandler {
    private workspace: Workspace;
    private dbus: DBus;
    // last window activated with the cursor elsewhere - a keyboard focus
    // change the warp may need to defend from focus-follows-mouse
    private target: Window | null = null;
    private armPos: QPoint | null = null;

    constructor(workspace: Workspace, dbus: DBus) {
        this.workspace = workspace;
        this.dbus = dbus;
    }

    windowActivated(window: Window | null) {
        if (window === null || window.specialWindow || window.popupWindow) {
            return;
        }
        if (this.cursorInside(window)) {
            // focus landed under a stationary cursor on its own - that is
            // focus-follows-mouse reverting a keyboard focus change, so keep
            // the target armed and let the warp put it back. a moved cursor
            // means the user did it
            if (this.target !== null && !this.cursorMoved()) {
                ctrl().queuePostEvent({ t: "mouseWarp" });
                return;
            }
            this.target = null;
            this.armPos = null;
            return;
        }
        this.target = window;
        this.armPos = this.workspace.cursorPos;
        ctrl().queuePostEvent({ t: "mouseWarp" });
    }

    windowRemoved(window: Window) {
        if (this.target === window) {
            this.target = null;
            this.armPos = null;
        }
    }

    private cursorMoved(): boolean {
        const pos = this.workspace.cursorPos;
        return (
            this.armPos === null ||
            pos.x !== this.armPos.x ||
            pos.y !== this.armPos.y
        );
    }

    private cursorInside(window: Window): boolean {
        const pos = this.workspace.cursorPos;
        const geo = window.frameGeometry;
        return (
            pos.x >= geo.x &&
            pos.x < geo.x + geo.width &&
            pos.y >= geo.y &&
            pos.y < geo.y + geo.height
        );
    }

    warp() {
        const target = this.target;
        this.target = null;
        this.armPos = null;
        let active = this.workspace.activeWindow;
        if (
            target !== null &&
            active !== null &&
            active !== target &&
            ctrl().isWindowTiled(active) &&
            this.cursorInside(active)
        ) {
            // focus-follows-mouse reverted a keyboard focus change under a
            // stationary cursor; put the keyboard's choice back
            this.workspace.activeWindow = target;
            active = target;
        }
        if (active === null || !ctrl().isWindowTiled(active)) {
            return;
        }
        if (active.move || active.resize) {
            return;
        }
        if (this.cursorInside(active)) {
            return;
        }
        this.dbus.moveMouseToFocus().call();
    }
}
