import { DSPEvent, BaseChannelProcessor } from "@liquidapps/dsp-lib-base";
import Web3 from "web3";
import * as ecc from 'eosjs-ecc'
const Base58 = require('base-58');

// TODO: annoying path/require?
const link = require('../../../../../../contracts/eth/build/contracts/evmtokenpeg.json');
interface Message {
    message: string,
    id: string
};
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
            account1: account1.address,
            account2: account2.address
        };

        this.current_state = {
            startTime: new Date().getTime(),
            gasPriceMultiplier,
            web3Evm1,
            web3Evm2,
            evm1PrivateKey,
            evm2PrivateKey
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
        const outboundEvm2Message = await linkContract2.methods.getOutboundMessage(nextInboundEvm1MessageId).call();
        //return { ...outboundEvm2Message, id: nextInboundEvm1MessageId };
        return outboundEvm2Message;
    }

    async getLatestEvm2IncomingMessage(dspFacilities): Promise<any> {
        const web3Evm1 = this.current_state.web3Evm1;
        const web3Evm2 = this.current_state.web3Evm2;
        const linkContract1 = new web3Evm1.eth.Contract(link.abi, this._config.evm1ContractAddress)
        const linkContract2 = new web3Evm2.eth.Contract(link.abi, this._config.evm2ContractAddress)
        const nextInboundEvm2MessageId = await linkContract2.methods.next_incoming_message_id().call();
        dspFacilities.log("INFO", { message: "hello", nextInboundEvm2MessageId });
        if (!this.current_state.nextInboundEvm2MessageId) {
            this.current_state.nextInboundEvm2MessageId = nextInboundEvm2MessageId;
        }
        if (nextInboundEvm2MessageId < this.current_state.nextInboundEvm2MessageId) {
            // wait until state updates, we are ahead. TODO: logger
            return;
        }
        const outboundEvm1Message = await linkContract1.methods.getOutboundMessage(nextInboundEvm2MessageId).call();
        //return { ...outboundEvm1Message, id: nextInboundEvm2MessageId };
        return outboundEvm1Message;
    }

    async pushEvm1Trx(message: Message, nonce: any): Promise<any> {
        const web3 = this.current_state.web3Evm1;
        const medGasPrice = await web3.eth.getGasPrice();
        const gasPrice = medGasPrice * this.current_state.gasPriceMultiplier;
        const privateKey = this.current_state.evm1PrivateKey;
        const linkContract = new web3.eth.Contract(link.abi, this._config.evm1ContractAddress)
        this._dspFacilities.log("INFO", { message: "building raw tx evm1", msg: message });
        const trxData = linkContract.methods.pushInboundMessage(message.id, message.message).encodeABI();
        let gasLimit;
        try {
            gasLimit = await linkContract.methods.pushInboundMessage(
                message.id,
                message.message
            ).estimateGas({ from: this._state.account1 });
            this._dspFacilities.log("INFO", { message: `gas limit: ${gasLimit}` });
        } catch(e) {
            this._dspFacilities.log("ERROR", { message: e.message });
            return;
        };
        gasLimit = this.numberToHex(Math.round(parseInt(gasLimit) * 1.5));
        const rawTx = {
            nonce: this.numberToHex(nonce),
            to: this._config.evm1ContractAddress,
            data: trxData,
            value: this.numberToHex(0),
            gasPrice: gasPrice.toString(),
            gas: gasLimit
        }
        this._dspFacilities.log("INFO", { message: "pushing raw tx evm1", rawTx });
        const tx = await web3.eth.accounts.signTransaction(rawTx, privateKey);
        this._state.nonce1++;
        return web3.eth.sendSignedTransaction(tx.rawTransaction);
    }

    async pushEvm2Trx(message: Message, nonce: number): Promise<any> {
        const web3 = this.current_state.web3Evm2;
        const medGasPrice = await web3.eth.getGasPrice();
        const gasPrice = medGasPrice * this.current_state.gasPriceMultiplier;
        const privateKey = this.current_state.evm2PrivateKey;
        const linkContract = new web3.eth.Contract(link.abi, this._config.evm2ContractAddress)
        this._dspFacilities.log("INFO", { message: "building raw tx evm2", msg: message });
        const trxData = linkContract.methods.pushInboundMessage(message.id, message.message).encodeABI();
        let gasLimit;
        try {
            gasLimit = await linkContract.methods.pushInboundMessage(
                message.id,
                message.message
            ).estimateGas({ from: this._state.account2 });
            this._dspFacilities.log("INFO", { message: `gas limit: ${gasLimit}` });
        } catch(e) {
            this._dspFacilities.log("ERROR", { message: e.message });
            return;
        };
        gasLimit = this.numberToHex(Math.round(parseInt(gasLimit) * 1.5));
        const rawTx = {
            nonce: this.numberToHex(nonce),
            to: this._config.evm2ContractAddress,
            data: trxData,
            value: this.numberToHex(0),
            gasPrice: gasPrice.toString(),
            gas: gasLimit
        }
        this._dspFacilities.log("INFO", { message: "pushing raw tx evm2", rawTx });
        const tx = await web3.eth.accounts.signTransaction(rawTx, privateKey);
        this._state.nonce2++;
        return web3.eth.sendSignedTransaction(tx.rawTransaction);
    }

    async pushEvm2(dspFacilities): Promise<any> {
        dspFacilities.log("INFO", { message: "started push evm2" });
        const messageRes = await this.getLatestEvm2IncomingMessage(dspFacilities);
        dspFacilities.log("INFO", { message: 'latest evm2 message', ethMessage: messageRes });
        dspFacilities.log("INFO", { message: 'latest evm2 nonce', nonce: this._state.nonce2 });
        if (messageRes && messageRes.id && messageRes.message) {
            const message = { message: messageRes.message, id: messageRes.id };
            const txHash = await this.pushEvm2Trx(message, this._state.nonce2);
            dspFacilities.log("INFO", { message: "push evm2 trx", txHash });
            return txHash;
        }
        dspFacilities.log("INFO", { message: 'No evm2 message to push' });
    }

    async pushEvm1(dspFacilities): Promise<any> {
        dspFacilities.log("INFO", { message: "started push evm1" });
        const messageRes = await this.getLatestEvm1IncomingMessage(dspFacilities);
        dspFacilities.log("INFO", { message: 'latest evm1 message', ethMessage: messageRes });
        dspFacilities.log("INFO", { message: 'latest evm1 nonce', nonce: this._state.nonce1 });
        if (messageRes && messageRes.id && messageRes.message) {
            const message = { message: messageRes.message, id: messageRes.id };
            const txHash = await this.pushEvm1Trx(message, this._state.nonce1);
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