import { DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
import Web3 from "web3";
import * as ecc from 'eosjs-ecc'
const Base58 = require('base-58');

// TODO: annoying path/require?
const link = require('../../../../../../contracts/eth/build/contracts/link.json');

export class EvmEvmRelayerChannelProcessor extends BaseChannelProcessor {
    pushEvm1Timer: any;
    pushEvm2Timer: any;
    current_state: any;
    _inExecution: boolean;

    async finalize(): Promise<void> {
        //clearInterval(this.timer);
    }    
    
    async initNew(): Promise<void>{
        await super.initNew();
        const _secret1 = await this.getSecret(this._config.secretName1 || 'default1');
        const _secret2 = await this.getSecret(this._config.secretName2 || 'default2');
        const _wif1 = ecc.seedPrivate(_secret1);
        const _wif2 = ecc.seedPrivate(_secret2);
        // TODO: allow pk from config in future? otherwise need to fund secret pub key in tests
        const evm1PrivateKey = this._config.evm1PrivateKey || `0x${Buffer.from(Base58.decode(_wif1)).toString('hex').substring(2,66)}`;
        const evm2PrivateKey = this._config.evm2PrivateKey || `0x${Buffer.from(Base58.decode(_wif2)).toString('hex').substring(2,66)}`;

        // generalize this init?
        const evm1Endpoint = this._config.evm1Endpoint;
        const evm1ContractAddress = this._config.evm1ContractAddress;
        const evm2Endpoint = this._config.evm2Endpoint;
        const evm2ContractAddress = this._config.evm2ContractAddress;
        const gasPriceMultiplier = this._config.gasPriceMultiplier || 1.2;
        if (!evm1Endpoint) throw new Error('Missing evm1Endpoint');
        if (!evm1PrivateKey) throw new Error('Missing evm1PrivateKey');
        if (!evm1ContractAddress) throw new Error('Missing evm1ContractAddress');
        if (!evm2Endpoint) throw new Error('Missing evm2Endpoint');
        if (!evm2PrivateKey) throw new Error('Missing evm2PrivateKey');
        if (!evm2ContractAddress) throw new Error('Missing evm2ContractAddress');

        this._dspFacilities.log("INFO", { message: "starting", config: this._config });

        const web3Evm1 = new Web3(evm1Endpoint);
        const account1 = web3Evm1.eth.accounts.wallet.add(evm1PrivateKey);
        const web3Nonce1 = await web3Evm1.eth.getTransactionCount(account1.address);
        if (!this._state) this._state = {};
        const stateNonce1 = this._state.nonce || 0;
        const nonce1 = Math.max(web3Nonce1, stateNonce1);

        const web3Evm2 = new Web3(evm2Endpoint);
        const account2 = web3Evm2.eth.accounts.wallet.add(evm2PrivateKey);
        const web3Nonce2 = await web3Evm2.eth.getTransactionCount(account2.address);
        const stateNonce2 = this._state.nonce || 0;
        const nonce2 = Math.max(web3Nonce2, stateNonce2);
        this._state = {
            nonce1,
            nonce2,
            account1,
            account2
        };

        this.current_state = {
            startTime: new Date().getTime(),
            gasPriceMultiplier,
            web3Evm1,
            account1,
            web3Evm2,
            account2,
        };

        this.pushEvm1Timer = setInterval(() => this.pushEvm1(this._dspFacilities), this._config.interval ? this._config.interval * 1000 : 10000);
        this.pushEvm2Timer = setInterval(() => this.pushEvm2(this._dspFacilities), this._config.interval ? this._config.interval * 2000 : 20000);
        this._dspFacilities.log("INFO", { message: "started relayer" });
    }

    async getNonce(): Promise<Number> {
        // TODO: handle nonce recovery?
        return this._state.nonce;
    }

    async getLatestEvm1IncomingMessage(dspFacilities): Promise<any> {
        const web3Evm1 = this.current_state.web3Evm1;
        const web3Evm2 = this.current_state.web3Evm2;
        const linkContract1 = new web3Evm1.eth.Contract(link.abi, this._config.evm1ContractAddress)
        const linkContract2 = new web3Evm2.eth.Contract(link.abi, this._config.evm2ContractAddress)
        const nextInboundEvm1MessageId = await linkContract1.methods.next_incoming_message_id().call();
        dspFacilities.log("INFO", { message: "hello", nextInboundEvm1MessageId });
        if (!this.current_state.nextInboundEvm1MessageId) {
            this.current_state.nextInboundEvm1MessageId = nextInboundEvm1MessageId;
        }
        if (nextInboundEvm1MessageId < this.current_state.nextInboundEvm1MessageId) {
            // wait until state updates, we are ahead. TODO: logger
            return;
        }
        const outboundEvm2BatchId = await linkContract2.methods.outbound(nextInboundEvm1MessageId).call();
        const outboundEvm2Batch = await linkContract2.methods.batches(outboundEvm2BatchId).call();
        return outboundEvm2Batch;
    }

    async getLatestEvm2IncomingMessage(dspFacilities): Promise<any> {
        const web3Evm1 = this.current_state.web3Evm1;
        const web3Evm2 = this.current_state.web3Evm2;
        const linkContract1 = new web3Evm1.eth.Contract(link.abi, this._config.evm1ContractAddress)
        const linkContract2 = new web3Evm2.eth.Contract(link.abi, this._config.evm2ContractAddress)
        const nextInboundEvm2MessageId = await linkContract2.methods.next_incoming_message_id().call();
        dspFacilities.log("INFO", { message: "hello", nextInboundEvm2MessageId });
        if (!this.current_state.nextInboundEvm1MessageId) {
            this.current_state.nextInboundEvm2MessageId = nextInboundEvm2MessageId;
        }
        if (nextInboundEvm2MessageId < this.current_state.nextInboundEvm2MessageId) {
            // wait until state updates, we are ahead. TODO: logger
            return;
        }
        const outboundEvm1BatchId = await linkContract1.methods.outbound(nextInboundEvm2MessageId).call();
        const outboundEvm1Batch = await linkContract1.methods.batches(outboundEvm1BatchId).call();
        return outboundEvm1Batch;
    }

    async pushEvm1Trx(trxData: string, destination: string): Promise<any> {
        const nonce = await this._state.nonce1;
        const web3 = this.current_state.web3Evm1;
        const medGasPrice = await web3.eth.getGasPrice();
        const gasPrice = medGasPrice * this.current_state.gasPriceMultiplier;
        const privateKey = this.current_state.evm1PrivateKey;
        const rawTx = {
            nonce: this.numberToHex(nonce),
            to: destination,
            data: trxData,
            value: this.numberToHex(0),
            gasPrice,
            gasLimit: this.numberToHex(5000000) // TODO: estimate gas or use config
        }
        const tx = await web3.eth.accounts.signTransaction(rawTx, privateKey);
        this._state.nonce1++;
        return web3.eth.sendSignedTransaction(tx.rawTransaction);
    }

    async pushEvm2Trx(trxData: string, destination: string): Promise<any> {
        const nonce = await this._state.nonce2;
        const web3 = this.current_state.web3Evm2;
        const medGasPrice = await web3.eth.getGasPrice();
        const gasPrice = medGasPrice * this.current_state.gasPriceMultiplier;
        const privateKey = this.current_state.evm2PrivateKey;
        const rawTx = {
            nonce: this.numberToHex(nonce),
            to: destination,
            data: trxData,
            value: this.numberToHex(0),
            gasPrice,
            gasLimit: this.numberToHex(5000000) // TODO: estimate gas or use config
        }
        const tx = await web3.eth.accounts.signTransaction(rawTx, privateKey);
        this._state.nonce2++;
        return web3.eth.sendSignedTransaction(tx.rawTransaction);
    }

    async pushEvm2(dspFacilities): Promise<any> {
        dspFacilities.log("INFO", { message: "started push evm2" });
        const message = await this.getLatestEvm2IncomingMessage(dspFacilities);
        dspFacilities.log("INFO", { message: 'latest evm2 message', ethMessage: message });
        if (message) {
            const txHash = await this.pushEvm2Trx(message.message, this._config.ethContractAddress);
            dspFacilities.log("INFO", { message: "push evm2 trx", txHash });
            return txHash;
        }
        dspFacilities.log("INFO", { message: 'No evm2 message to push' });
    }

    async pushEvm1(dspFacilities): Promise<any> {
        dspFacilities.log("INFO", { message: "started push evm1" });
        const message = await this.getLatestEvm1IncomingMessage(dspFacilities);
        dspFacilities.log("INFO", { message: 'latest evm1 message', ethMessage: message });
        if (message) {
            const txHash = await this.pushEvm1Trx(message.message, this._config.ethContractAddress);
            dspFacilities.log("INFO", { message: "push evm1 trx", txHash });
            return txHash;
        }
        dspFacilities.log("INFO", { message: 'No evm1 message to push' });
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

import { factory } from "@liquidapps/dsp-lib-base";

factory.addProcessor('evm-evm-relay', EvmEvmRelayerChannelProcessor);