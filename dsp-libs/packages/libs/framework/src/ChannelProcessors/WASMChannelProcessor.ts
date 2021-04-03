import { factory, DSPEvent } from "@liquidapps/dsp-lib-base";
import { FSBackedChannelProcessor } from "./FSBackedChannelProcessor";

export const wasmExtensionFunctions = []


const decoder = new TextDecoder();
export const readString = (processor,pointer, length)=> { // a, b TypedArray of same type
    const memory = processor._instance.instance.exports.memory;
    var arr = new Uint8Array(memory.buffer, pointer, length);
    var str = decoder.decode(arr);
    return str;
}
const encoder = new TextEncoder();
export const writeString = (processor,str)=> { // a, b TypedArray of same type
    const memory = processor._instance.instance.exports.memory;
    const a = encoder.encode(str);
    var c = new Uint8Array(a.length + 1);
    c.set(a, 0);
    c.set([0],a.length);
    const memoryForString = processor._instance.instance.exports.allocateString(c.length);
    var memoryArray = new Uint8Array(memory.buffer, memoryForString, c.length);
    for (let i = 0; i < memoryArray.length; i++) {
        memoryArray[i] = c[i];
        }
    
    return memoryForString;
}
const eventFunctions = {
    "getEventData": function (inst,idx) {
        return writeString(inst,inst._events[idx].data);
    },
    "getEventDataKey": function (inst,idx, keyPtr, keyLen) {
        var keyStr = readString(inst,keyPtr, keyLen);
        return writeString(inst,inst._events[idx].data[keyStr]);
    },
    "getEventID": function (inst,idx) {
        return writeString(inst,inst._events[idx].id);
    },
    "pushEvent": function (inst,eventIdPtr, eventIdLen, eventDataPtr, eventDataLen) {        
        inst._events.push( new DSPEvent(
            readString(inst,eventIdPtr, eventIdLen),
            readString(inst,eventDataPtr, eventDataLen)
            ));
    },
    "pushEventObject": function (inst,eventIdPtr, eventIdLen) {        
        inst._events.push(new DSPEvent(readString(inst,eventIdPtr, eventIdLen),{}));
        return inst._events.length-1;
    },
    "clear": function (inst) {
        inst._events = [];
    },
    "setEventData": function (inst, idx, eventDataPtr, eventDataLen) {                
        inst._events[idx].data = readString(inst, eventDataPtr, eventDataLen);
    },
    "setEventDataKey": function (inst,idx,keyPtr, keyLen,  eventDataPtr, eventDataLen) {
        var keyStr = readString(inst,keyPtr, keyLen);
        var eventData =  readString(inst,eventDataPtr, eventDataLen);
        inst._events[idx].data[keyStr] = eventData;
    },                
    "getEventCount": function (inst) {
        return inst._events.length;
    },
}
const dspFunctions = {   
    "getChannelConfig": function (inst,keyPtr, keyLen) {
        var keyStr = readString(inst,keyPtr, keyLen);
        return writeString(inst,inst._config[keyStr]);
    },
    "getChannelState": function (inst,keyPtr, keyLen) {
        var keyStr = readString(inst,keyPtr, keyLen);
        return writeString(inst,inst._state.wasmState[keyStr]);
    },
    "setChannelState": function (inst, keyPtr, keyLen, valuePtr, valueLen) {
        var keyStr = readString(inst, keyPtr, keyLen);
        var valueStr = readString(inst, valuePtr, valueLen);
        inst._touchedState = true;
        inst._state.wasmState[keyStr] = valueStr;
    }
}
export class WASMChannelProcessor extends FSBackedChannelProcessor {
    _instance: any;
    _events: DSPEvent[] = [];
    _touchedState:boolean = false;
    private secret: any;
    protected async innerStart(): Promise<void> {
        const a = this;
        // this._state = await this._dspFacilities.getChannelState(this._channelId);
        // const memory = new WebAssembly.Memory({ initial: 256 });
        if (!this._config.wasmBytes)
            throw new Error('wasmBytes missing in config');
        const typedArray = new Uint8Array(this._config.wasmBytes.match(/[\da-f]{2}/gi).map(function (h) {
            return parseInt(h, 16);
        }));

        this.secret = await this.getSecret(this._config.secretName || 'default');
        const secret = this.secret;
        const dspSecFunctions = {   
            "getSecret": function (inst,) {
                return writeString(inst,secret);
            },
        }       
        let wasmFunctions = {
            ...dspSecFunctions,
            ...dspFunctions,
            ...eventFunctions,
        }
        wasmExtensionFunctions.forEach(module=>{
            wasmFunctions = {...wasmFunctions, ...module};
        })
        const wasmExtensionFunctionswithMemory = {};
        Object.keys(wasmFunctions).forEach(fnKey=>{
            wasmExtensionFunctionswithMemory[fnKey] = function(...args){
                return wasmFunctions[fnKey](a,...args);
            }            
        });
        const instance = await WebAssembly.instantiate(typedArray, {     
            'env': {
                ...wasmExtensionFunctionswithMemory,
                'memoryBase': 0,
                'tableBase': 0,
                // 'memory': memory,
                'table': new WebAssembly.Table({ initial: 0, element: 'anyfunc' }),
                //   },
                // imports: {
            }
        });
        
        this._instance = instance;
        
        this._touchedState = false;
        const p = this._instance.instance.exports.start;
        p();

        if(this._touchedState)
            await this.fs.write('/state.json', JSON.stringify(this._state.wasmState));
    }
    async stateChanged(newState: any): Promise<void>{
        await super.stateChanged(newState);
        var wasmState = {};
        try{
            var chunks = [];
            for await (const chunk of (await this.fs.read('/state.json'))) {
                chunks.push(chunk)
            }            
            wasmState = JSON.parse(Buffer.concat(chunks).toString());
        }
        
        catch(e){
        }
        this._state.wasmState = wasmState;       
    }

    async innerProcess(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        this._events = eventData;
        
        const p = this._instance.instance.exports.process;
        this._touchedState = false;
        p();
        if(this._touchedState)
            await this.fs.write('/state.json', JSON.stringify(this._state.wasmState));
        // set state if changed
        this._state.wasmState = undefined;
        return this._events;
    }
}
factory.addProcessor('wasm', WASMChannelProcessor);