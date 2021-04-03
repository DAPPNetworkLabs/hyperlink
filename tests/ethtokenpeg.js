const Web3 = require('web3');
const contract = require('truffle-contract');
const fs = require('fs');
const path = require('path');

const TOKENPEG_EOS_WASM_PATH = './contracts/eos/hyperlink/build/hyperlink/ethtokenpeg.wasm';
const TOKENPEG_EOS_ABI_PATH = './contracts/eos/hyperlink/build/hyperlink/ethtokenpeg.abi';
const TOKEN_WASM_PATH = './contracts/eos/hyperlink/build/hyperlink/Token.wasm';
const TOKEN_ABI_PATH = './contracts/eos/hyperlink/build/hyperlink/Token.abi';

const eosEndpoint = 'http://127.0.0.1:8888';
const ethEndpoint = 'http://127.0.0.1:8545';

const web3 = new Web3(ethEndpoint);

describe("Eth Eos Token Peg", function(eoslime) {

  let tokenpegEos, tokenpegEth, tokenEos, tokenEth;
  let testAddressEth, testAccountEos;
  // start local env
  before(async () => {
    const availableAccounts = await web3.eth.getAccounts();
    testAddressEth = await availableAccounts[3];
    testAccountEos = await eoslime.Account.create('test', '5KPr7rCvvU7HJ7zHJkqFZ89rLaMz5tffWiVYYMy3dXNpv4RT5a7');
    const tokenpegEosAccount = await eoslime.Account.create('bridge', '5JZ86LxfhfhK5bLqQBZuihxvwmafZnpcQS3Ebn264UzKLuvzzWU');
    const { token, tokenpeg } = await deployEthContracts(); 
    tokenEth = token;
    tokenpegEth = tokenpeg;
    tokenpegEos = await eoslime.Contract.deployOnAccount(TOKENPEG_EOS_WASM_PATH, TOKENPEG_EOS_ABI_PATH, tokenpegEosAccount);
    tokenEos = await eoslime.Contract.deploy(TOKEN_WASM_PATH, TOKEN_ABI_PATH);

    await tokenEos.actions.create([tokenEos.name, "21000000 TKN"], {});
    await tokenEos.actions.issue([testAccountEos.name, "1000 TKN", "funding"], {});
    await tokenpegEos.actions.init([1, tokenEos.name, "0,TKN", 100, 1, 0], { from: tokenpegEosAccount });
    const relayFields = {
      eosAccountName: testAccountEos.name,
      eosPrivateKey: testAccountEos.privateKey,
      eosBridgeAccountName: tokenpegEos.name,
      ethContractAddress: tokenpegEth.address   
    }
    console.log(relayFields);
  });

  it("Transfers tokens from eos to eth", async () => {

  });

});

async function deployEthContracts() {
  const tokenpegJson = JSON.parse(fs.readFileSync(path.resolve('./contracts/eth/build/contracts/tokenpeg.json')));
  const tokenpegAbi = tokenpegJson.abi;
  const tokenpegBin = tokenpegJson.bytecode;
  const tokenJson = require('@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json');
  const tokenBin = tokenJson.bytecode;
  const tokenAbi = tokenJson.abi;
  const availableAccounts = await web3.eth.getAccounts();
  const masterAccount = availableAccounts[0];
  const signer1 = availableAccounts[2];
  const signer2 = availableAccounts[3];
  const signers = [signer1, signer2];
  const tokenContract = contract({
    abi: tokenAbi,
    unlinked_binary: tokenBin
  });
  const tokenpegContract = contract({
    abi: tokenpegAbi,
    unlinked_binary: tokenpegBin
  });
  tokenContract.setProvider(web3.currentProvider);
  tokenpegContract.setProvider(web3.currentProvider);
  const deployedToken = await tokenContract.new('Test Token', 'TST', {
    from: masterAccount,
    gas: '5000000'
  });
  //console.log(`Token address: ${deployedToken.address}`);
  const deployedTokenpeg = await tokenpegContract.new(signers, 2, deployedToken.address, {
    from: masterAccount,
    gas: '5000000'
  });
  //console.log(deployedTokenpeg.address)
  //bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  const minterRole = await deployedToken.MINTER_ROLE();
  await deployedToken.grantRole(minterRole, deployedTokenpeg.address, {
    from: masterAccount,
    gas: '5000000'
  });
  return { token: deployedToken, tokenpeg: deployedTokenpeg };
}
