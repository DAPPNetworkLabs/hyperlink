import { DSPEvent, DSPChannel, DSPConfig, BaseDSPFacilities } from "@liquidapps/dsp-lib-base";

export class PipelineDSPFacilities extends BaseDSPFacilities {
    _dspFacilities: BaseDSPFacilities;
    _channelId: string;
    _state: any;
    constructor(channelId: string, dspFacilities: BaseDSPFacilities, state: any, channelsConfigMap: any) {
        super(channelsConfigMap)
        this._state = state;
        this._channelId = channelId;
        this._dspFacilities = dspFacilities;
    }
    applyQuota(channel: DSPChannel, quota: number, checkOnly: boolean): Promise<void> {
        return this._dspFacilities.applyQuota(channel, quota, checkOnly);
    }
    getSubscribedChannels(): Promise<DSPChannel[]> {
        return this._dspFacilities.getSubscribedChannels();
    }
    submitProcessedEvent(channel: DSPChannel, event: DSPEvent): Promise<void> {
        return this._dspFacilities.submitProcessedEvent(channel, event);
    }
    getProcessedEvent(channel: DSPChannel, eventId: string): Promise<DSPEvent> {
        return this._dspFacilities.getProcessedEvent(channel, eventId);
    }
    async getChannelState(channelId: string): Promise<any> {
        if (this._state == null || this._state.processors == null)
            return {};
        if(this._state.processors[channelId] == null)
            return {};
        return this._state.processors[channelId];
            
    }
    async getChannelConfig(channelId: string): Promise<any> {        
        return this._config[channelId];
    }
    async setChannelState(channelId: string, channelState: any): Promise<void> {
        if(channelState == null || Object.keys(channelState).length == 0){
            if(this._state && this._state.processors && this._state.processors[channelId])
                delete this._state.processors[channelId];
            if(this._state == null || this._state.processors == null || Object.keys(this._state.processors).length == 0)
                this._state = {};
            return;
        }
        if (this._state == null)
            this._state = {};
        if (!this._state.processors) {
            this._state.processors = {};
        }        
        this._state.processors[channelId] = channelState;
    }
    getDSPConfig(): Promise<DSPConfig> {
        return this._dspFacilities.getDSPConfig();
    }
    public async log(level, data){
        this._dspFacilities.log(level, data);
    }
    public async getSecretForChannel(channelId:string, keyName:string): Promise<string>{
        return this._dspFacilities.getSecretForChannel(channelId, keyName);
    }
    public async addChannel(config: any, owner: string, subscriber: string): Promise<string> {
        return this._dspFacilities.addChannel(config, owner, subscriber);

    }
    public async removeChannel(id: string){
        return this._dspFacilities.removeChannel(id);

    }
}
