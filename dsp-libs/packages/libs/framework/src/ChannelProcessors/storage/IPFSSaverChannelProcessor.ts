import { BaseChannelProcessor, DSPEvent, factory } from '@liquidapps/dsp-lib-base';
import { globalIpfsWrapper } from '../../IPFSRepo';

export class IPFSSaverChannelProcessor extends BaseChannelProcessor {
    async start(): Promise<void> {        
    }
    async saveString(content: string): Promise<string> {
        const results = globalIpfsWrapper.ipfs.add(content);
        for await (const { cid } of results) {
            return cid.toString();
        }
    }
    process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        return Promise.all(eventData.map(async (e)=>
            new DSPEvent(e.id,await this.saveString(e.data))
        ))
    }
}
factory.addProcessor('ipfs-save',IPFSSaverChannelProcessor);