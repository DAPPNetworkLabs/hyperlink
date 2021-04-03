import { DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
export class CronChannelProcessor extends BaseChannelProcessor {
    timer: any;
    _inExecution: boolean;
    async finalize(): Promise<void> {
        clearInterval(this.timer);
    }    
    
    async initNew(): Promise<void>{
        await super.initNew();
        this._state = {startTime: new Date().getTime()};
    }
    async start(): Promise<void> {
        this._state.resumeTime = new Date().getTime();
        this._state.counter = 0;
                    // cancel interval
        const a= this;
        a._inExecution = false;
        this.timer = setInterval(async ()=>{
            if(a._inExecution)
                return;
            a._inExecution = true;
            try{
            await a.processWithHook([new DSPEvent((this._state.counter++).toString(),
                {
                    ts: new Date().getTime()
                })]);
            }
            catch(e){
                a._dspFacilities.log("ERROR",{
                    ltype:"CronChannelProcessor.TimerError",
                    message:"error in scheduled process" + e
                })
            }
            a._inExecution = false;
        }, this._config.interval ? this._config.interval * 1000 : 1000);
    }
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {        
        return eventData;
    }
}
import { factory } from "@liquidapps/dsp-lib-base";


factory.addProcessor('cron-source', CronChannelProcessor );