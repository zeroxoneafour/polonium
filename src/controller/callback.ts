// callback.ts - A class for easy dispatching of various callbacks with global knowledge though the controller

import Controller from "controller";
import { Desktop } from "util/common";

abstract class CallbackManager
{
    ctrl: Controller;
    constructor(ctrl: Controller)
    {
        this.ctrl = ctrl;
    }
}

export class WindowCallbacks extends CallbackManager
{
}
