import { DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
export function executeJSONQuery(jsonObject:any, path:String){
    const parts = path.split('.');
    let current = jsonObject;
    for (let index = 0; index < parts.length; index++) {
        if(current === null || current === undefined)
            return current;
        const part = parts[index];
        current = current[part];
    }
    return current;
}
export class JSONMapperChannelProcessor  extends BaseChannelProcessor {
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        return eventData.map(jsonEvent => 
             new DSPEvent(jsonEvent.id, executeJSONQuery(jsonEvent.data, this._config.path)));        
    }
}
import { factory } from "@liquidapps/dsp-lib-base";
factory.addProcessor('json-map', JSONMapperChannelProcessor );
