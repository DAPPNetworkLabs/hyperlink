import { BaseChannelProcessor, DSPEvent, factory } from '@liquidapps/dsp-lib-base';
import { globalIpfsWrapper } from '../../IPFSRepo';

export class IPFSLoaderChannelProcessor extends BaseChannelProcessor {
    async start(): Promise<void> {
    
    }
    
    async loadString(hash: string): Promise<string> {
        const stream = globalIpfsWrapper.ipfs.cat(hash);
        let data = '';
        for await (const chunk of stream) {
            data += chunk.toString();
        }
        return data;
    }
    process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        return Promise.all(eventData.map(async e=>{
            return new DSPEvent(e.id,await this.loadString(e.data));
        }))
    }
}
factory.addProcessor('ipfs-load',IPFSLoaderChannelProcessor);