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

echo "https://ipfs.liquidapps.io/ipfs/$MAINHASH/?m=static/manifests/evmevmrelay1.yaml#/admin/event-log" "SUCCESSFUL"
echo "https://ipfs.liquidapps.io/ipfs/$MAINHASH/?m=static/manifests/evmevmrelay2.yaml#/admin/event-log" "SUCCESSFUL"