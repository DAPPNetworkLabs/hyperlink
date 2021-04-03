import { BaseChannelProcessor } from "./BaseChannelProcessor";
class ChannelProcessorFactory{
    private predefinedClasses = {}
    async getChannelProcessor(config: any): Promise<BaseChannelProcessor> {
        if(config.processor === undefined)
            throw new Error('no processor field in config');
        const cls = this.predefinedClasses[config.processor];
        if(!cls)
            throw new Error(`unknown processor (${config.processor})`);
        return new cls();        
    }
    addProcessor(key:string,processor:any){
        this.predefinedClasses[key] = processor;
    }
}
const factory = new ChannelProcessorFactory();
export {factory};