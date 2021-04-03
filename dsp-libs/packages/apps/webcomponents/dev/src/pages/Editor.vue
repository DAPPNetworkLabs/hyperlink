<template>
  <div class="content">
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">


          <codemirror v-model="s.code" :options="cmOptions" />
          <button v-on:click="onSubmit" type="button" class="btn-simple btn btn-xs btn-info" v-tooltip.top-center="editTooltip">
            <i class="fa fa-edit"></i>
          </button>


        </div>



      </div>
    </div>
  </div>
</template>
<script>
// import language js
import 'codemirror/mode/yaml/yaml.js'
let s={
  code: `---
processor: pipeline
processors:
- processor: cron-source
  interval: 60
- processor: json-transform
  transformView:
    btcusd:
        processor: pipeline
        processors:
        - processor: web-source
          url: "https://api.coindesk.com/v1/bpi/currentprice.json"
        - processor: string-to-json
        - processor: json-map
          path: bpi.USD.rate
    wasmtest:
        processor: ipfs
        configParts: 
          - /ipfs/QmaCJierSWawinmRbDPAp9UEZiREdBxBV9erLSkDv51Bjd          
- processor: json-transform
  transformView:
    messageWithWasm:
        processor: concat
        paths: 
          - btcusd
          - wasmtest
- processor: json-transform
  transformView:
    messageWithWasm:
      processor: json-map
      path: messageWithWasm
    hash:
        processor: pipeline
        processors:
        - processor: json-map
          path: messageWithWasm
        - processor: encode-decode
          inputEncoding: utf8
          outputEncoding: hex
        - processor: sha256
        - processor: encode-decode
          inputEncoding: hex
          outputEncoding: base64
- processor: json-transform
  transformView:
    messageWithWasm:
      processor: json-map
      path: messageWithWasm
    hash:
      processor: json-map
      path: hash
    signature:
      processor: pipeline
      processors:
        - processor: json-map
          path: hash
        - processor: encode-decode
          inputEncoding: utf8
          outputEncoding: hex
        - processor: ecdsa-sign
`};

// import theme style
import 'codemirror/theme/base16-dark.css'
export default {
  data () {
    return {
      s: s,
      cmOptions: {
        tabSize: 4,
        mode: 'yaml',
        theme: 'base16-dark',
        lineNumbers: true,
        line: true,
        // more CodeMirror options...
      }
    }
  },
  methods: {
    onCmReady(cm) {
      //console.log('the editor is readied!', cm)
    },
    onCmFocus(cm) {
      //console.log('the editor is focused!', cm)
    },
    onCmCodeChange(newCode) {
      //console.log('this is new code', newCode)
      s.code = newCode;
    },
    onSubmit(){
          const channelText = s.code;
          const doc = window.dsp.yaml.safeLoad(channelText, 'utf8');
          dsp.backend.addChannel(doc,"test", "self");
    }
  },
  computed: {
    codemirror() {
      return this.$refs.cmEditor.codemirror
    }
  },
  mounted() {
    //console.log('the current CodeMirror instance object:', this.codemirror)
    // you can use this.codemirror to do something...
  }
}

</script>
<style>
</style>
