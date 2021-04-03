import { DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
export class ConstProcessor extends BaseChannelProcessor {
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        return eventData.map(e =>                
                new DSPEvent(e.id,this._config.const)
        );
    }
}
import { factory } from "@liquidapps/dsp-lib-base";


factory.addProcessor('const', ConstProcessor );