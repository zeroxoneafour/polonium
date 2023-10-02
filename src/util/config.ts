// config.ts - Static config class

import { kwinApi } from "global";

class Config
{
    debug: boolean;
    constructor()
    {
        let readConfig = kwinApi.readConfig;
        this.debug = readConfig("Debug", false);
    }
}

export class ConfigCreator
{
    static 
}

export default 