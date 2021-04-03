import { DSPEvent, BaseChannelProcessor, factory } from "@liquidapps/dsp-lib-base";
import Web3 from "web3";
import { JsonRpc, Api, Serialize } from 'eosjs'
import { TextEncoder, TextDecoder } from 'text-encoding';
import { JsSignatureProvider } from "eosjs/dist/eosjs-jssig"; // development only
import fetch from "node-fetch";

// TODO: annoying path/require?
const link = require('../../../../../../contracts/eth/build/contracts/link.json');

export class EosEthRelayerChannelProcessor extends BaseChannelProcessor {
    pushEosTimer: any;
    pushEthTimer: any;
    current_state: any;
    _state: any;
    _inExecution: boolean;

    async finalize(): Promise<void> {
        //clearInterval(this.timer);
    }    
    
    async initNew(): Promise<void>{
        await super.initNew();
        // generalize this init?
        const ethEndpoint = this._config.ethEndpoint;
        const ethPrivateKey = this._config.ethPrivateKey;
        const ethContractAddress = this._config.ethContractAddress;
        const eosEndpoint = this._config.eosEndpoint;
        const eosPrivateKey = this._config.eosPrivateKey;
        const eosAccountName = this._config.eosAccountName;
        const eosBridgeAccountName = this._config.eosBridgeAccountName;
        const gasPriceMultiplier = this._config.gasPriceMultiplier || 1.2;
        if (!eosEndpoint) throw new Error('Missing eosEndpoint');
        if (!eosPrivateKey) throw new Error('Missing eosPrivateKey');
        if (!eosBridgeAccountName) throw new Error('Missing eosBridgeAccountName');
        if (!eosAccountName) throw new Error('Missing eosAccountName');
        if (!ethEndpoint) throw new Error('Missing ethEndpoint');
        if (!ethPrivateKey) throw new Error('Missing ethPrivateKey');
        if (!ethContractAddress) throw new Error('Missing ethContractAddress');

        this._dspFacilities.log("INFO", { message: "starting", config: this._config });
        const rpc = new JsonRpc(eosEndpoint, { fetch });        
        const signatureProvider = new JsSignatureProvider([eosPrivateKey]);
        const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

        const web3 = new Web3(ethEndpoint);
        const account = web3.eth.accounts.wallet.add(ethPrivateKey);
        const web3Nonce = await web3.eth.getTransactionCount(account.address);
        if (!this._state) this._state = {};
        const stateNonce = this._state.nonce || 0;
        const nonce = Math.max(web3Nonce, stateNonce);
        this._state = {
            nonce,
            address: account.address
        }

        this.current_state = {
            startTime: new Date().getTime(),
            web3,
            rpc,
            api,
            ethAddress: account.address,
            ethPrivateKey,
            eosAccountName,
            gasPriceMultiplier
        };

        this.pushEosTimer = setInterval(() => this.pushEos(this._dspFacilities), this._config.interval ? this._config.interval * 1000 : 10000);
        this.pushEthTimer = setInterval(() => this.pushEth(this._dspFacilities), this._config.interval ? this._config.interval * 1000 : 10000);
        this._dspFacilities.log("INFO", { message: "started relayer" });
    }

    async getNonce(): Promise<Number> {
        // TODO: handle nonce recovery?
        return this._state.nonce;
    }

    // mimics flow of eos -> eth messages, reads next_incoming_batch_id from eth,
    // checks if exists on eth, saves to local state (prevents dups due to eth tx time)
    // and posts to eth
    async getLatestEthIncomingMessage(dspFacilities): Promise<any> {
        const web3 = this.current_state.web3;
        const rpc = this.current_state.rpc;
        const linkContract = new web3.eth.Contract(link.abi, this._config.ethContractAddress)
        const nextInboundEthMessageId = await linkContract.methods.next_incoming_message_id().call();
        dspFacilities.log("INFO", { message: "hello", nextInboundEthMessageId });
        if (!this.current_state.nextInboundEthMessageId) {
            this.current_state.nextInboundMessageId = nextInboundEthMessageId;
        }
        if (nextInboundEthMessageId < this.current_state.nextInboundMessageId) {
            // wait until state updates, we are ahead. TODO: logger
            return;
        }
        // check if next inbound message exists on eos
        // TODO: all needs to be replaced with nexus?
        // TODO: pmessages -> cmessages once contract refactored
        const eosMessagesRes = await rpc.get_table_rows({
            json: true,
            table: "pmessages",
            code: this._config.eosBridgeAccountName,
            scope: this._config.eosBridgeAccountName,
            limit: 1,
            lower_bound: nextInboundEthMessageId
        });
        if (!eosMessagesRes.rows.length) {
            // no new messagees, TODO: log?
            return {};
        }
        // check proper id, validation
        const message = eosMessagesRes.rows[0];
        if (message.id !== nextInboundEthMessageId) {
            // throw/error? check - should never happen
        }
        // TODO: we need to not use ipfs in contract or something
        return message;
    }

    // mimics flow of eth -> eos messages, reads next_inbound_batch_id
    // from eos settings, checks if that batch exists in eth outbound
    // messages, if so reads it and returns it serialized
    async getLatestEosIncomingMessage(dspFacilities): Promise<any> {
        const web3 = this.current_state.web3;
        const rpc = this.current_state.rpc;
        const linkContract = new web3.eth.Contract(link.abi, this._config.ethContractAddress)

        // TODO: all needs to be replaced with nexus?
        const eosSettingsRes = await rpc.get_table_rows({
            json: true,
            table: "settings",
            code: this._config.eosBridgeAccountName,
            scope: this._config.eosBridgeAccountName,
            limit: 1
        });
        dspFacilities.log("INFO", { message: eosSettingsRes });
        if (eosSettingsRes.rows.length !== 1) throw new Error('invalid eos link settings');
        const eosSettings = eosSettingsRes.rows[0];
        const nextInboundMessageId = eosSettings.next_inbound_message_id;
        // try catch?
        const outboundEthBatchId = await linkContract.methods.outbound(nextInboundMessageId).call();
        const outboundEthBatch = await linkContract.methods.batches(outboundEthBatchId).call();
        return outboundEthBatch;
    }

    async pushEosTrx(message: string, id: Number, destination: string): Promise<any> {
        const eosContract = await this.current_state.api.contract(destination);
        return eosContract.pushinbound({
            message,
            id
        }, {
            authorization: `${this.current_state.eosAccountName}@active` //TODO: new permissions?
        });
    }

    async pushEthTrx(trxData: string, destination: string): Promise<any> {
        const nonce = await this.getNonce();
        const web3 = this.current_state.web3;
        const ethGasPrice = await web3.eth.getGasPrice();
        const gasPrice = ethGasPrice * this.current_state.gasPriceMultiplier;
        const privateKey = this.current_state.ethPrivateKey;
        const rawTx = {
            nonce: this.numberToHex(nonce),
            to: destination,
            data: trxData,
            value: this.numberToHex(0),
            gasPrice,
            gasLimit: this.numberToHex(5000000) // TODO: estimate gas or use config
        }
        const tx = await web3.eth.accounts.signTransaction(rawTx, privateKey);
        this._state.nonce++;
        return web3.eth.sendSignedTransaction(tx.rawTransaction);
    }

    async pushEos(dspFacilities): Promise<any> {
        dspFacilities.log("INFO", { message: "started push eos" });
        const message = await this.getLatestEosIncomingMessage(dspFacilities);
        dspFacilities.log("INFO", { message: 'latest eos message', eosMessage: message });
        return;
        const txHash = await this.pushEosTrx(message.message, message.id, this._config.eosBridgeAccountName);
        dspFacilities.log("INFO", { message: "push eos trx", txHash });
        return txHash;
    }

    async pushEth(dspFacilities): Promise<any> {
        dspFacilities.log("INFO", { message: "started push eth" });
        const message = await this.getLatestEthIncomingMessage(dspFacilities);
        dspFacilities.log("INFO", { message: 'latest eth message', ethMessage: message });
        return;
        //const txHash = await this.pushEthTrx(message.message, this._config.ethContractAddress);
        //dspFacilities.log("INFO", { message: "push eth trx", txHash });
        //return txHash;
    }

    numberToHex(number: any): string {
        if (typeof (number) == 'number')
          return `0x${number.toString(16)}`;
        if (typeof (number) == 'string' && !(number.startsWith('0x')))
          return `0x${parseInt(number).toString(16)}`;
        return number;
    }

    async start(): Promise<void> {
    }

    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {        
        return eventData;
    }
}

factory.addProcessor('eos-eth-relay', EosEthRelayerChannelProcessor );