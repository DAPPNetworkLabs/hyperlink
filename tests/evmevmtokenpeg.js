const electron = require('electron');
const proc = require('child_process');
const Web3 = require('web3');
const contract = require('truffle-contract');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const delay = ms => new Promise(res => setTimeout(res, ms));

const ethEndpoint1 = 'http://127.0.0.1:8545';
const ethEndpoint2 = 'http://127.0.0.1:9545';

const web3Evm1 = new Web3(ethEndpoint1);
const web3Evm2 = new Web3(ethEndpoint2);

let tokenpegEvm1, tokenEvm1;
let tokenpegEvm2, tokenEvm2;
let testAddressEvm1, testAddressEvm2;

describe("Evm to Evm Token Peg", function(eoslime) {
  this.timeout(1000 * 60 * 5); // 5 minutes
  // spawn Electron
  const elecPath = path.resolve(__dirname, '../dsp-libs/packages/apps/electron/dist/main.bundle.js');
  const ipfsHash = fs.readFileSync(path.resolve(__dirname, '../dsp-libs/packages/apps/electron/.env'), 'utf-8').trim().split("=")[1];
  
  const child1 = proc.spawn(electron, [elecPath, '--no-sandbox'], { env: { ...process.env, QUERY: "?m=static/manifests/evmevmrelay1.yaml#/admin/event-log", IPFS_HASH: ipfsHash } });
  const child2 = proc.spawn(electron, [elecPath, '--no-sandbox'], { env: { ...process.env, QUERY: "?m=static/manifests/evmevmrelay2.yaml#/admin/event-log", IPFS_HASH: ipfsHash } });
  child1.stdout.on('data', (rawData) => {
    let data = getData(rawData.toString('utf-8'));
    fs.appendFileSync('edgedsp1.log', data);
  });
  child1.on('error', (error) => {
    const msg = `process errored with msg ${error}\n`;
    fs.appendFileSync('edgedsp1.log', msg);
  });
  child1.on('exit', (code) => {
    const msg = `process exited with code ${code}\n`;
    fs.appendFileSync('edgedsp1.log', msg);
  });
  child2.stdout.on('data', (rawData) => {
    let data = getData(rawData.toString('utf-8'));
    fs.appendFileSync('edgedsp2.log', data);
  });
  child2.on('error', (error) => {
    const msg = `process errored with msg ${error}\n`;
    fs.appendFileSync('edgedsp2.log', msg);
  });
  child2.on('exit', (code) => {
    const msg = `process exited with code ${code}\n`;
    fs.appendFileSync('edgedsp2.log', msg);
  });
  after(() => {
    process.exit();
  });
  // start local env
  before(async () => {
    const availableAccountsEvm1 = await web3Evm1.eth.getAccounts();
    testAddressEvm1 = availableAccountsEvm1[1];
    const availableAccountsEvm2 = await web3Evm2.eth.getAccounts();
    testAddressEvm2 = availableAccountsEvm2[1];
    const deployedContracts = await deployEthContracts(); 
    tokenpegEvm1 = deployedContracts.tokenpegEvm1;
    tokenpegEvm2 = deployedContracts.tokenpegEvm2;
    tokenEvm2 = deployedContracts.tokenEvm2;
    tokenEvm1 = deployedContracts.tokenEvm1;

    const approveRes1 = await tokenEvm1.approve(tokenpegEvm1.address, '1000000000', {
      from: testAddressEvm1,
      gas: '5000000'
    });
    const approveRes2 = await tokenEvm2.approve(tokenpegEvm2.address, '1000000000', {
      from: testAddressEvm2,
      gas: '5000000'
    });

    const relayFields = {
      tokenpegEvm1: tokenpegEvm1.address,
      tokenpegEvm2: tokenpegEvm2.address,
      tokenEvm2: tokenEvm2.address,
      tokenEvm1: tokenEvm1.address,
    }
    console.log(relayFields);
  });

  it("Transfers tokens from evm1 to evm2", (done) => {
    (async () => {
      try {
        const prevBalanceEvm2 = (await tokenEvm2.balanceOf(testAddressEvm2)).toString();
        const prevBalanceEvm1 = (await tokenEvm1.balanceOf(testAddressEvm1)).toString();
        assert.equal(prevBalanceEvm1, '1000000');
        assert.equal(prevBalanceEvm2, '0');
        await tokenpegEvm1.sendToken('500000', testAddressEvm2, {
          from: testAddressEvm1
        });
        await delay(40000);
        const postBalanceEvm2 = (await tokenEvm2.balanceOf(testAddressEvm2)).toString();
        const postBalanceEvm1 = (await tokenEvm1.balanceOf(testAddressEvm1)).toString();
        assert.equal(postBalanceEvm1, '500000');
        assert.equal(postBalanceEvm2, '500000');
        done();
      } catch(e) {
        done(e);
      }
    })();
 });

  it("Transfers tokens from evm2 to evm1", (done) => {
    (async () => {
      try {
        const prevBalanceEvm2 = (await tokenEvm2.balanceOf(testAddressEvm2)).toString();
        const prevBalanceEvm1 = (await tokenEvm1.balanceOf(testAddressEvm1)).toString();
        assert.equal(prevBalanceEvm1, '500000');
        assert.equal(prevBalanceEvm1, '500000');
        await tokenpegEvm2.sendToken('500000', testAddressEvm1, {
          from: testAddressEvm2
        });
        await delay(40000);
        const postBalanceEvm2 = (await tokenEvm2.balanceOf(testAddressEvm2)).toString();
        const postBalanceEvm1 = (await tokenEvm1.balanceOf(testAddressEvm1)).toString();
        assert.equal(postBalanceEvm1, '1000000');
        assert.equal(postBalanceEvm2, '0');
        done();
      } catch(e) {
        done(e);
      }
    })();
  });
});

async function deployEthContracts() {
  const tokenpegJson = JSON.parse(fs.readFileSync(path.resolve('./contracts/eth/build/contracts/evmtokenpeg.json')));
  const tokenpegAbi = tokenpegJson.abi;
  const tokenpegBin = tokenpegJson.bytecode;
  const tokenJson = require('@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json');
  const tokenBin = tokenJson.bytecode;
  const tokenAbi = tokenJson.abi;
  const availableAccountsEvm1 = await web3Evm1.eth.getAccounts();
  const availableAccountsEvm2 = await web3Evm2.eth.getAccounts();
  const masterAccountEvm1 = availableAccountsEvm1[0];
  const masterAccountEvm2 = availableAccountsEvm2[0];
  const evm1Signer1 = availableAccountsEvm1[2];
  const evm1Signer2 = availableAccountsEvm1[3];
  const evm1Signers = [evm1Signer1, evm1Signer2];
  const evm2Signer1 = availableAccountsEvm2[2];
  const evm2Signer2 = availableAccountsEvm2[3];
  const evm2Signers = [evm2Signer1, evm2Signer2];
  const tokenContractEvm1 = contract({
    abi: tokenAbi,
    unlinked_binary: tokenBin
  });
  const tokenpegContractEvm1 = contract({
    abi: tokenpegAbi,
    unlinked_binary: tokenpegBin
  });
  tokenContractEvm1.setProvider(web3Evm1.currentProvider);
  tokenpegContractEvm1.setProvider(web3Evm1.currentProvider);
  const tokenContractEvm2 = contract({
    abi: tokenAbi,
    unlinked_binary: tokenBin
  });
  const tokenpegContractEvm2 = contract({
    abi: tokenpegAbi,
    unlinked_binary: tokenpegBin
  });
  tokenContractEvm2.setProvider(web3Evm2.currentProvider);
  tokenpegContractEvm2.setProvider(web3Evm2.currentProvider);

  const deployedTokenEvm1 = await tokenContractEvm1.new('Test Token', 'TST', {
    from: masterAccountEvm1,
    gas: '5000000'
  });
  const deployedTokenpegEvm1 = await tokenpegContractEvm1.new(
    evm1Signers,
    2,
    deployedTokenEvm1.address,
    0,
    '1000000000000000000',
    '1000000000000000000',
    '1',
    '1000000000000000000',
  {
    from: masterAccountEvm1,
    gas: '5000000'
  });
  const minterRole = await deployedTokenEvm1.MINTER_ROLE();
  await deployedTokenEvm1.grantRole(minterRole, deployedTokenpegEvm1.address, {
    from: masterAccountEvm1,
    gas: '5000000'
  });
  await deployedTokenEvm1.grantRole(minterRole, masterAccountEvm1, {
    from: masterAccountEvm1,
    gas: '5000000'
  });
  await deployedTokenEvm1.mint(testAddressEvm1, '1000000', {
    from: masterAccountEvm1,
    gas: '5000000'
  });
  
  const deployedTokenEvm2 = await tokenContractEvm2.new('Test Token', 'TST', {
    from: masterAccountEvm2,
    gas: '5000000'
  });
  const deployedTokenpegEvm2 = await tokenpegContractEvm2.new(
    evm2Signers,
    2,
    deployedTokenEvm2.address,
    1,
    '1000000000000000000',
    '1000000000000000000',
    '1',
    '1000000000000000000',
  {
    from: masterAccountEvm2,
    gas: '5000000'
  });
  await deployedTokenEvm2.grantRole(minterRole, deployedTokenpegEvm2.address, {
    from: masterAccountEvm2,
    gas: '5000000'
  });

  return {
    tokenEvm1: deployedTokenEvm1,
    tokenpegEvm1: deployedTokenpegEvm1,
    tokenEvm2: deployedTokenEvm2,
    tokenpegEvm2: deployedTokenpegEvm2
  };
}

function getData(rawData) {
  let lastIdx = 0;
  let data = [];
  while (true) {
    let tsIdx = rawData.indexOf("data: ", lastIdx);
    if (tsIdx == -1) break;
    let openIdx = rawData.indexOf("{", tsIdx);
    let parentheses = ["{"];
    let curIdx = openIdx + 1;
    while (parentheses.length) {
      const cur = rawData.charAt(curIdx);
      if (cur == "}") parentheses.pop();
      if (cur == "{") parentheses.push("{");
      curIdx++;
    }
    lastIdx = curIdx;
    data.push(rawData.substring(tsIdx, curIdx));
  }
  return data.join('\n') + '\n';
}
