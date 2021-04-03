import { BaseChannelProcessor, DSPEvent, factory } from '@liquidapps/dsp-lib-base';
var EC = require('elliptic').ec;

// Create and initialize EC context
// (better do it once and reuse it)

export class ECDSASignChannelProcessor extends BaseChannelProcessor {
    secret: string;
    private publicKey: any;
    private key: any;
    async start(): Promise<void> {
        this.secret = await this.getSecret(this._config.secretName || "default");
        // create public key
        await this.derivePrivateKey();
        this._state.publicKey = this.publicKey;
        // new key
        // change state
        
    } 
    derivePrivateKey(): any {
        // from this.secret
        var ec = new EC(this._config.fn || 'secp256k1');
        this.key = ec.genKeyPair({
            entropy: Buffer.from(this.secret),
          });        
        this.publicKey = this.key.getPublic().encode('hex');;        
    }
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        return eventData.map(a=>
            new DSPEvent(a.id, this.sign(a.data))
        );
        // sign data
    }
    sign(data: string) {
        return this.key.sign(data);

    }
}
factory.addProcessor('ecdsa-sign',ECDSASignChannelProcessor);