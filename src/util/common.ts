// common.ts - Common classes that need to be initialized by the controller

import Controller from "controller";

export interface Desktop
{
    screen: number;
    activity: string;
    desktop: number;
}

class ImplDesktop
{
    screen: number;
    activity: string;
    desktop: number;
    toString(): string
    {
        return "(" + this.screen + ", " + this.activity + ", " + this.desktop + ")";
    }
    constructor(screen: number, activity: string, desktop: number)
    {
        this.screen = screen;
        this.activity = activity;
        this.desktop = desktop;
    }
}

export class EngineConfig
{
    
}

export class AbstractFactory
{
    ctrl: Controller;
    
    constructor(ctrl: Controller)
    {
        this.ctrl = ctrl;
    }
    
    newDesktop(d?: Desktop): ImplDesktop
    {
        if (d !== undefined)
        {
            return new ImplDesktop(d.screen, d.activity, d.desktop);
        }
        let workspace = this.ctrl.workspace;
        return new ImplDesktop(workspace.activeScreen, workspace.currentActivity, workspace.currentDesktop);
    }
}
