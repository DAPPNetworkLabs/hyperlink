import { DSPConfig } from "./models/DSPConfig";
import { BaseDSPFacilities } from "./BaseDSPFacilities";
import { DSPChannel } from "./models/DSPChannel";
import { factory } from "./ChannelProcessorFactory";
import { DSPEvent } from "./models/DSPEvent";
export class DSPWorker {
    private _config: DSPConfig;
    private _dspFacilities: BaseDSPFacilities;
    _channels: any = {};
    _inHearbeat: any;
    constructor(dspFacilities:BaseDSPFacilities) {
        this._dspFacilities = dspFacilities;                
    }
    public async init(): Promise<void> {
        this._config = await this._dspFacilities.getDSPConfig();        
        this._inHearbeat = false;
        setInterval(async()=>{await this.heartBeat()}, this._config.heartbeatInterval*1000);        
        this._dspFacilities.log('WARN', {
            ltype: "DSPWorker.init",
            config:this._config,
            message:`Worker Init`
        });
        
    }
    private async heartBeat(): Promise<void> {
        if(this._inHearbeat)
            return;
        this._inHearbeat = true;
        const channels: DSPChannel[] = await this._dspFacilities.getSubscribedChannels();
        const newChannels = {};

        for (let index: number = 0; index < channels.length; index++) {
            const channel = channels[index];
            if(!this._channels[channel.id]){
                // initialize channel
                channel.processor = await factory.getChannelProcessor(channel.config);
                channel.processor.processHook= async(events:DSPEvent[])=>{
                    for (let eventIdx = 0; eventIdx < events.length; eventIdx++) {
                        const event = events[eventIdx];
                        if(!await this._dspFacilities.getProcessedEvent(channel, event.id)){
                            await this._dspFacilities.submitProcessedEvent(channel, event);
                        }
                        else{
                            this._dspFacilities.log('DEBUG', {
                                ltype: "skippedEvent",
                                eventId: event.id,
                                channelId: channel.id,
                                message:`Skipped Event`
                            })
                        }
                        
                    }                    
                }
                try{
                    await channel.processor.init(channel.id, this._dspFacilities);                
                }
                catch(e){
                    try{
                        await channel.processor.finalize();
                    }
                    catch(e){

                    }
                    this._dspFacilities.log('ERROR', {
                        ltype: "processor.init",
                        error: e.toString(),                        
                        message:`init ${channel.id} failed`
                    });
                    continue;                    
                }
            }
            else{
                // take process from existing
                channel.id = this._channels[channel.id].id;
                channel.timer = this._channels[channel.id].timer;                
                channel.state = this._channels[channel.id].state; 
                channel.processor = this._channels[channel.id].processor;
            }            
            newChannels[channel.id] = channel;
        }

        const oldKeys = Object.keys(this._channels);
        for (let index: number = 0; index < Object.keys(this._channels).length; index++) {
            const oldChannelKey = oldKeys[index];
            const oldChannel:DSPChannel = this._channels[oldChannelKey];
            if(newChannels[oldChannelKey])
                continue;
            // finalize
            oldChannel.processor.finalize();
        }
        this._channels = newChannels;    
        this._inHearbeat = false;
    }
}
