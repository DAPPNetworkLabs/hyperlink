import { factory, DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
import * as yaml  from 'js-yaml';
import { PipelineDSPFacilities } from "./PipelineDSPFacilities";

export class IPFSConfigChannelProcessor extends BaseChannelProcessor {
    private _innerProcessor: BaseChannelProcessor ;           
    _innerConfig: any;
    _pipelineDSPFacilities: PipelineDSPFacilities;
    configMap: {} = {};
    async start(): Promise<void>{
        this._pipelineDSPFacilities = new PipelineDSPFacilities(this._channelId, this._dspFacilities, this._state,this.configMap);
        this._innerConfig = JSON.parse(JSON.stringify(this._config));
        this._innerConfig.processor = undefined;
        this._innerConfig.configParts = undefined;
        for (let index = 0; index < this._config.configParts.length; index++) {
            const configPart = this._config.configParts[index];            
            const data = await fetch(configPart);
            const doc = yaml.safeLoad(await data.text(), 'utf8');

            this._innerConfig = {...this._innerConfig, ...doc};
            
        }
        this.configMap[`${this._channelId}_0`] = this._innerConfig;

        const processor = await factory.getChannelProcessor(this._innerConfig);        
        await processor.init(`${this._channelId}_0`, this._pipelineDSPFacilities);
        this._innerProcessor = processor;
        this._innerProcessor.processHook = this.processHook;
        this._state = this._innerProcessor._state;
    }
    public async stateChanged(newState: any): Promise<void>{
        await super.stateChanged(newState);
        if(this._pipelineDSPFacilities){
            this._pipelineDSPFacilities._state = this._state;
            await this._innerProcessor.stateChanged(await this._pipelineDSPFacilities.getChannelState(this._innerProcessor._channelId));
        }
    }
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        return this._innerProcessor.processWithHook(eventData);
    }
}
factory.addProcessor('ipfs', IPFSConfigChannelProcessor);