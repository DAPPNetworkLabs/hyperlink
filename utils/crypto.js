const ecc = require( "eosjs-ecc" );
const { PrivateKey, Signature } = ecc;
const { serialize } = require('./serialize');


//TODO:verify types?
const eccSigBytes = async (signature) => {
    return await serialize("signature", signature);
}

const eccPublicBytes = async(publicKey) => {
    return await serialize("public_key", publicKey);
}

const eccToPublicBytes = async(privkey) => {
    const wif = ( PrivateKey.fromString( privkey ) ).toWif();
    const pub = PrivateKey.fromString(wif).toPublic().toString();
    return eccPublicBytes(pub);
}

const eccSignHash = async(privkey, data) => {
    const wif = ( PrivateKey.fromString( privkey ) ).toWif();
    const sig = ecc.signHash(data, wif, 'hex');
    return await eccSigBytes(sig);
}

module.exports = {eccSignHash, eccSigBytes, eccPublicBytes}