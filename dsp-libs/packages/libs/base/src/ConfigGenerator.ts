import { DSPConfig } from "./models/DSPConfig";
import * as yaml  from 'js-yaml';

export abstract class ConfigGenerator {
    async getConfig(){
        const config = new DSPConfig();        
        config.heartbeatInterval = 5;
        config.params = await this.getParams();
                
        config.meta = {};
        if(config.params['m']){
            const configParts = await Promise.all(config.params['m'].map(async file=>{
                const res1 = await fetch(file);
                const doc = yaml.safeLoad(await res1.text(), 'utf8');
                return doc;
            }));
            configParts.forEach( (part:any)=> {
                config.params = {...part,...config.params};
            })
        }
        if(config.params['c']){
            const configParts = await Promise.all(config.params['c'].map(async file=>{
                const res1 = await fetch(file);
                const doc = yaml.safeLoad(await res1.text(), 'utf8');
                return doc;                
            }));
            configParts.forEach( (part:any)=> {
                config.meta = {...config.meta, ...part};
            })
        }        
        if(config.params['ui']){            
            config.meta.uiParts = await Promise.all(config.params['ui'].map(async file=>{
                const res1 = await fetch(file);                
                return await res1.text();
            }));
        }
        if(config.params['p']){
            config.predefinedChannels = [];
            const predefinedGroups = await Promise.all(config.params['p'].map(async g=>{
                const res1 = await fetch(g);
                const doc = yaml.safeLoadAll (await res1.text(), 'utf8');

                return doc;
            }));    
            predefinedGroups.forEach((g:any[])=>{
                g.forEach(channel => {
                    config.predefinedChannels.push(channel);
                }); 
            })
        }
        
        return config
    }
    abstract getParams(): Promise<any> ;
}