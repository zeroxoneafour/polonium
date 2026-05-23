import { Output, VirtualDesktop, Window } from "kwin-api";
import { queueEvent } from "..";

const excludeClasses = [
    "krunner",
    "yakuake",
    "kded",
    "polkit",
    "plasmashell",
];

export class WindowHandler {
    window: Window;
    previousDesktops: VirtualDesktop[];
    previousOutput: Output;
    tiled: boolean;
    
    constructor(window: Window) {
        this.window = window;
        this.previousDesktops = [...window.desktops];
        this.previousOutput = window.output;
        this.tiled = !(
            excludeClasses.includes(window.resourceClass.toLowerCase())
            || window.fullScreen
            || window.specialWindow
        );

        this.window.desktopsChanged.connect(this.desktopsChanged.bind(this));
        this.window.outputChanged.connect(this.outputChanged.bind(this));
    }

    outputChanged() {
        const previousOutput = this.previousOutput;
        this.previousOutput = this.window.output;
        if (!this.tiled) return;

        queueEvent({
            t: "untileWindow",
            window: this.window,
            desktops: this.previousDesktops,
            output: previousOutput
        });
        queueEvent({
            t: "tileWindow",
            window: this.window,
            desktops: this.window.desktops,
            output: this.window.output
        });
    }

    desktopsChanged() {
        const previousDesktops = [...this.previousDesktops];
        this.previousDesktops = [...this.window.desktops];
        if (!this.tiled) return;

        const desktopsToTile = [];
        const desktopsToUntile = [];
        for (const desktop of this.window.desktops) {
            if (!previousDesktops.includes(desktop)) {
                desktopsToTile.push(desktop);
            }
        }
        for (const desktop of previousDesktops) {
            if (!this.window.desktops.includes(desktop)) {
                desktopsToUntile.push(desktop);
            }
        }

        if (desktopsToUntile.length > 0) {
            queueEvent({
                t: "untileWindow",
                window: this.window,
                desktops: desktopsToUntile,
                output: this.window.output
            });
        }
        if (desktopsToTile.length > 0) {
            queueEvent({
                t: "tileWindow",
                window: this.window,
                desktops: desktopsToTile,
                output: this.window.output
            });
        }
    }
}