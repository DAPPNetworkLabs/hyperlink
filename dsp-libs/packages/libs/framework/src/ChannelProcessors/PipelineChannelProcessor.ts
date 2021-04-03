import { factory, DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
import { PipelineDSPFacilities } from "./PipelineDSPFacilities";

export class PipelineChannelProcessor extends BaseChannelProcessor {
    private _chain: BaseChannelProcessor[] = [];       
    _pipelineDSPFacilities: PipelineDSPFacilities;
    configMap: {} = {};
    async initNew(){
        this._state = {            
        }
    }
    async finalize(){
        return Promise.all(this._chain.map(a=>a.finalize()));
    }
    async start(): Promise<void>{    
        this._pipelineDSPFacilities = new PipelineDSPFacilities(this._channelId, this._dspFacilities, this._state,this.configMap);    
        for (let index = 0; index < this._config.processors.length; index++) {
            const config = this._config.processors[index];            
            this.configMap[`${this._channelId}_${index.toString()}`] = config;
            const processor = await factory.getChannelProcessor(config);
            processor._chained = true;
            const index2 = index;
            
            const a = this;
                processor.processHook = async (events:DSPEvent[])=>{                    
                    let res:any;
                    if(index2 < this._config.processors.length-1){
                        // not last
                        if(!a._chain[index2+1])
                            res= events;
                        else res = await a._chain[index2+1].processWithHook(events);
                    }
                    else if(!this._chained && a.processHook){
                        res= await a.processHook(events);
                    }
                    else res= events;
                    this._state = this._pipelineDSPFacilities._state;
                    return res;
                }
            await processor.init(`${this._channelId}_${index.toString()}`, this._pipelineDSPFacilities);
            this._chain.push(processor);
        }
        this._state = this._pipelineDSPFacilities._state;
    }
    public async stateChanged(newState: any): Promise<void>{
        await super.stateChanged(newState);
        if(this._pipelineDSPFacilities){
            this._pipelineDSPFacilities._state = this._state;
            for (let index = 0; index < this._chain.length; index++) {
                const element = this._chain[index];
                await element.stateChanged(await this._pipelineDSPFacilities.getChannelState(element._channelId));;
            }
        }
    }

    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        let res: any;
        if(!this._chained)
            res =  await this._chain[0].processWithHook(eventData);
        else
            res = [];
        this._state = this._pipelineDSPFacilities._state;
        return res;
    }
}


factory.addProcessor('pipeline', PipelineChannelProcessor);