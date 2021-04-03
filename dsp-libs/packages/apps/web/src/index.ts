import { DSPWorker, factory } from '@liquidapps/dsp-lib-base';
import '@liquidapps/dsp-lib-crypto';
import '@liquidapps/dsp-lib-ethereum';
import '@liquidapps/dsp-lib-eosio';
import { InMemoryBackend,ForkableFSHandler } from '@liquidapps/dsp-lib-framework';
import { URLBasedConfigGenerator } from './URLBasedConfigGenerator';
import * as yaml  from 'js-yaml';

declare global {
    interface Window { dsp: any; electronApi; }
}
let dsp: any = {};
window.dsp = dsp;
const manifestPath = "static/manifests/default.yaml";
var appContainer = document.getElementById('appContainer');    
let defaultManifest = manifestPath;
// if(location.pathname.startsWith('/ipns/')){
//     defaultManifest = `${location.pathname}/${manifestPath}`    
// }
window.dsp.yaml = yaml;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
(new URLBasedConfigGenerator(
    `m=${defaultManifest}`
)).getConfig().then(async config=>{
    dsp.backend = new InMemoryBackend(config, "TEST DO NOT USE");
    dsp.config = config;
    // const leftTime = new Date().getTime() - startTs;
    // const neededDelay = wantedTime - leftTime;
    // if(neededDelay > 0){
    //     await delay(neededDelay);

    // }
    if(config.meta.uiParts)
        config.meta.uiParts.forEach(element => {
            var template = document.createElement('template');
            template.innerHTML = element.trim();            
            var newElements = template.content.childNodes;
            newElements.forEach(element => {
                appContainer.appendChild(element);
                if(element.nodeType == 1 && (<HTMLElement>element).tagName == 'SCRIPT'){
                    eval((<HTMLElement>element).innerHTML);
                }
            });
    });
    dsp.worker = new DSPWorker(dsp.backend);
    dsp.worker.init().then(a=>{
        var loader = document.getElementById('loader');    
        appContainer.removeChild(loader);
    });
    if(window.electronApi){
        console.log('has API!');
        dsp.backend.onLog.subscribe((sender,ev) => {
            window.electronApi.log(ev);
            // console.log('DSP Log', ts,level,data)
          } );
          window.electronApi.getKey('test1',res=>{
            window.electronApi.log('res test1 ' + res);
          })
        
    }
});

dsp.channelFactory = factory;
dsp.ForkableFSHandler =ForkableFSHandler;
