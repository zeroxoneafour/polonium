import { Output, Tile, VirtualDesktop, Window, Activity } from "kwin-api";
import { TilingEngineType } from "../engine";
import { Queue, Direction } from "../util";

interface GenericEvent {
    t: string;
}

// normal events - run before build
interface TileWindowEvent {
    t: "tileWindow";
    window: Window;
    desktop: VirtualDesktop;
    activity: Activity;
    output: Output;
    tile?: Tile;
    direction?: Direction;
}
interface UntileWindowEvent {
    t: "untileWindow";
    window: Window;
    desktop: VirtualDesktop;
    activity: Activity;
    output: Output;
}
interface UpdateDriversEvent {
    t: "updateDrivers";
}
interface RebuildDesktopsEvent {
    t: "rebuildDesktops";
}
// registering a window is immediate, but removing a window must happen after all refs have been resolved
// as such, removing is an event while registering/creating is not
interface RemoveWindowEvent {
    t: "removeWindow";
    window: Window;
}
interface PlaceWindowEvent {
    t: "placeWindow";
    window: Window;
    desktop: VirtualDesktop;
    activity: Activity;
    output: Output;
    tile: Tile;
    direction?: Direction;
}
// set rebuild to false to avoid stuttering tiles when just moving them
interface UpdateTilesEvent {
    t: "updateTiles";
    desktop: VirtualDesktop;
    activity: Activity;
    output: Output;
    rebuild: boolean;
}
interface ChangeEngineEvent {
    t: "changeEngine";
    desktop: VirtualDesktop;
    activity: Activity;
    output: Output;
    engineType?: TilingEngineType;
    engineSettings?: object;
    // if set explicitly to true, then do not update dbus
    noDBusUpdate?: boolean;
}
interface ResetEngineEvent {
    t: "resetEngine";
    desktop: VirtualDesktop;
    activity: Activity;
    output: Output;
}
interface WindowActivatedEvent {
    t: "windowActivated";
    window: Window;
    desktop: VirtualDesktop;
    activity: Activity;
    output: Output;
}


export type Event =
    | TileWindowEvent
    | UntileWindowEvent
    | UpdateDriversEvent
    | RebuildDesktopsEvent
    | RemoveWindowEvent
    | PlaceWindowEvent
    | UpdateTilesEvent
    | ChangeEngineEvent
    | ResetEngineEvent
    | WindowActivatedEvent;

// post events - these events run after build
interface SetWindowPropertiesEvent {
    t: "setWindowProperties";
    window: Window;
    fullscreen?: boolean;
    noBorder?: boolean;
}
// make update tile sizes run post to avoid rebuilds that can cause jutter
interface ToggleSettingsMenuEvent {
    t: "toggleSettingsMenu";
    desktop: VirtualDesktop;
    activity: Activity;
    output: Output;
}


export type PostEvent = SetWindowPropertiesEvent | ToggleSettingsMenuEvent;

export interface GetCurrentEngineEvent {
    desktop: VirtualDesktop;
    activity: Activity;
    output: Output;
}

// check if two events operate on the same window, desktops, and output
function eventsAreParallel<
    T1 extends TileWindowEvent | PlaceWindowEvent | UntileWindowEvent,
    T2 extends TileWindowEvent | PlaceWindowEvent | UntileWindowEvent,
>(ev1: T1, ev2: T2): boolean {
    if (ev1.window !== ev2.window) return false;
    if (ev1.output !== ev2.output) return false;
    if (ev1.activity !== ev2.activity) return false;
    if (ev1.desktop !== ev2.desktop) return false;
    return true;
}

function eventsAreSame(ev1: GenericEvent, ev2: GenericEvent): boolean {
    if (ev1.t !== ev2.t) return false;
    for (const prop in ev1) {
        const val1 = (ev1 as any)[prop];
        const val2 = (ev2 as any)[prop];
        if (val1 !== val2) return false;
    }
    return true;
}

export function simplifyEvents(oldEvents: Queue<Event>): Queue<Event> {
    const newEvents = new Queue<Event>();
    for (const ev of oldEvents) {
        if (
            ev.t == "tileWindow" ||
            ev.t == "untileWindow" ||
            ev.t == "placeWindow"
        ) {
            const parallelEventIdx = newEvents.indexOf((e) => {
                if (
                    e.t == "tileWindow" ||
                    e.t == "untileWindow" ||
                    e.t == "placeWindow"
                ) {
                    return eventsAreParallel(ev, e);
                } else {
                    return false;
                }
            });
            // remove old parallel event so we can use new one instead
            if (parallelEventIdx != -1) {
                newEvents.removeAtIndex(parallelEventIdx);
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

export function createTileEvents(
    window: Window,
    desktops?: VirtualDesktop[],
    activities?: Activity[],
    output?: Output,
): TileWindowEvent[] {
    if (desktops === undefined) desktops = window.desktops;
    if (activities === undefined) activities = window.activities;
    if (output === undefined) output = window.output;
    const ret: TileWindowEvent[] = [];
    for (const desktop of desktops) {
        for (const activity of activities) {
            ret.push({
                t: "tileWindow",
                window: window,
                desktop: desktop,
                activity: activity,
                output: output,
            });
        }
    }
    // force return
    return ret;
}

export function createUntileEvents(
    window: Window,
    desktops?: VirtualDesktop[],
    activities?: Activity[],
    output?: Output,
): UntileWindowEvent[] {
    if (desktops === undefined) desktops = window.desktops;
    if (activities === undefined) activities = window.activities;
    if (output === undefined) output = window.output;
    const ret: UntileWindowEvent[] = [];
    for (const desktop of desktops) {
        for (const activity of activities) {
            ret.push({
                t: "untileWindow",
                window: window,
                desktop: desktop,
                activity: activity,
                output: output,
            });
        }
    }
    return ret;
}

export type DesktopIdentifier = string;
export function desktopId(
    desktop: VirtualDesktop,
    activity: Activity,
    output: Output,
): DesktopIdentifier {
    return `{"d":"${desktop.id}","a":"${activity}","o":"${output.name}"}`;
}
