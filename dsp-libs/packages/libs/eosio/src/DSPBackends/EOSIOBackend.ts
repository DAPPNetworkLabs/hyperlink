import { DSPConfig,DSPChannel,DSPEvent } from '@liquidapps/dsp-lib-base';
import { InMemoryBackend } from '@liquidapps/dsp-lib-framework';

export class EOSIOBackend extends InMemoryBackend {
    getChannelState(channelId: string): Promise<any> {
        throw new Error("Method not implemented.");
    }
    getChannelConfig(channelId: string): Promise<any> {
        throw new Error("Method not implemented.");
    }
    setChannelState(channelId: string, channelState: any): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getDSPConfig(): Promise<DSPConfig> {
        throw new Error("Method not implemented.");
    }
    getProcessedEvent(channel: DSPChannel, eventId: string): Promise<DSPEvent> {
        throw new Error("Method not implemented.");
    }
    submitProcessedEvent(channel: DSPChannel, event: DSPEvent): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getSubscribedChannels(): Promise<DSPChannel[]> {
        throw new Error("Method not implemented.");
    }
    applyQuota(channel: DSPChannel, quota: number, checkOnly: boolean): Promise<void> {
        throw new Error("Method not implemented.");
    }
    async readTable(eos, appName) {
        throw new Error('Method not implemented.');
        try {
            const results = await eos.get_table_rows({
                json: true,
                code: appName,
                scope: appName,
                lower_bound: "frontend.url",
                table: 'meta',
                limit: 1,
                reverse: false,
                show_payer: false // Optional: Show ram payer
            });
            if (results.rows.length && results.rows[0].key == "frontend.url") {
                const appUrl = results.rows[0].value;
                return appUrl;
            }
        }
        catch (e) {
        }
        return null;
    }
    async runTransaction(actionName: string, payload: {}): Promise<void> {
        // run against eos[this.servicename]
        // safe push (make sure it got to a head block, if not retry)
        throw new Error('Method not implemented.');
    }
}
