import { factory, DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
import { PipelineDSPFacilities } from "./PipelineDSPFacilities";

export class ParallelChannelProcessor extends BaseChannelProcessor {
    private _list: BaseChannelProcessor[] = [];       
    _pipelineDSPFacilities: PipelineDSPFacilities;
    configMap: any;
    async initNew(){
        this._state = {
        }
    }
    async finalize(){
        return Promise.all(this._list.map(a=>a.finalize()));
    }
    async start(): Promise<void>{
        this.configMap = {};
        this._pipelineDSPFacilities = new PipelineDSPFacilities(this._channelId, this._dspFacilities, this._state, this.configMap);
        for (let index = 0; index < this._config.processors.length; index++) {
            const config = this._config.processors[index];
            this.configMap[`${this._channelId}_${index.toString()}`] = config;
            const processor = await factory.getChannelProcessor(config);
            await processor.init(`${this._channelId}_${index.toString()}`, this._pipelineDSPFacilities);
            this._list.push(processor);
        }
        this._state = this._pipelineDSPFacilities._state;
    }
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {        
        this._pipelineDSPFacilities = new PipelineDSPFacilities(this._channelId, this._dspFacilities, this._state,this.configMap);

        const promises = this._list.map(async (processor,index)=>{
            const res = await processor.processWithHook(eventData);
            return res;
        });
        const resultsSet = await Promise.all(promises);
        const result = [];
        for (let index = 0; index < resultsSet.length; index++) {
            const resultsFromProcessor = resultsSet[index];
            for (let index2 = 0; index2 < resultsFromProcessor.length; index2++) {
                const resultFromProcessor = resultsFromProcessor[index2];
                result.push(new DSPEvent(
                    `${resultFromProcessor.id}.${index}`,
                    resultFromProcessor.data
                ));
            }            
        }
        this._state = this._pipelineDSPFacilities._state;
        return result;
    }
    public async stateChanged(newState: any): Promise<void>{
        await super.stateChanged(newState);
        if(this._pipelineDSPFacilities){
            this._pipelineDSPFacilities._state = this._state;
            for (let index = 0; index < this._list.length; index++) {
                const element = this._list[index];
                await element.stateChanged(await this._pipelineDSPFacilities.getChannelState(element._channelId));;
            }
        }
        
    }
}


factory.addProcessor('parallel', ParallelChannelProcessor);