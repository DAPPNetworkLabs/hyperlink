import { DSPConfig } from "./models/DSPConfig";
import { DSPChannel } from "./models/DSPChannel";
import { DSPEvent } from "./models/DSPEvent";
import {  EventDispatcher } from "strongly-typed-events";

// consumed by processors
export abstract class BaseDSPFacilities {
    public abstract getChannelState(channelId: string): Promise<any>;
    public abstract getChannelConfig(channelId: string): Promise<any>;
    public abstract setChannelState(channelId: string, channelState: any): Promise<void>;
    // secret
    public abstract getDSPConfig(): Promise<DSPConfig>;

    public abstract applyQuota(channel: DSPChannel, quota: number, checkOnly: boolean): Promise<void>;
    public abstract getSubscribedChannels(): Promise<DSPChannel[]>;
    public abstract submitProcessedEvent(channel: DSPChannel, event: DSPEvent): Promise<void>;
    public abstract getProcessedEvent(channel: DSPChannel, eventId: string): Promise<DSPEvent>;
    public abstract log(level: string, data: any);
    public abstract async getSecretForChannel(channelId:string, keyName:string): Promise<string>;
    public abstract 
    public onLog = new EventDispatcher<BaseDSPFacilities, {
        ts,
        level: string,
        data: any,
    }>();
    public onEventSubmit = new EventDispatcher<BaseDSPFacilities, {
        ts,
        state: any,
        channelId: string,
        event: DSPEvent
    }>();

    public _config: DSPConfig;
    
    constructor(config){
        this._config = config;

    }

    public abstract addChannel(config: any, owner: string, subscriber: string): Promise<string> ;

    public abstract removeChannel(id: string): Promise<void>;

}
