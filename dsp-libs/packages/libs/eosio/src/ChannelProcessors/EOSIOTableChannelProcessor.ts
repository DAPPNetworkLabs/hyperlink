import { BaseChannelProcessor, DSPEvent, factory } from '@liquidapps/dsp-lib-base';
import {JsonRpc, Api} from 'eosjs'
export class EOSIOTableChannelProcessor extends BaseChannelProcessor {
    endpoint: any;
    rpc: JsonRpc;
    async start(): Promise<void> {
        this.endpoint = this._config.endpoint;
        if(!this.endpoint)
            throw new Error('missing config.endpoint');
        this.rpc = new JsonRpc(this.endpoint, { fetch });        

    }
   
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        const {index_position, table,scope, code} = this._config;
        for (let index = 0; index < eventData.length; index++) {
            const event = eventData[index].data;
            const {lower_bound, upper_bound} = event;
            const results = await this.rpc.get_table_rows({
                json: true,               // Get the response as json
                code,      // Contract that we target
                scope,         // Account that owns the data
                lower_bound,
                upper_bound,
                index_position,
                table,        // Table name
                limit: 50,                // Maximum number of rows that we want to get
                reverse: false,           // Optional: Get reversed data
                show_payer: false          // Optional: Show ram payer
            });
            event.rows = results.rows;
            event.more = results.more;
        }
        return eventData;
    }
}
factory.addProcessor('eosio-table-source',EOSIOTableChannelProcessor);