import { BaseKMS } from "@liquidapps/dsp-lib-base";
const sha256 = require('sha256');
import { Buffer } from "buffer";


export class SimpleKMS  extends BaseKMS {
    _seed: any;
    constructor(seed){
        super();
        this._seed = seed;
    }
    protected async getSeed():Promise<string>{
        return this._seed;
    }
    protected hash(str: string):string {        
        return sha256(Buffer.from(str)).toString();;
    }
}
