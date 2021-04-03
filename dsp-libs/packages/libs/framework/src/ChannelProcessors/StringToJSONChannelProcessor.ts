import { DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
export class StringToJSONChannelProcessor extends BaseChannelProcessor {
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        return eventData.map(jsonEvent => 
             new DSPEvent(jsonEvent.id,JSON.parse(jsonEvent.data))
            );
    }
}
import { factory } from "@liquidapps/dsp-lib-base";
factory.addProcessor('string-to-json', StringToJSONChannelProcessor);