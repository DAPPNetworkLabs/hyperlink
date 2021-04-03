import { BaseChannelProcessor, DSPEvent, factory } from '@liquidapps/dsp-lib-base';
import * as ecc from 'eosjs-ecc'
const Web3 = require('web3');
const Base58 = require('base-58');

export class EthereumTransactionBuilderChannelProcessor extends BaseChannelProcessor {
    private _account: any;
    private _web3: any;
    private _ethPrivateKey: string;
    endpoint: string;
    async start(): Promise<void> {
        let web3 = new Web3();
        const _secret = await this.getSecret(this._config.secretName || 'default');
        let _wif = ecc.seedPrivate(_secret);
        let privateKey = Buffer.from(Base58.decode(_wif)).toString('hex').substring(2,66);
        this._ethPrivateKey = privateKey;
        this._account = web3.eth.accounts.wallets.add('0x' + privateKey);
        this._web3 = web3;
        this._state.address = this._account.address;
    }
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        for (let index = 0; index < eventData.length; index++) {
            const event = eventData[index];
            const sig = this._web3.eth.sign(event.data, this._ethPrivateKey);
            event.data.signature = sig;
        }
        return eventData;        
    }
}
factory.addProcessor('ethereum-txbuilder',EthereumTransactionBuilderChannelProcessor);