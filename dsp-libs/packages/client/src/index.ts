// cache warmup
// channel builder

abstract class Builder{
    
    async build(){
        await this.validate();
        
        // add to registry
        return await this.generateConfig();        
    }


    protected abstract async validate();
    protected abstract async generateConfig();
}

abstract class BuilderApplier extends Builder{
    id: any;
    config: any;
    constructor(id = null) {
        super();
        this.id = id;
    }
    async apply(){
        if(!this.config)
            this.config = await this.build();
        if(this.id)
           throw new Error('already applied') ;
        // save config
        this.id = await this.applyConfig();
        // await this.saveConfig();
    }
    async unapply(){
        // find all components and destory
        if(!this.id)
            throw new Error('not applied or ID not provided');
        // save config
        this.id = null;
        this.config = null;
        await this.unApplyConfig();
        // this.removeConfig()
    }
    protected abstract async applyConfig();
    protected abstract async unApplyConfig();
}

class PipelineChannelBuilder extends BuilderApplier{
    state: any;
    async applyPermissions(index: number) {
        if(this._destination)
            await this._destination.applyPermissions(index, this.id, this._dsp, this.state);
    }
    async getState() {
        return null;
        
    }
    protected async applyConfig() {
        // add to eosio nexus
        let c=10;
        while(true){
            this.state = await this.getState();
            if(this.state)
                break;
            if(c--)
                throw new Error('not initiated in time');
        }        
        // apply permissions        

    }
    protected async unApplyConfig() {

        throw new Error("Method not implemented.");
    }
    protected async generateConfig() {
        const processors = [];        
        if(this._cronSeconds){
            processors.push(
                await new Cron()
                    .triggerEvery(this._cronSeconds)
                    .build());
        }
        if(this._source){
            processors.push(
                await this._source
                .build());
        }
        for (let index = 0; index < this._processors.length; index++) {
            const element = this._processors[index];
            processors.push(
                await element
                    .build());
        }
        if(this._destination){
            processors.push(
                    await this._destination
                        .build());
        }
        // generate
        return {
            processor:'pipeline',
            processors
        }
    }
    private _cronSeconds: number;
    private _destination: Destination;
    private _source: Source;
    private _processors: Processor[] = [];
    protected validate() {
        if(!this._dsp)
            throw new Error("DSP not selected");
        
        if(!this.from && !this.to && this._processors.length == 0)
            throw new Error("empty channel");
    }    
    from(source: Source){
        this._source = source;
        return this;
    }
    process(processors: Processor){
        this._processors.push(processors);
        return this;
    }
    to(destination: Destination){
        this._destination = destination;
        return this;
    }
    triggerEvery(seconds: number){
        this._cronSeconds = seconds;
        // add cron as first step in pipeline.
        return this;
    }    
    _dsp: any;    
    useDsp(dsp){
        this._dsp = dsp;
        return this;
    }
}
abstract class Processor extends Builder{
    
}
class Cron extends Processor{
    seconds: number;
    cronSeconds: number;
    triggerEvery(seconds: number){
        this.cronSeconds = seconds;
        // add cron as first step in pipeline.
        return this;
    }   
    protected validate() {
        throw new Error("Method not implemented.");
    }
    protected generateConfig() {
        throw new Error("Method not implemented.");
    }
    
}
abstract class Source extends Processor {

}

abstract class Destination extends Processor{
    abstract async applyPermissions(index: number, id: any, dsp: any, channelState:any)
    abstract async destroyPermissions(index: number, id: any, dsp: any)
}
abstract class GatehouseSource extends Source{
}
abstract class GatehouseDestination extends Destination{
}

abstract class Gatehouse {
    abstract source():GatehouseSource;
    abstract destination():GatehouseDestination;
}


class GatehousesBridge extends BuilderApplier{
    _dsps: any;
    b: Gatehouse;
    a: Gatehouse;    
    protected async applyConfig() {        
        await this.config.from.apply();
        await this.config.to.apply();        
    }
    dsps(dsps){
        this._dsps = dsps;
        return this;
    }
    protected unApplyConfig() {
        throw new Error("Method not implemented.");
    }
    protected validate() {        
    }
    protected generateConfig() {
        return {
         to: new BridgeBuilder()
            .dsps(this._dsps)
            .from(this.a.source())
            .to(this.b.destination()),
         from: new BridgeBuilder()
            .dsps(this._dsps)
            .from(this.b.source())
            .to(this.a.destination())
        }
    }    
    
    constructor(a:Gatehouse, b:Gatehouse) {
      super();
      this.a = a;
      this.b = b;
    }

}


class EVMGatehouseSource extends GatehouseSource {
    private _chain: any;
    fromChain(chain: any) {
        this._chain = chain;
        return this;
    }
    private _contract: any;
    fromContract(contract){
        this._contract = contract;
        return this;
    }    
    protected validate() {
        if(!this._contract)
            throw new Error("missing contract");
        if(!this._chain)
            throw new Error("missing chain");
    }
    protected generateConfig() {
        return {
            processor:'pipeline',
            processors:[
                // parse
                // transform
                // sign
                // post
            ]
        }
    }

}
class EOSIOGatehouseSource extends GatehouseSource {
    private _contract: any;
    private _chain: any;
    fromChain(chain: any) {
        this._chain = chain;
        return this;
    }

    protected validate() {
        if(!this._contract)
            throw new Error("missing contract."); 
        if(!this._chain)
            throw new Error("missing chain");
    }
    protected generateConfig() {
        return {
            processor:'pipeline',
            processors:[
                // parse
                // transform
                // sign
                // post
            ]
        }
    }
    fromContract(contract){
        this._contract = contract;
        return this;
    }    
}
class EVMGatehouseDestination extends GatehouseDestination {
    private _contract: any;
    private _chain: any;
    toChain(chain: any) {
        this._chain = chain;
    }
    toContract(contract){
        this._contract = contract;
        return this;
    }
    async applyPermissions(index: number, id: any, dsp: any, channelState: any) {        
        // add as singer in destination contract
    }
    async destroyPermissions(index: number, id: any, dsp: any) {        
        // remove as singer
    }
    protected validate() {
        if(!this._contract)
            throw new Error("missing contract."); 
         if(!this._chain)
            throw new Error("missing chain");
    }
    protected generateConfig() {
        return {
            processor:'pipeline',
            processors:[
                // parse
                // transform
                // sign
                // post
            ]
        }
    }
}
class EOSIOGatehouseDestination extends GatehouseDestination {
    async applyPermissions(index: number, id: any, dsp: any, channelState: any) {        
        // create new permission level
    }
    async destroyPermissions(index: number, id: any, dsp: any) {        
        
    }
    protected validate() {
        if(!this._contract)
            throw new Error("missing contract.");            
        if(!this._chain)
            throw new Error("missing chain");
    }
    protected generateConfig() {
        return {
            processor:'pipeline',
            processors:[
                // parse
                // transform
                // sign
                // post
            ]
        }
    }
    private _chain: any;
    toChain(chain: any) {
        this._chain = chain;
    }

    private _contract: any;
    toContract(contract){
        this._contract = contract;
        return this;
    }
}

class NexusSource extends Source{
    protected validate() {
        if(!this._channelId)
            throw new Error("missing ChannelID");
    }
    _channelId: any;
    fromChannelId(channelId){
        this._channelId = channelId;
        return this;
    }
    generateConfig() {
        return {
            processor:"nexus-source",
            channelId: this._channelId
        }        
    }   
}

class WebSource extends Source{
    _headers: any;
    protected validate() {
        if(!this._url)
            throw new Error("Method not implemented.");
    }
    _url: any;
    fromURL(url){
        this._url = url;
        return this;
    }    
    generateConfig() {
        return {
            processor:"web-source",
            url:this._url
        }        
    }
    
}

class BridgeBuilder extends BuilderApplier{
    constructor() {
        super();
    }
    protected async applyConfig() {
        for (let index = 0; index < this._dsps.length; index++) {
            const channel:PipelineChannelBuilder = new PipelineChannelBuilder()
                .useDsp(this._dsps[index])
                .triggerEvery(this._cronSeconds);
            if(this._source)
                channel.from(this._source);
            if(this._destination)
                channel.to(this._destination);
            await channel.apply();
            await channel.applyPermissions(index);
        }
    }
    protected unApplyConfig() {
        // destroyPermissions
    }
    protected generateConfig() {
        throw new Error("Method not implemented.");
    }    
    private _dsps: string[];
    private _source: Source;
    private _destination: Destination;
    private _processors: Processor[] = [];
    private _cronSeconds: number = 0;
    from(source: Source){
        this._source = source;
        return this;
    }
    dsps(dsps){
        this._dsps = dsps;
        return this;
    }
    process(processors: Processor){
        this._processors.push(processors);
        return this;
    }
    to(destination: Destination){
        this._destination = destination;
        return this;
    }
    triggerEvery(seconds: number){
        this._cronSeconds = seconds;
        // add cron as first step in pipeline.
        return this;
    }
    validate() {
        if(!this.dsps)   
            throw new Error('no dsps selected');
    }
 
}


class EOSIOGatehouse extends Gatehouse{
    _contract: any;
    _chain: any;
    source(): GatehouseSource {
        return new EOSIOGatehouseSource().fromContract(this._contract).fromChain(this._chain);;
    }
    destination(): GatehouseDestination {
        return new EOSIOGatehouseDestination().toContract(this._contract).toChain(this._chain);;
    }
}
class EVMGatehouse extends Gatehouse{
    _contract: any;
    _chain: any;
    source(): GatehouseSource {
        return new EVMGatehouseSource().fromContract(this._contract).fromChain(this._chain);
    }
    destination(): GatehouseDestination {
        return new EVMGatehouseDestination().toContract(this._contract).toChain(this._chain);
    }
}
function test(){    
    const bridge = new GatehousesBridge();
    const b1 = bridge
        .dsps(['hello'])
        .triggerEvery(10)
        .from(new WebSource().fromURL('http://google.com/'))
        .to(new EOSIOGatehouseDestination()
            .toContract('test')).apply();   
}