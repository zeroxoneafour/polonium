import { Output, Tile, VirtualDesktop, Window, Activity } from "kwin-api";
import { TilingEngineType } from "../engine";
import { Queue, Direction } from "../util";
import { QPoint } from "kwin-api/qt";
import { Workspace } from "kwin-api/qml";

export type DisplaySymbol = Symbol;

export class Display {
    readonly desktop: VirtualDesktop;
    readonly activity: Activity;
    readonly output: Output;

    private static workspace: Workspace | undefined;

    static setWorkspace(workspace: Workspace): void {
        this.workspace = workspace;
    }

    constructor(desktop: VirtualDesktop, activity: Activity, output: Output) {
        this.desktop = desktop;
        this.activity = activity;
        this.output = output;
    }

    toString(): string {
        return `{"d":"${this.desktop.id}","a":"${this.activity}","o":"${this.output.name}"}`;
    }

    toSymbol(): DisplaySymbol {
        return Symbol.for(this.toString());
    }

    equals(d: Display | null | undefined) {
        return (
            d &&
            d.desktop === this.desktop &&
            d.activity === this.activity &&
            d.output === this.output
        );
    }

    static *generate(
        desktops: VirtualDesktop[],
        activities: Activity[],
        outputs: Output[],
    ): Iterable<Display> {
        for (const desktop of desktops) {
            for (const activity of activities) {
                for (const output of outputs) {
                    yield new Display(desktop, activity, output);
                }
            }
        }
    }

    static *generateWindow(window: Window): Iterable<Display> {
        const desktops = window.onAllDesktops ? this.workspace?.desktops ?? [] : window.desktops;
        for (const desktop of desktops) {
            for (const activity of window.activities) {
                yield new Display(desktop, activity, window.output);
            }
        }
    }
}

interface GenericEvent {
    t: string;
    // a lot of events have this field exactly so give it a bit of shape
    display?: Display;
}

// normal events - run before build
interface NewWindowEvent {
    t: "newWindow";
    window: Window;
    forceTile?: boolean;
    tile?: Tile;
    direction?: Direction;
}
interface DeleteWindowEvent {
    t: "deleteWindow";
    window: Window;
}
interface UpdateWindowEvent {
    t: "updateWindow";
    window: Window;
}
interface TileWindowEvent {
    t: "tileWindow";
    window: Window;
}
interface UntileWindowEvent {
    t: "untileWindow";
    window: Window;
}
interface PlaceWindowEvent {
    t: "placeWindow";
    window: Window;
    tile: Tile;
    direction?: Direction;
}
interface PlaceWindowPointEvent {
    t: "placeWindowPoint";
    window: Window;
    point: QPoint;
}
interface WindowActivatedEvent {
    t: "windowActivated";
    window: Window;
}
interface UpdateDriversEvent {
    t: "updateDrivers";
}
interface RebuildDisplaysEvent {
    t: "rebuildDisplays";
}
// set rebuild to false to avoid stuttering tiles when just moving them
interface UpdateTilesEvent {
    t: "updateTiles";
    display: Display;
    rebuild: boolean;
}
interface ChangeEngineEvent {
    t: "changeEngine";
    display: Display;
    engineType?: TilingEngineType;
    engineSettings?: object;
    // if set explicitly to true, then do not update dbus
    noDBusUpdate?: boolean;
}
interface ResetEngineEvent {
    t: "resetEngine";
    display: Display;
}

export type Event =
    | NewWindowEvent
    | DeleteWindowEvent
    | UpdateWindowEvent
    | TileWindowEvent
    | UntileWindowEvent
    | PlaceWindowEvent
    | PlaceWindowPointEvent
    | WindowActivatedEvent
    | UpdateDriversEvent
    | RebuildDisplaysEvent
    | UpdateTilesEvent
    | ChangeEngineEvent
    | ResetEngineEvent;

// post events - these events run after build
interface SetWindowPropertiesEvent {
    t: "setWindowProperties";
    window: Window;
    fullscreen?: boolean;
    noBorder?: boolean;
    keepAbove?: boolean;
}
// make update tile sizes run post to avoid rebuilds that can cause jutter
interface ToggleSettingsMenuEvent {
    t: "toggleSettingsMenu";
    display: Display;
}

export type PostEvent = SetWindowPropertiesEvent | ToggleSettingsMenuEvent;

function eventsAreSame(ev1: GenericEvent, ev2: GenericEvent): boolean {
    if (ev1.t !== ev2.t) return false;
    for (const prop in ev1) {
        // display is the only parameter in the above events that should be matched based on value not reference
        if (prop === "display") {
            if (ev1.display?.equals(ev2.display)) {
                continue;
            }
            return false;
        }
        const val1 = (ev1 as any)[prop];
        const val2 = (ev2 as any)[prop];
        if (val1 !== val2) return false;
    }
    return true;
}

export function simplifyEvents(oldEvents: Queue<Event>): Queue<Event> {
    const newEvents = new Queue<Event>();
    for (const ev of oldEvents) {
        // cancel out conflicting tile request events
        if (
            ev.t === "tileWindow" ||
            ev.t === "untileWindow" ||
            ev.t === "placeWindow"
        ) {
            // first check if a newWindow event with the same window has been queued.
            // if so, we can set props on the newWindow event such that it applies the tile event
            // and then we continue cus newWindow got us
            const newEv = newEvents.find(
                (e) => e.t === "newWindow" && e.window === ev.window,
            );
            if (newEv !== undefined && newEv.t === "newWindow") {
                if (ev.t === "tileWindow") {
                    newEv.forceTile = true;
                    newEv.tile = undefined;
                    newEv.direction = undefined;
                } else if (ev.t === "untileWindow") {
                    newEv.forceTile = false;
                    newEv.tile = undefined;
                    newEv.direction = undefined;
                } else if (ev.t === "placeWindow") {
                    newEv.forceTile = true;
                    newEv.tile = ev.tile;
                    newEv.direction = ev.direction;
                }
                continue;
            }
            const parallelIdx = newEvents.indexOf(
                (e) =>
                    (e.t === "tileWindow" ||
                        e.t === "untileWindow" ||
                        e.t === "placeWindow") &&
                    e.window === ev.window,
            );
            // remove old parallel event so we can use new one instead
            if (parallelIdx != -1) {
                newEvents.removeAtIndex(parallelIdx);
            }
        }
        // if a window is deleted in the same frame it is created then cancel both events
        if (ev.t === "deleteWindow") {
            const newIdx = newEvents.indexOf(
                (e) => e.t === "newWindow" && e.window === ev.window,
            );
            if (newIdx != -1) {
                newEvents.removeAtIndex(newIdx);
                continue;
            }
        }
        // code that continues must go below code that removes other events,
        // as if it continues too early then events are not cancelled evenly
        if (newEvents.some((e) => eventsAreSame(ev, e))) {
            continue;
        }
        // filter out changeEngine events with two undefineds
        if (
            ev.t == "changeEngine" &&
            ev.engineSettings === undefined &&
            ev.engineType === undefined
        ) {
            continue;
        }
        newEvents.push(ev);
    }
    return newEvents;
}

export function simplifyPostEvents(
    oldEvents: Queue<PostEvent>,
): Queue<PostEvent> {
    const newEvents = new Queue<PostEvent>();
    for (const ev of oldEvents) {
        if (newEvents.some((e) => eventsAreSame(ev, e))) {
            continue;
        }
        newEvents.push(ev);
    }
    return newEvents;
}
