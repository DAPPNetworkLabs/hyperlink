const assert = require('assert');
const { serialize, deserialize } = require('../utils/serialize');
const { eccSignHash, eccPublicBytes } = require('../utils/crypto');

const NEXUS_NAME = 'nexus';
const BRIDGE_NAME = 'gatehouse';

const NEXUS_WASM_PATH = `./contracts/eos/hyperlink/build/hyperlink/${NEXUS_NAME}.wasm`;
const NEXUS_ABI_PATH = `./contracts/eos/hyperlink/build/hyperlink/${NEXUS_NAME}.abi`;

const BRIDGE_WASM_PATH = `./contracts/eos/hyperlink/build/hyperlink/${BRIDGE_NAME}.wasm`;
const BRIDGE_ABI_PATH = `./contracts/eos/hyperlink/build/hyperlink/${BRIDGE_NAME}.abi`;

const delay = ms => new Promise(res => setTimeout(res, ms));
const delaySec = sec => delay(sec * 1000);


describe.skip("LiquidApps HyperLink", function (eoslime) {

    // Increase mocha(testing framework) time, otherwise tests fails
    this.timeout(150000);

    let accounts;

    let nexus;
    let bridge;

    let users;
    let relayers;
    let gatekeepers;


    before(async () => {
        users = await eoslime.Account.createRandoms(3);
        relayers = await eoslime.Account.createRandoms(3);
        gatekeepers = await eoslime.Account.createRandoms(3);
    });

    beforeEach(async () => {
        /*
           `deploy` creates for you a new account behind the scene
           on which the contract code is deployed

           You can access the contract account as -> contract.executor
       */
        nexus = await eoslime.Contract.deploy(NEXUS_WASM_PATH, NEXUS_ABI_PATH);
        bridge = await eoslime.Contract.deploy(BRIDGE_WASM_PATH, BRIDGE_ABI_PATH);
        console.log("nexus",nexus);
        console.log("bridge",bridge);
        await bridge.executor.addPermission('eosio.code');

        await spawnChannels();
        await configureBridge();
    });

    const spawnChannels = async() => {
        for(let id in relayers) {
            let relayer = relayers[id];
            let key = await eccPublicBytes(relayer.publicKey);
            await nexus.actions.open([bridge.executor.name, relayer.name, "Source", 194], {from: bridge.executor});
            await nexus.actions.join([id, key], {from: relayer});
            
        }
    }

    const configureBridge = async() => {
        for(let id in relayers) {
            let relayer = relayers[id];
            let key = await eccPublicBytes(relayer.publicKey);
            await bridge.actions.addsigner([key], {from: bridge.executor});            
        }
    }

    it("Should open and join channels", (done) => {
        (async () => {
            let channels = await nexus.tables.channels.limit(10).find();
            console.log(channels);
            done();
        })();
    });

    it("Should add gatekeepers to gatehouse", (done) => {
        (async () => {
            let signers = await bridge.tables["sub.signers"].limit(10).find();
            console.log(signers);
            done();  
        })();
    });

    it("Should publish events", (done) => {
        (async () => {
            await bridge.actions.transfer([users[0].name, users[1].name, 100000], {from: users[0]});
            await bridge.actions.transfer([users[1].name, users[2].name, 200000], {from: users[1]});
            await bridge.actions.transfer([users[2].name, users[0].name, 300000], {from: users[2]});
            let events = await bridge.tables["pub.events"].limit(10).find();
            console.log(events);
            done();  
        })();
    });

    it("Should relay events", (done) => {
        (async () => {
            await bridge.actions.transfer([users[0].name, users[1].name, 100000], {from: users[0]});
            let events = await bridge.tables["pub.events"].limit(10).find();
            let hash = events[0].eventHash;
            let data = events[0].eventData;

            for(let id in relayers) {
                let relayer = relayers[id];
                let key = await eccPublicBytes(relayer.publicKey);
                let sig = await eccSignHash(relayer.privateKey, hash);
                await nexus.actions.relay([id, "success", key, sig, hash, data], {from: relayer});            
            }

            events = await nexus.tables.events.limit(10).find();
            console.log(events);
            done();
        })();
    });

    it("Should transmit to bridge", (done) => {
        (async () => {
            await bridge.actions.transfer([users[0].name, users[1].name, 100000], {from: users[0]});
            let events = await bridge.tables["pub.events"].limit(10).find();
            console.log(events);

            let hash = events[0].eventHash;
            let data = events[0].eventData;

            for(let id in relayers) {
                let relayer = relayers[id];
                let key = await eccPublicBytes(relayer.publicKey);
                let sig = await eccSignHash(relayer.privateKey, hash);
                await nexus.actions.relay([id, "success", key, sig, hash, data], {from: relayer});    
            }

            events = await nexus.tables.events.limit(10).find();

            for(let id in gatekeepers) {
                let gatekeeper = gatekeepers[id];
                let {signer, signature, eventHash, eventData} = events[id];
                await bridge.actions.ingest([signer, signature, eventHash], {from: gatekeeper});   
            }

            events = await bridge.tables["sub.events"].limit(10).find();
            console.log(events);

            await bridge.actions.digest([data], {from: gatekeepers[0]});   

            events = await bridge.tables["sub.events"].limit(10).find();
            console.log(events);

            events = await bridge.tables["pub.events"].limit(10).find();
            console.log(events);
            done();
        })();
    });
});
