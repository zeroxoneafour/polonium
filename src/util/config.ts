// config.ts - Static config class

import { api } from "util/global";

export default class GlobalConfig
{
    static debug: boolean;
    static init()
    {
        let readConfig = api.readConfig;
        this.debug = readConfig("Debug", false);
    }
    
}

export class EngineConfig
{
    constructor(desktop?: string)
    {
        GlobalConfig.debug;
    }
}
