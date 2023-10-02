// callback.ts - A class for easy dispatching of various callbacks with global knowledge though the controller

import Controller from "controller";

abstract class CallbackManager
{
    ctrl: Controller;
    constructor(ctrl: Controller)
    {
        this.ctrl = ctrl;
    }
}

export class Common extends CallbackManager
{
    
}

export class Managed extends CallbackManager
{
    
}

export class Shortcuts extends CallbackManager
{
    
}
