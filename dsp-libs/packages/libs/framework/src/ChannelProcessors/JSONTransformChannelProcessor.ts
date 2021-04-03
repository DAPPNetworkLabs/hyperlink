import { DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
// const exampleConfig = {
//     processor:"json-transform",
//     transformView: {
//             'someElement':{
//                 processor:"json-map",
//                 path: 'somePath.path'
//             }
//     }
// }

export class JSONTransformChannelProcessor  extends BaseChannelProcessor {
    private _list = {};       
    _pipelineDSPFacilities: PipelineDSPFacilities;
    _view: any;
    configMap: any;
    async initNew(){
        this._state = {
        }
    }
    async finalize(){
        return Promise.all(Object.keys(this._list).map(a=>this._list[a].finalize()));
    }
    async start(): Promise<void>{

        this._view = this._config.transformView;
        this.configMap = {};
        this._pipelineDSPFacilities = new PipelineDSPFacilities(this._channelId, this._dspFacilities, this._state, this.configMap);
        
        const processorsKeys = Object.keys(this._view);
        for (let index = 0; index < processorsKeys.length; index++) {
            const processorsKey = processorsKeys[index];
            const config = this._view[processorsKey];
            this.configMap[`${this._channelId}_${processorsKey}`] = config;
            const processor = await factory.getChannelProcessor(config);
            await processor.init(`${this._channelId}_${processorsKey.toString()}`, this._pipelineDSPFacilities);
            this._list[processorsKey] = processor;
        }
        this._state = this._pipelineDSPFacilities._state;
    }
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {        
        this._pipelineDSPFacilities = new PipelineDSPFacilities(this._channelId, this._dspFacilities, this._state, this.configMap);
        const processorsKeys = Object.keys(this._view);
        const result = [];
        for (let index = 0; index < eventData.length; index++) {
            const event = eventData[index];
            const newData = {};
            for (let index2 = 0; index2 < processorsKeys.length; index2++) {
                const key =processorsKeys[index2];
                const processor = this._list[key];
                const res = await processor.processWithHook([event]);
                if(res.length)
                    newData[key] = res[0].data;
            }            
            result.push(new DSPEvent(event.id, newData));
        }
        this._state = this._pipelineDSPFacilities._state;
        return result;
    }
    public async stateChanged(newState: any): Promise<void>{
        await super.stateChanged(newState);
        if(this._pipelineDSPFacilities){
            this._pipelineDSPFacilities._state = this._state;
            const processorsKeys = Object.keys(this._view);
            for (let index = 0; index < processorsKeys.length; index++) {
                const element = this._list[index];
                await element.stateChanged(await this._pipelineDSPFacilities.getChannelState(element._channelId));;
            }        
        }
    }
}
import { factory } from "@liquidapps/dsp-lib-base";
import { PipelineDSPFacilities } from "./PipelineDSPFacilities";
factory.addProcessor('json-transform', JSONTransformChannelProcessor );