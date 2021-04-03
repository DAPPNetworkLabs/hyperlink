import { BaseChannelProcessor, DSPEvent, factory, ConfigGenerator } from '@liquidapps/dsp-lib-base';
import * as ecc from 'eosjs-ecc'


export class EOSIOSignerProcessor extends BaseChannelProcessor {
    private _wif: any;
    publicKey: any;
    async start(): Promise<void> {
        const _secret = await this.getSecret(this._config.secretName || 'default');
        this._wif = ecc.seedPrivate(_secret);
        this.publicKey = ecc.privateToPublic(this._wif);
        this._state.publicKey = this.publicKey;
    }
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {        
        for (let index = 0; index < eventData.length; index++) {
            const event = eventData[index];
            const sig = ecc.signHash(event.data,this._wif, 'hex');
            event.data.signature = sig;
        }
        return eventData;        
    }
}

factory.addProcessor('eosio-sign',EOSIOSignerProcessor);