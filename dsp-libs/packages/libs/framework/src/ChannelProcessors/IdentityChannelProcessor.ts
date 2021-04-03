import { DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
export class IdentityChannelProcessor extends BaseChannelProcessor {
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        return eventData.map(e =>                
                new DSPEvent(e.id,this._config.array ? [e.data]: e.data)
        );
    }
}
import { factory } from "@liquidapps/dsp-lib-base";


factory.addProcessor('identity', IdentityChannelProcessor );