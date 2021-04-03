import { BaseChannelProcessor, DSPEvent, factory } from '@liquidapps/dsp-lib-base';

var EdDSA = require('elliptic').eddsa;

// Create and initialize EdDSA context
// (better do it once and reuse it)

export class EdDSASignChannelProcessor extends BaseChannelProcessor {
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
        var ec = new EdDSA(this._config.fn || 'ed25519');
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

factory.addProcessor('eddsa-sign',EdDSASignChannelProcessor);