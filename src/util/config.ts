// config.ts - Static config class

import { EngineType } from "../engines";
import { Controller } from "../controller";
import { Api } from "../extern/kwin";

class ConfigClass
{
    private static instance: ConfigClass;
    static init(c: Controller)
    {
        this.instance = new ConfigClass(c);
    }
    static get Instance()
    {
        return this.instance;
    }
    private readConfigFn: Api["readConfig"];
    private constructor(c: Controller)
    {
        this.readConfigFn = c.kwinApi.readConfig;
        this.readConfig();
    }
    
    readConfig()
    {
        let rc = this.readConfigFn;
        this.debug = rc("Debug", false);
        this.engineType = rc("EngineType", EngineType.BTree);        
    }
    
    debug: boolean = false;
    engineType: EngineType = EngineType.BTree;
}

const Config = ConfigClass.Instance;
export default Config;

export function init(c: Controller)
{
    ConfigClass.init(c);
}
