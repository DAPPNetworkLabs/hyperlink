import { BaseChannelProcessor, DSPEvent, factory } from '@liquidapps/dsp-lib-base';

export class WebRelayChannelProcessor extends BaseChannelProcessor {
    start(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        throw new Error("Method not implemented.");
    }
}
factory.addProcessor('web-relay',WebRelayChannelProcessor);