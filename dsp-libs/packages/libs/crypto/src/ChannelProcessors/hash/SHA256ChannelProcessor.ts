import { BaseChannelProcessor, DSPEvent, factory } from '@liquidapps/dsp-lib-base';
const sha256 = require('sha256');
import { Buffer } from "buffer";

export class SHA256ChannelProcessor extends BaseChannelProcessor {
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        return eventData.map(a=>
            new DSPEvent(a.id, sha256(Buffer.from(a.data,'hex')).toString('hex'))
        );

    }
}
factory.addProcessor('sha256',SHA256ChannelProcessor);