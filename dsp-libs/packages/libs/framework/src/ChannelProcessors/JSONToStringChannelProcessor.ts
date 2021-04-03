import { DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
export class JSONToStringChannelProcessor extends BaseChannelProcessor {
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        return eventData.map(jsonEvent => 
             new DSPEvent(jsonEvent.id,jsonEvent.data)
             );
    }
}
import { factory } from "@liquidapps/dsp-lib-base";
factory.addProcessor('json-to-string', JSONToStringChannelProcessor);