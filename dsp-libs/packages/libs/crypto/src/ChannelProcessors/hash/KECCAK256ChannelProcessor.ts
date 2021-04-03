import { BaseChannelProcessor, DSPEvent, factory } from '@liquidapps/dsp-lib-base';
const keccak256 = require('keccak256');
import { Buffer } from "buffer";

export class KECCAK256ChannelProcessor extends BaseChannelProcessor {
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        return eventData.map(a=> new DSPEvent(a.id,keccak256(Buffer.from(a.data,'hex')).toString('hex')));
    }
}

factory.addProcessor('keccak256',KECCAK256ChannelProcessor);