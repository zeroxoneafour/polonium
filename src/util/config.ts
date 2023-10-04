// config.ts - Static config class

import { KwinApi } from "../common";
import { EngineType } from "../engines";

class ConfigClass
{
    private static instance: ConfigClass | null = null;
    static get Instance()
    {
        if (this.instance == null)
        {
            this.instance = new ConfigClass();
        }
        return this.instance;
    }
    private constructor()
    {
        let readConfig = KwinApi.readConfig;
        this.debug = readConfig("Debug", false);
        this.engineType = readConfig("EngineType", EngineType.BTree);
    }
    
    debug: boolean;
    engineType: EngineType;
}

const Config = ConfigClass.Instance;
export default Config;
