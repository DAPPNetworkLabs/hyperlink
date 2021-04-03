import { DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
export class JSONArrayUnwrapChannelProcessor extends BaseChannelProcessor {   
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        const results = [];
        const a = this;
        eventData.forEach(jsonEvent => {
            jsonEvent.data.forEach((element, idx) => {
                if(this._config.idKey)
                    results.push( new DSPEvent(element[this._config.idKey],element));
                else
                    results.push( new DSPEvent(`${this._channelId}.${idx}`,element));
                
            });
        });
        return results;
    }
}
import { factory } from "@liquidapps/dsp-lib-base";

factory.addProcessor('json-array-unwrap', JSONArrayUnwrapChannelProcessor );