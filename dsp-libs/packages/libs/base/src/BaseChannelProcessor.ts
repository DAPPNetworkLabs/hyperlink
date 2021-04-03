import { BaseDSPFacilities } from "./BaseDSPFacilities";
import { DSPEvent } from "./models/DSPEvent";

export abstract class BaseChannelProcessor  {

    finalize() {
    }
    protected _config: any;
    protected _dspFacilities: BaseDSPFacilities;
    public _channelId: string;
    public _state: any;
    public _chained = false;
    async init(channelId:string, dspFacilities:BaseDSPFacilities): Promise<void> {
        this._channelId = channelId;
        this._dspFacilities = dspFacilities;                
        if(!this._config)
            this._config =  await this._dspFacilities.getChannelConfig(this._channelId);
        const channelState = await this._dspFacilities.getChannelState(this._channelId);
        if(channelState)
            this._state = JSON.parse(JSON.stringify(channelState));
        else 
            this._state = channelState;

        if(this._state)
            await this.recover();
        else{
            await this.initNew();
        } 
        await this.stateChanged(this._state);
        await this.start();
        
        if(this._state && JSON.stringify(this._state) !== JSON.stringify(channelState)){
            await dspFacilities.setChannelState(this._channelId, this._state);
        }
        return;
    }
    async recover(): Promise<void>{
        // this._state.resumeTime = new Date().getTime();
        // return;
    }
    async start(): Promise<void>{
    }
    async initNew(): Promise<void>{
      
    }
    public processHook:any;
    public async processWithHook(eventData: DSPEvent[]): Promise<DSPEvent[]>{
        const channelState = JSON.stringify(this._state);
        let newState = await this._dspFacilities.getChannelState(this._channelId);        
        if(channelState !== JSON.stringify(newState)) {
            await this.stateChanged(newState);
        }
        let res = await this.process(eventData);
        if(this.processHook)
            res = await this.processHook(res);            
        return res;

    }
    protected getSecret(keyName:string){
        return this._dspFacilities.getSecretForChannel(this._channelId, keyName);
    }
    public async stateChanged(newState: any): Promise<void>{
        this._state = newState;
        return;
    }
    protected abstract process(eventData: DSPEvent[]): Promise<DSPEvent[]>;
}
