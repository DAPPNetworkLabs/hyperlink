#!/usr/bin/env bash

projectdeps(){
    npm install
    cd dsp-libs
    lerna bootstrap
    cd ..
}
build(){
    #npm i -g truffle
    #cd contracts/eth && truffle compile && cd ../..
    npm run compileEth
    cd contracts/eos/hyperlink
    mkdir build
    cd build
    cmake ..
    make 
    cd ../../../..
    cd dsp-libs
    lerna run build --stream
    cd ..    
}
unittests(){
    npm i -g ganache-cli electron --unsafe-perm
    bash scripts/start.sh
    bash scripts/deploy.sh
    sleep 10
    xvfb-run -a npm test
}
systemtests(){
    echo TBD
}

postBuildStatus () {
  bbuild \
    -o ${BITBUCKET_REPO_OWNER} \
    -r ${BITBUCKET_REPO_SLUG} \
    -c ${BITBUCKET_COMMIT} \
    -u ${BB_USER} \
    -p ${BB_PASSWORD} \
    -s $5 \
    -k "$1" -n "$2" -d "$3" -l "$4"
}

GIT_CLONE_COMMIT_MESSAGE_AUTHOR=`git log -1 --pretty=formaat:'%an'`
GIT_CLONE_COMMIT_MESSAGE_BODY=`git log -1 --pretty=%B`

deploy() {
    cd dsp-libs/packages/apps

    cd web
    MAINHASH=`ipfs --api=/dns/ipfs.liquidapps.io/tcp/5001 add -Q -r dist`
    echo "main: $MAINHASH"
    cd ..
    echo "IPFS_HASH=$MAINHASH" > ./electron/.env
    
    cd webcomponents/dev
    DEVHASH=`ipfs --api=/dns/ipfs.liquidapps.io/tcp/5001 add -Q -r dist/index.html`
    echo "dev component: $DEVHASH"
    cd ../..

    cd ../../..
    if [ "$BITBUCKET_BRANCH" == "master" ]
    then
        deployment/upsert_recordset.sh edge-kernel.liquidapps.io TXT "\\\"dnslink=/ipfs/$MAINHASH\\\""
        deployment/upsert_recordset.sh dev-ui.liquidapps.io TXT "\\\"dnslink=/ipfs/$DEVHASH\\\""
    fi
    postBuildStatus EdgeDSP "IPFS Link" "$GIT_CLONE_COMMIT_MESSAGE_AUTHOR" "https://ipfs.liquidapps.io/ipfs/$MAINHASH" "SUCCESSFUL"
}