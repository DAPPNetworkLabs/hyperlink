# better way to do this? Also TODO eos 
cd contracts/eth && truffle compile && cd ../..
cd contracts/eos/hyperlink && rm -r build && mkdir build && cd build
cmake .. && make 
cd ../../../..
