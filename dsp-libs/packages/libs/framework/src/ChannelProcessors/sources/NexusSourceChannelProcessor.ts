import { DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
export class NexusSourceChannelProcessor extends BaseChannelProcessor {
    timer: any;
    async finalize(): Promise<void> {
        
    }    
    async initNew(): Promise<void>{
        await super.initNew();
        this._state = {startTime: new Date().getTime()};
        this._state.counter = 0;        

    }
    async start(): Promise<void> {
        
        this._state.resumeTime = new Date().getTime();
        const a= this;
        this._dspFacilities.onEventSubmit.subscribe((sender, {
            ts,state,channelId,event})=>{
                if(a._config.channelId && channelId != a._config.channelId)
                    return;
                if(event.data.sourceChannelId == a._channelId)
                    return;
                a.processWithHook([new DSPEvent(
                    event.id,
                {
                    ts: ts,
                    processorChannelId: a._channelId,
                    channelId,
                    state: state,
                    eventNum: this._state.counter++,
                    data: event.data
                })]);
        })
    }
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        return eventData;
    }
}
import { factory } from "@liquidapps/dsp-lib-base";
factory.addProcessor('nexus-channel', NexusSourceChannelProcessor );