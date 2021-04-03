import { factory, DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
import { FSBackedChannelProcessor } from "./FSBackedChannelProcessor";
const browserBindings = require("@wasmer/wasi/lib/bindings/browser").default;
import { WASI } from "@wasmer/wasi"
import { WasmFs } from "@wasmer/wasmfs"
const path = require('path');
export const wasmExtensionFunctions = []

import { lowerI64Imports } from "@wasmer/wasm-transformer";
import { globalIpfsWrapper } from "..";
import {
    Volume,
    filenameToSteps,
    DirectoryJSON,
    TFilePath,
    pathToFilename
  } from "memfs/lib/volume";
  
const decoder = new TextDecoder();

export class WASIChannelProcessor extends BaseChannelProcessor {
    _instance: any;
    _touchedFs:boolean = false;
    wasmFs: any;
    private secret: any;
    async start(): Promise<void> {
        const a = this;
        // this._state = await this._dspFacilities.getChannelState(this._channelId);
        // const memory = new WebAssembly.Memory({ initial: 256 });
        if (!this._config.wasmBytes)
            throw new Error('wasmBytes missing in config');
        const typedArray = new Uint8Array(this._config.wasmBytes.match(/[\da-f]{2}/gi).map(function (h) {
            return parseInt(h, 16);
        }));
        const loweredWasmModuleBytes = await lowerI64Imports(typedArray);
        this.secret = await this.getSecret(this._config.secretName || 'default');        
        if(!this._state.fsIpfs && this._config.initalState){
            this._state.fsIpfs = this._config.initalState;
            await this.loadIpfsHash();
        }
        const wasmFs = new WasmFs();
        this.wasmFs = wasmFs;
        // await this.loadIpfsHash();
        const originalWriteFileSync = wasmFs.fs.writeFileSync;
        try{
            this.wasmFs.fs.mkdirSync('/s');
        }catch(e){}
        await this.populateConfig('/s/config', this._config);
        await this.populateConfig('/s/secret', this.secret);
        await this.populateConfig('/s/meta', (await this._dspFacilities.getDSPConfig()).meta);
        wasmFs.fs.writeFileSync = (path, text) => {
            a._touchedFs = true;
            originalWriteFileSync(path, text);
            };
            let stdErrorPos = 0;

                
    wasmFs.fs.watch('/dev/stderr', { encoding: 'buffer' }, (eventType, filename) => {
        if (filename) {
            const contents = wasmFs.fs.readFileSync('/dev/stderr');
            console.log("stderr contents",contents.slice(stdErrorPos).toString());
            stdErrorPos += contents.length;
        }
        });
        let wasi  = new WASI({
            // OPTIONAL: The pre-opened dirctories
            preopens: {
                '/s':'/s',
            },
          
            // OPTIONAL: The environment vars
            env: {
                PWD:'/',
            },
          
            // OPTIONAL: The arguments provided
            args: ["/1.out"],
          
            // OPTIONAL: The environment bindings (fs, path),
            // useful for using WASI in diferent environments
            // such as Node.js, Browsers, ...
            bindings: {
              // hrtime: (time?: [number, number]) -> number
              // exit: (code?: number) -> void
              // kill: (pid: number, signal?: string | number) -> void
              // randomFillSync: (buffer: Buffer, offset?: number, size?: number) -> Buffer
              // isTTY: () -> bool
              // fs: Filesystem (with similar API interface as Node 'fs' module)
              // path: Path  (with similar API Interface as Node 'path' module)
              ...browserBindings, // Use `nodeBindings` for Node
              fs: wasmFs.fs
            }
          });
          let wasmModule = await WebAssembly.compile(loweredWasmModuleBytes);
          
       

    let instance = await WebAssembly.instantiate(wasmModule, {
       ...wasi.getImports(wasmModule),
    //    "env":{
    //        ...wasmExtensionFunctionswithMemory
    //    }
    });
        this._instance = instance; 
        try{       
            wasi.start(instance);
        }
        catch(e){
            console.log("wasm start", e);
        }
        // const p = this._instance.instance.exports.start;
        // p();
        await this.readPreview();
        await this.saveIpfsHash();
        // if(this._touchedFs)
        // await this.fs.write('/state.json', JSON.stringify(this._state.wasmState));
    }
    async populateConfig(prefix, obj) { 
        if(prefix === '/s/meta/uiParts')
            return;
         if(prefix === '/s/config/wasmBytes')
            return;
        if(prefix === '/s/secret')
            return;
            
        if(typeof(obj) === 'object'){
            try{
                this.wasmFs.fs.mkdirSync(prefix);
            }catch(e){}
            for (let index = 0; index < Object.keys(obj).length; index++) {
                const element = Object.keys(obj)[index];
                this.populateConfig(prefix +'/' + element, obj[element]);
            }
        }
        else if (Array.isArray(obj)){
            try{
                this.wasmFs.fs.mkdirSync(prefix);
            }catch(e){}
            for (let index = 0; index < obj.length; index++) {
                const element = obj[index];
                this.populateConfig(prefix +'/' + index,element);
            }
        }
        else{
            if(obj)
                this.wasmFs.fs.writeFileSync(prefix, obj.toString());            
        }
        

    }
    async populateEvents(eventData: DSPEvent[]) {
        try{this.wasmFs.fs.mkdirSync('/s/events.in');}catch(e){}
        try{this.wasmFs.fs.mkdirSync('/s/events.out');}catch(e){}
        // this.wasmFs.fs.mkdirSync('/s/events.out');
        for (let index = 0; index < eventData.length; index++) {
            const event = eventData[index];            
            this.wasmFs.fs.writeFileSync(`/s/events.in/${event.id}`, JSON.stringify(event.data));            
        }
        
    }
    async readEvents() {
        const res = [];
        let results;
        try{
            results = this.wasmFs.fs.readdirSync('/s/events.out');
        }
        catch(e){
            return res;
        }
        for (let index = 0; index < results.length; index++) {
            const fileName = results[index];
            const fullFileName = path.join('/s/events.out',fileName);
            const data = this.wasmFs.fs.readFileSync(fullFileName);
            res.push(new DSPEvent(fileName,data.toString()));
            
        }
        return res;
    }
    async readPreview() {
        try{
            const data = this.wasmFs.fs.readFileSync("/s/preview.src").toString();
            this._state.preview = {
                src: data,
            }
            return data;
        }
        catch(e){
            return null;
        }
        
    }
    async stateChanged(newState: any): Promise<void>{
        await super.stateChanged(newState);
        await this.loadIpfsHash();

    }
    
    async loadIpfsHash(){
        if(this._state.fsIpfs){
            // read files from ipfs
            const json ={};
            for await (const file of globalIpfsWrapper.ipfs.get(this._state.fsIpfs)) {

                if (!file.content) continue;
                let data = ''                
                const localPath = file.path.slice(this._state.fsIpfs.length);
                // console.log(localPath)
              
              for await (const chunk of file.content) {
                    data += chunk.toString()

                }                
                json[localPath] = new Buffer(data);
                
            }
            // console.log("finalJson",json)
            this.fromJSONFixed(this.wasmFs.volume, json);
        }
    }
    fromJSONFixed(vol: any, json: any) {
        const sep = "/";
        for (let filename in json) {
          const data = json[filename];
          const isDir = data ? Object.getPrototypeOf(data) === null : data === null;
          // const isDir = typeof data === "string" || ((data as any) instanceof Buffer && data !== null);
          if (!isDir) {
            const steps = filenameToSteps(filename);
            if (steps.length > 1) {
              const dirname = sep + steps.slice(0, steps.length - 1).join(sep);
              // @ts-ignore
              vol.mkdirpBase(dirname, 0o777);
            }
            vol.writeFileSync(filename, (data as any) || "");
          } else {
            // @ts-ignore
            vol.mkdirpBase(filename, 0o777);
          }
        }
      }
    
    async saveIpfsHash(){
        const newJson = this.wasmFs.toJSON();
        // console.log("newJson",newJson)

        const filesNames = Object.keys(newJson);
        const files = filesNames.filter(a=>a.indexOf('/dev/') !== 0).filter(a=>a.indexOf('/s/events.') !== 0).map(fileName=>{

            return {
                path: `/channelFs${fileName}`,
                content: newJson[fileName]
            }
        })
        
        let selected;
        for await (const result of globalIpfsWrapper.ipfs.addAll(files)) {            
            selected = result;
        }
        this._state.fsIpfs = selected.cid.toString();
    }
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {
        
        // await this.loadIpfsHash();

        // try{
        //     this.wasmFs.fs.rmdirSync('/events.in', {recursive :true} );            
        // }
        // catch(e)
        // {
        // }
        // try{
        //     this.wasmFs.fs.rmdirSync('/events.out', {recursive :true} );
        // }
        // catch(e)
        // {
        // }

        await this.populateEvents(eventData);
        this._touchedFs = false;
        const p = this._instance.exports._start;        
        try{
            p();
        }
        catch(e){
            console.log("wasm process", e);
        }
        const events = await this.readEvents();
        await this.readPreview();
        try{
            this.wasmFs.fs.rmdirSync('/s/events.in', {recursive :true} );            
        }
        catch(e)
        {
        }
        try{
            this.wasmFs.fs.rmdirSync('/s/events.out', {recursive :true} );
        }
        catch(e)
        {
        }
        await this.saveIpfsHash();
        // this._state.fsJSON = newJson;
        // set state if changed
        return events;
    }
}
factory.addProcessor('wasi', WASIChannelProcessor);