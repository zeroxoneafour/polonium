// config.ts - Static config class

import { KwinApi } from "common";

class ConfigClass
{
    debug: boolean;
    constructor()
    {
        let readConfig = KwinApi.readConfig;
        this.debug = readConfig("Debug", false);
    }
}

export class ConfigCreator
{
    static config: ConfigClass;
    static init()
    {
        this.config = new ConfigClass();
    }
}

const Config = ConfigCreator.config;
export default Config;
