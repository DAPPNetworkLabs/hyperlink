import { BaseChannelProcessor, DSPEvent, factory } from '@liquidapps/dsp-lib-base';
const Web3 = require('web3');
export class EthereumSourceChannelProcessor extends BaseChannelProcessor {
    endpoint: string;
    web3; any;
    async start(): Promise<void> {
        this.endpoint = this._config.endpoint;
        if(!this.endpoint)
            throw new Error('missing config.endpoint');
        this.web3 = new Web3(this.endpoint);
    }
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        // read from eth
        const { abi, address, method } = this._config;
        const contractEth = new this.web3.eth.Contract(abi, address);
        for (let i = 0; i < eventData.length; i++) {
            const event = eventData[i].data;
            const { key } = event;
            try {
                const result = await contractEth.methods[method](key).call();
                event.result = result;
            } catch(e) {
                // ??
                console.error(e);
                //event.result = e.message;
                throw e;
            }
        }
        return eventData;
    }

}
factory.addProcessor('ethereum-source',EthereumSourceChannelProcessor);