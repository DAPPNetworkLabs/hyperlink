const { Serialize } = require('eosjs');
const { TextEncoder, TextDecoder } = require('util');

const bufferFactory = (data) => {
    return new Serialize.SerialBuffer({textDecoder: new TextDecoder(), textEncoder: new TextEncoder(), array: data}); 
}

const typeFactory = async (typeName) => {
    let abi = "{}";
    const types = Serialize.getTypesFromAbi(Serialize.createInitialTypes(), "{}");
    return types.get(typeName);
}

module.exports = { bufferFactory, typeFactory };