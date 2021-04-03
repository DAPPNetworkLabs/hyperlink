import { DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
import { executeJSONQuery } from "./JSONMapperChannelProcessor";
import { factory } from "@liquidapps/dsp-lib-base";

export class StringConcatChannelProcessor  extends BaseChannelProcessor {
    _paths: any[];
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        return eventData.map(jsonEvent => 
            new DSPEvent(
                jsonEvent.id,
                this._config.paths.map(
                    path=>executeJSONQuery(jsonEvent.data, path)).join('')));
    }
}
factory.addProcessor('concat', StringConcatChannelProcessor );
