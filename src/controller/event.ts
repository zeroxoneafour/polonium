import { Output, Tile, VirtualDesktop, Window, Activity } from "kwin-api";
import { Direction } from "../util/geometry";
import { TilingEngineType } from "../engine";
import { Queue } from "../util/queue";

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
// use this instead of UpdateTileSizes only when the amount of tiles on screen is changed, triggers rebuild
interface UpdateTileCountEvent {
    t: "updateTileCount";
    desktop: VirtualDesktop;
    activity: Activity;
    output: Output;
}
interface ChangeEngineEvent {
    t: "changeEngine";
    desktop: VirtualDesktop;
    activity: Activity;
    output: Output;
    engineType?: TilingEngineType;
    engineSettings?: object;
}

export type Event =
    | TileWindowEvent
    | UntileWindowEvent
    | UpdateDriversEvent
    | RebuildDesktopsEvent
    | RemoveWindowEvent
    | PlaceWindowEvent
    | UpdateTileCountEvent
    | ChangeEngineEvent;

// post events - these events run after build
interface SetWindowPropertiesEvent {
    t: "setWindowProperties";
    window: Window;
    fullscreen?: boolean;
    noBorder?: boolean;
}
// make update tile sizes run post to avoid rebuilds that can cause jutter
interface UpdateTileSizesEvent {
    t: "updateTileSizes";
    desktop: VirtualDesktop;
    activity: Activity;
    output: Output;
}

export type PostEvent = SetWindowPropertiesEvent | UpdateTileSizesEvent;

// check if two events operate on the same widnow, desktops, and output
// ev1 must be a tileWindow event and ev2 must be an untileWindow event
function eventsAreParallel(
    ev1: TileWindowEvent,
    ev2: UntileWindowEvent,
): boolean {
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

export function simplifyEvents(eventQueue: Queue<Event>): Queue<Event> {
    const oldEvents = new Array<Event>(eventQueue.size);
    for (let i = 0; i < oldEvents.length; i += 1) {
        oldEvents[i] = eventQueue.pop()!;
    }
    const newEvents: Event[] = [];
    for (const ev of oldEvents) {
        if (newEvents.some((e) => eventsAreSame(ev, e))) {
            continue;
        }
        if (ev.t == "tileWindow" || ev.t == "untileWindow") {
            const parallelEventIdx = newEvents.findIndex((e) => {
                if (ev.t == "tileWindow" && e.t == "untileWindow") {
                    return eventsAreParallel(ev, e);
                } else if (e.t == "tileWindow" && ev.t == "untileWindow") {
                    return eventsAreParallel(e, ev);
                }
            });
            // remove old parallel event so we can use new one instead
            if (parallelEventIdx != -1) {
                newEvents.splice(parallelEventIdx, 1);
            }
        }
        newEvents.push(ev);
    }
    const ret = new Queue<Event>();
    ret.multipush(newEvents);
    return ret;
}

export function simplifyPostEvents(
    eventQueue: Queue<PostEvent>,
): Queue<PostEvent> {
    const oldEvents = new Array<PostEvent>(eventQueue.size);
    for (let i = 0; i < oldEvents.length; i += 1) {
        oldEvents[i] = eventQueue.pop()!;
    }
    const newEvents: PostEvent[] = [];
    for (const ev of oldEvents) {
        if (newEvents.find((e) => eventsAreSame(ev, e)) !== undefined) {
            continue;
        }
        newEvents.push(ev);
    }
    const ret = new Queue<PostEvent>();
    ret.multipush(newEvents);
    return ret;
}

export function createTileEvents(
    window: Window,
    desktops?: VirtualDesktop[],
    activities?: Activity[],
    output?: Output,
): TileWindowEvent[] | UntileWindowEvent[] {
    if (desktops === undefined) desktops = window.desktops;
    if (activities === undefined) activities = window.activities;
    if (output === undefined) output = window.output;
    const ret = [];
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
    return ret as any;
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
    const ret = [];
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
    return ret as any;
}
