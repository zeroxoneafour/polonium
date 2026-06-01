import { Output, Tile, VirtualDesktop, Window } from "kwin-api";
import { Direction } from "../util/geometry";
import { TilingEngineType } from "../engine";
import { Queue } from "../util/queue";
import { desktopId } from ".";

// normal events - run before build
interface TileWindowEvent {
    t: "tileWindow";
    window: Window;
    desktops: VirtualDesktop[];
    output: Output;
}
interface UntileWindowEvent {
    t: "untileWindow";
    window: Window;
    desktops: VirtualDesktop[];
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
    output: Output;
    tile: Tile;
    direction?: Direction;
}
interface UpdateTilesEvent {
    t: "updateTiles";
    desktop: VirtualDesktop;
    output: Output;
}
interface ChangeEngineEvent {
    t: "changeEngine";
    desktop: VirtualDesktop;
    output: Output;
    engineType?: TilingEngineType;
    engineSettings?: object;
}

// post events - these events run after build
interface SetWindowPropertiesEvent {
    t: "setWindowProperties";
    window: Window;
    fullscreen?: boolean;
    noBorder?: boolean;
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
    | SetWindowPropertiesEvent;

export type PostEvent = SetWindowPropertiesEvent;

// check if two events operate on the same widnow, desktops, and output
// ev1 must be a tileWindow event and ev2 must be an untileWindow event
function eventsAreParallel(
    ev1: TileWindowEvent,
    ev2: UntileWindowEvent,
): boolean {
    if (ev1.window !== ev2.window) return false;
    if (ev1.output !== ev2.output) return false;
    if (ev1.desktops.length !== ev2.desktops.length) return false;
    for (let i = 0; i < ev1.desktops.length; i++) {
        if (ev1.desktops[i] !== ev2.desktops[i]) return false;
    }
    return true;
}

export function simplifyEvents(eventQueue: Queue<Event>): Queue<Event> {
    // ultra simple simplifier - only cut out events that directly cancel each other out
    // also simplifies duplicate events for updateTiles as this typically generates mass duplicates
    // todo in future - simplify events on a per-desktop, per-output basis
    const events = new Array<Event>(eventQueue.size);
    for (let i = 0; i < events.length; i += 1) {
        events[i] = eventQueue.pop()!;
    }
    const eventsRet = [...events];
    const updateTilesEventSet = new Set<string>();
    for (const ev of events) {
        switch (ev.t) {
            case "tileWindow":
                const parallelEvent = events.find(
                    (e) => e.t === "untileWindow" && eventsAreParallel(ev, e),
                );
                if (parallelEvent === undefined) break;
                eventsRet.splice(eventsRet.indexOf(parallelEvent), 1);
                eventsRet.splice(eventsRet.indexOf(ev), 1);
                break;
            case "updateTiles":
                const id = desktopId(ev.output, ev.desktop);
                if (updateTilesEventSet.has(id)) {
                    eventsRet.splice(eventsRet.indexOf(ev), 1);
                } else {
                    updateTilesEventSet.add(id);
                }
            default:
                break;
        }
    }
    const ret = new Queue<Event>();
    ret.multipush(eventsRet);
    return ret;
}

export function simplifyPostEvents(
    eventQueue: Queue<PostEvent>,
): Queue<PostEvent> {
    return eventQueue;
}
