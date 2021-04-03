import { BaseChannelProcessor } from "../BaseChannelProcessor";
export class DSPChannel {
    public id: string;
    public owner: string;
    public subscriber: string;
    // ChannelConfig
    public config: string;
    // Generated Locally
    public state: String;
    // local only data
    public processor: BaseChannelProcessor;
    timer: any; // NodeJS.Timer or number (isomorphic)
}
