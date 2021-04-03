import { BaseChannelProcessor, DSPEvent, factory, ConfigGenerator } from '@liquidapps/dsp-lib-base';
import {Serialize} from 'eosjs'

export class FCToJSONProcessor extends BaseChannelProcessor {
    _type: Serialize.Type;
    async start(): Promise<void> {
        const types =Serialize.getTypesFromAbi(Serialize.createInitialTypes(), this._config.abi);
        this._type = types.get('eventdata');
    }
   
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        const results = [];
        for (let index = 0; index < eventData.length; index++) {
            const e = eventData[index];
            const serialBuffer = new Serialize.SerialBuffer({
                textEncoder: new TextEncoder(),
                textDecoder: new TextDecoder(),
                array: Serialize.hexToUint8Array(e.data)
            });            
            const resJson = this._type.deserialize(serialBuffer)
             results.push(new DSPEvent(e.id,resJson));
        };
        return results;
    }
}
factory.addProcessor('fc-to-json',FCToJSONProcessor);