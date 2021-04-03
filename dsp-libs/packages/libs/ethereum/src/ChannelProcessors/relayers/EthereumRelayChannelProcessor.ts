import { BaseChannelProcessor, DSPEvent, factory } from '@liquidapps/dsp-lib-base';
const Web3 = require('web3');
export class EthereumRelayChannelProcessor extends BaseChannelProcessor {
    endpoint: string;
    web3; any;
    async start(): Promise<void> {
        this.endpoint = this._config.endpoint;
        if(!this.endpoint)
            throw new Error('missing config.endpoint');
        this.web3 = new Web3(this.endpoint);
    }
   
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        for (let index = 0; index < eventData.length; index++) {
            const e = eventData[index];
            
            e.data.result = await this.web3.eth.sendSignedTransaction(e.data.signature);
        };
        return eventData;
    }
}
factory.addProcessor('ethereum-relay',EthereumRelayChannelProcessor);