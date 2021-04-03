import { BaseChannelProcessor, DSPEvent, factory, ConfigGenerator } from '@liquidapps/dsp-lib-base';
import {Serialize} from 'eosjs'

export class JSONToFCProcessor extends BaseChannelProcessor {
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
            });            
            this._type.serialize(serialBuffer, e.data, null, true);
            results.push(new DSPEvent(e.id,serialBuffer.array));
        };
        return results;
    }
}
factory.addProcessor('json-to-fc',JSONToFCProcessor);