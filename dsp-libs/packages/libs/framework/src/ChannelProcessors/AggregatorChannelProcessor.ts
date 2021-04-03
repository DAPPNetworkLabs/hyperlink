import { DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
export class AggregatorChannelProcessor extends BaseChannelProcessor {
    async initNew(){
        this._state = {
            counter:0
        }
    }
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        return [new DSPEvent((this._state.counter++).toString(),eventData.map(e => e.data))];
    }
}
import { factory } from "@liquidapps/dsp-lib-base";


factory.addProcessor('aggregate', AggregatorChannelProcessor );