export abstract class BaseKMS {
    protected async getSeedForChannel(channelId:string){
        // generate seed for channel
        // seed for channel must not reveal seed        
        const seed = await this.getSeed();
        return this.hash(seed + channelId);
        
    }
    protected abstract getSeed():Promise<string>;
    protected abstract hash(str: string):string;
    public async getSecretForChannel(channelId:string, keyName:string){
        const seedForChannel = await this.getSeedForChannel(channelId);
        return this.hash(seedForChannel + keyName);        
        // secret for channel must not reveal seed for channel
    }
}
