import { BaseChannelProcessor, DSPEvent, factory, ConfigGenerator } from '@liquidapps/dsp-lib-base';
import * as ecc from 'eosjs-ecc'
import {JsonRpc, Api,Serialize} from 'eosjs'
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');      // development only


export class EOSIOTransactionPusherProcessor extends BaseChannelProcessor {
    private _wif: any;
    publicKey: any;
    rpc: any;
    private api: any;
    endpoint: string;
    async start(): Promise<void> {
        const _secret = await this.getSecret(this._config.secretName || 'default');
        this._wif = ecc.seedPrivate(_secret);
        this.publicKey = ecc.privateToPublic(this._wif);
        this._state.publicKey = this.publicKey;
        this.endpoint = this._config.endpoint;
        if(!this.endpoint)
            throw new Error('mispsing config.endoint');
        this.rpc = new JsonRpc(this.endpoint, { fetch });
        const signatureProvider = new JsSignatureProvider([this._wif]);
        this.api = new Api({ rpc:this.rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() }); //required to submit transactions        
    }
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {        
        for (let index = 0; index < eventData.length; index++) {
            const event = eventData[index];
            const {
                ref_block_prefix,
                expiration,
                ref_block_num,
                actions
            } = event.data;
            let res = await this.api.transact({
                    // ref_block_prefix,
                    // expiration,
                    // ref_block_num,
                    actions
                },{
                    sign: !this._config.skipSign,
                    broadcast: this._config.broadcast,
                    blocksBehind: this._config.blocksBehind || 10,
                    expireSeconds: this._config.expireSeconds || 30,
                });
            if(this._config.broadcast){
                event.data.result = res;
            }
            else{
                const {signatures, serializedTransaction} = res;
                event.data.signatures = signatures;
                event.data.serializedTransaction = Serialize.arrayToHex(serializedTransaction);
            }
        }
        return eventData;        
    }
}

factory.addProcessor('eosio-push',EOSIOTransactionPusherProcessor);