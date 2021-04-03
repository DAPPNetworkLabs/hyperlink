const { bufferFactory, typeFactory } = require('./factories');

// serialize
// data must be a valid object that matches the specified type
// outputs a Buffer (std::vector<char>)
const serialize = async (typeName, data) => {    
    //TODO: Check the data for different types?
    //TODO: Nicer error if failure?
    const buf = bufferFactory();
    const type = await typeFactory(typeName);
    type.serialize(buf, data);
    return Buffer.from(buf.getUint8Array(buf.length));
}

//deserialize
//data must be a valid Buffer (std::vector<char>)
//outputs a valid object
const deserialize = async (typeName, data) => {
    const raw = Buffer.from(data,'hex'); //ensure we are a buffer    
    const buf = bufferFactory(raw);

    const type = await typeFactory(typeName);
    return type.deserialize(buf);
}

module.exports = { serialize, deserialize };