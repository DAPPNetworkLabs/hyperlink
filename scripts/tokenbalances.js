const Web3 = require('web3');
const contract = require('truffle-contract');
const tokenJson = require('@openzeppelin/contracts/build/contracts/ERC20.json');

const ethEndpoint1 = 'http://127.0.0.1:8545';
const ethEndpoint2 = 'http://127.0.0.1:9545';

const web3Evm1 = new Web3(ethEndpoint1);
const web3Evm2 = new Web3(ethEndpoint2);

const myArgs = process.argv.slice(2);
const tokenEvm1Address = myArgs[0];
const accountEvm1 = myArgs[1];
const tokenEvm2Address = myArgs[2];
const accountEvm2 = myArgs[3];

const tokenBin = tokenJson.bytecode;
const tokenAbi = tokenJson.abi;

const tokenContractEvm1 = contract({
  abi: tokenAbi,
  unlinked_binary: tokenBin,
})
tokenContractEvm1.setProvider(web3Evm1.currentProvider);
const tokenContractEvm2 = contract({
  abi: tokenAbi,
  unlinked_binary: tokenBin,
})
tokenContractEvm2.setProvider(web3Evm2.currentProvider);

let prevBalanceEvm1, prevBalanceEvm2;

async function run() {
  const tokenEvm1 = await tokenContractEvm1.at(tokenEvm1Address);
  const tokenEvm2 = await tokenContractEvm2.at(tokenEvm2Address);
  //console.log(JSON.stringify(tokenContractEvm1))
  const symbol1 = (await tokenEvm1.symbol.call());
  const symbol2 = (await tokenEvm2.symbol.call());
  const balance1 = (await tokenEvm1.balanceOf(accountEvm1)).toString();
  const balance2 = (await tokenEvm2.balanceOf(accountEvm2)).toString();
  if (balance1 !== prevBalanceEvm1 || balance2 !== prevBalanceEvm2) {
    console.log(`${accountEvm1} address balance of ${symbol1} on evm1 is ${balance1}`);
    console.log(`${accountEvm2} address balance of ${symbol2} on evm2 is ${balance2}`);
    console.log('----------------------------------------------------------');
    prevBalanceEvm1 = balance1;
    prevBalanceEvm2 = balance2;
  }
}

setInterval(run, 2000);
