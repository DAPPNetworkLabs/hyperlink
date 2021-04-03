import { DSPConfig,BaseKMS, BaseDSPFacilities,DSPChannel,DSPEvent } from "@liquidapps/dsp-lib-base";
import { SimpleKMS } from "../SimpleKMS";


export class InMemoryBackend extends BaseDSPFacilities {
    protected kms: BaseKMS;
    async getChannelState(channelId: string): Promise<any> {
        return this.channels[channelId].state;
    }
    async getChannelConfig(channelId: string): Promise<any> {
        return this.channels[channelId].config;
    }
    async setChannelState(channelId: string, channelState: any): Promise<void> {
        this.channels[channelId].state = channelState;        
        this.log("DEBUG", {
            ltype: "setChannelState",
            channel:channelState,
            channelId:channelId,
            message:`Set Channel State`
        });

    }
    constructor(config: DSPConfig, seed:string) {
        
        super(config);
        this.kms = new SimpleKMS(seed);
        // todo: merge config parts with ipfs hash from url param
        // todo: read initial channels from config
        const a = this;
        if(this._config.predefinedChannels)
            this._config.predefinedChannels.forEach(async element => {
                await a.addChannel(element, 'predefined', "self");            
            });
    }
    async getDSPConfig(): Promise<DSPConfig> {
        return this._config;
    }

    
    public processedEvents: {
        [key: string]: DSPEvent;
    } = {};
    public quotas: {
        [key: string]: number;
    } = {};
    public channels:any  = {};
    public async submitProcessedEvent(channel: DSPChannel, event: DSPEvent): Promise<void> {
        const canonicalId = channel.id + "_" + event.id;
        const submittedEvent = {
            id: canonicalId,
            eventId: event.id,
            data: event.data,
            timestamp: new Date()
        };
        if (this.processedEvents[canonicalId]) {
            throw new Error('already processed');
        }
        await this.setChannelState(channel.id,this.channels[channel.id].state);

        this.processedEvents[canonicalId] = submittedEvent;
        this.log("INFO", {
            ltype: "submitProcessedEvent",
            canonicalId,
            event,
            message:`Submit Processed Event`
        });
        return;
    }
    public async log(level, data){
        this.onLog.dispatch(this, {
            ts: new Date(),
            level,
            data
        });
    }
    public async getProcessedEvent(channel: DSPChannel, eventId: string): Promise<DSPEvent> {
        const canonicalId = channel.id + "_" + eventId;
        this.log("DEBUG", {
            ltype: "getProcessedEvent",
            eventId,
            channelId:channel.id,
            canonicalId,
            message:`Get Processed Event`
        });
        return this.processedEvents[canonicalId];
    }
    public async getSubscribedChannels(): Promise<DSPChannel[]> {
        
        const channels: DSPChannel[] = Object.keys(this.channels).map(k=>this.channels[k]);
        this.log("DEBUG", {
            ltype: "getSubscribedChannels",
            channels: channels.length,
            message:`Get Subscribed Channels`
        });
        return JSON.parse(JSON.stringify(channels));
    }
    public async applyQuota(channel: DSPChannel, quota: number, checkOnly: boolean): Promise<void> {
        const payer = channel.owner;
        
        if (this.quotas[payer] == null || this.quotas[payer] < quota) {
            throw new Error('not enough quota');
        }        
        if (!checkOnly)
            this.quotas[payer] -= quota;
        this.log("DEBUG", {
            ltype: "applyQuota",
            channel:channel.id,
            quota,
            owner: channel.owner,
            message:`Apply Quota`
        });            
    }
    id:number = 0;
    /// debug
    public async addChannel(config: any, owner: string, subscriber: string): Promise<string> {
        const newChannel = new DSPChannel();
        newChannel.config = config;
        newChannel.subscriber = subscriber;
        newChannel.owner = owner;
        newChannel.id = (this.id++).toString()
        this.channels[newChannel.id] = newChannel;
        this.log("WARN", {
            ltype: "addChannel",
            channel: newChannel,
            message:`Add Channel`

        });
        return newChannel.id;
    }

    public async removeChannel(id: string){
        this.log("WARN", {
            ltype: "removeChannel",
            channel:this.channels[id],
            id,
            message:`Remove Channel`

        });

        delete this.channels[id];
    }

    public addQuota(owner: string, quota: number) {
        if(!this.quotas[owner])
            this.quotas[owner] =0;
        this.quotas[owner] += quota;
        this.log("WARN", {
            ltype: "addQuota",
            owner,
            quota,
            message:`Add Quota`
        });
    }
    public async getSecretForChannel(channelId:string, keyName:string): Promise<string>{
        return await this.kms.getSecretForChannel(channelId, keyName);
    }
}
