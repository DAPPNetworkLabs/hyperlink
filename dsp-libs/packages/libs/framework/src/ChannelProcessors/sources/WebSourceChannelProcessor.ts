import { BaseChannelProcessor, DSPEvent, factory } from '@liquidapps/dsp-lib-base';
import { executeJSONQuery } from '../JSONMapperChannelProcessor';

export class WebSourceChannelProcessor extends BaseChannelProcessor {
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        const results = [];

            for (let index = 0; index < eventData.length; index++) {
                const urlEvent = eventData[index];
                let url = '';
                if(this._config.url)
                    url = this._config.url;
                else if(this._config.path){
                    url = executeJSONQuery(urlEvent.data, this._config.path);       
                }
                else{
                    url = urlEvent.data;
                }
                const res1 = await fetch(url);
                const eventText1 = await res1.text();                
                results.push(new DSPEvent(urlEvent.id,eventText1));                
            }
        return results;
    }   
}
factory.addProcessor('web-source',WebSourceChannelProcessor);