import { DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
import { ForkableFSHandler } from "../IPFSRepo";

export abstract class FSBackedChannelProcessor extends BaseChannelProcessor  {
    fs: ForkableFSHandler;
    async stateChanged(state){
        await super.stateChanged(state);
        this.fs = new ForkableFSHandler(this._channelId,this._state.fshash);
    }
    async start(): Promise<void>{        
        await this.innerStart();
        // if(!this._state.fshash)
        //     await this.fs.write('/config.txt', JSON.stringify(this._config), { create:true });
        this._state.fshash = await this.fs.flush();        

    }
     
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]>{
        const res = await this.innerProcess(eventData);
        this._state.fshash = await this.fs.flush();
        return res;
    };
    protected abstract async innerProcess(eventData: DSPEvent[]): Promise<DSPEvent[]>;
    protected abstract async innerStart(): Promise<void>;
}