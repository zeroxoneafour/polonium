import { Output, VirtualDesktop, Window } from "kwin-api";

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

type Event = TileWindowEvent | UntileWindowEvent | UpdateDriversEvent | RebuildDesktopsEvent;
export default Event;