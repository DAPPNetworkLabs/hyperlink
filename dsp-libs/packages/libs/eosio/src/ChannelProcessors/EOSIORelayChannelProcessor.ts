import { BaseChannelProcessor, DSPEvent, factory } from '@liquidapps/dsp-lib-base';
import {JsonRpc, Serialize} from 'eosjs'

export class EOSIORelayChannelProcessor extends BaseChannelProcessor {
    endpoint: any;
    rpc: JsonRpc;
    async start(): Promise<void> {
        this.endpoint = this._config.endpoint;
        if(!this.endpoint)
            throw new Error('missing config.endpoint');
        this.rpc = new JsonRpc(this.endpoint, { fetch });
    }
   
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        for (let index = 0; index < eventData.length; index++) {
            const e = eventData[index];
            
            e.data.result = await this.rpc.push_transaction({
                signatures: e.data.signatures,
                serializedTransaction: Serialize.hexToUint8Array(e.data.serializedTransaction),
            });
        };
        return eventData;
    }
}
factory.addProcessor('eosio-relay',EOSIORelayChannelProcessor);