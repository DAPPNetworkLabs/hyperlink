
finish IBC:
    source contract
    fetch from source
    read from on chain nexus
    post to msig contract
    generic msig contract on eth (destination, paylaod, action)
    msig contract on eos (eosio.msig)
    oracle service: (to construct transaction data on chain - nonce, TaPOS block - use curren)


pi zero image - firefox at boot with kernel as start page (specialized for pi)
canvas - a bytearray image in the state
wasi:    
    execute another wasm from fs
    threads
    .h:        
        read config
        read secert
        listevents
        more imports and env
        isolated canvas - https://github.com/binji/wasm-clang/blob/8e78cdb9caa80f75ed86d6632cb4e9310b22748c/shared.js#L781
    callback
    promises
    object wrappers
    json support
    event sourcing based wasm runtime
    
config:    
    DSP config interaction ui

channel to connect with real nexus
fix: wait for cron to finish before dispatching new
setup:
    dsp:
        config:
             package details, eos nodes configuration ipfs hashes, refreshes             
        on every reboot - create seed with signer method (eos key or eth) - user approves with wallet
        *save seed in session
        *create dsp key
        [create dsp permissions with dsp key
        link dsp key to add packages 
        link permissons to nexus actions] - if needed, user approves with active key
        *add package - publish capabilities
        run
    consumer:
        keys and auth
ui for consumer:
    setup
    active channels    
    dev/create new channel:
        create new channel
        wait for state
        new permissions (@dsps) to any of state.publickey to allow consumer pays        
    events/monitoring - who performs, etc.
    create broadcast multisig bridges:
        source
        choose DSPs
        fuel resources
        deploy/configure contracts or addresses (or construct an msig address using tss):
            ethereum msig contract
            use eosio.msig for eos



processors:       

    relay:
        web relay
        websocket relay
        etc.
    add webrtc nexus
    nexux proxy processor:
        - posts new/remove channel actions as events 
        - posts events and state (ipfs merkle tree of state for channels) changes to chain
        config: 
            predefined channels
            reset state on boot - optional
            statesynctype: enable/disable/periodic
            statesyncformat: ipfs/raw
            eventssynctype: enable/disable/periodic
            eventssyncformat: ipfs chain/raw

predefined backends webclient:
    dspnexus -> webrtc -> nexus
    onchain nexus -> eosio -> dspnexus proxy -> webrtc -> nexus

identity layer - fb, telegram , etc

https://webassembly.studio/?f=kkh88rkmin


