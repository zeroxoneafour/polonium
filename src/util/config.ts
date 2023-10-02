// config.ts - Static config class

import Controller from "controller";

export default class GlobalConfig
{
    ctrl: Controller;
    debug: boolean;
    constructor(ctrl: Controller)
    {
        this.ctrl = ctrl;
        let readConfig = ctrl.kwinApi.readConfig;
        this.debug = readConfig("Debug", false);
    }
    
}
