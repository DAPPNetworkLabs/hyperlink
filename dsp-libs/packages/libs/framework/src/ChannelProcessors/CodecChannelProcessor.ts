import { DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
import { Buffer } from "buffer";

export class CodecChannelProcessor extends BaseChannelProcessor {
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        return eventData.map(e => 
            new DSPEvent(
                e.id,
                Buffer.from(e.data, this._config.inputEncoding).toString(this._config.outputEncoding)
            )
);
    }
}
import { factory } from "@liquidapps/dsp-lib-base";


factory.addProcessor('encode-decode', CodecChannelProcessor );