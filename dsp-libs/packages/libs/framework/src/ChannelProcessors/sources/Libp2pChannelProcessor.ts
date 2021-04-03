import { BaseChannelProcessor, DSPEvent, factory, ConfigGenerator } from '@liquidapps/dsp-lib-base';
import Libp2p from 'libp2p'
import Websockets from 'libp2p-websockets'
import WebRTCStar from 'libp2p-webrtc-star'
import { NOISE } from 'libp2p-noise'
import Mplex from 'libp2p-mplex'
import Bootstrap from 'libp2p-bootstrap'
const multiaddr = require('multiaddr')
const PeerId = require('peer-id')
var toString = require('stream-to-string');
const KadDHT = require('libp2p-kad-dht')
const pipe = require('it-pipe')
import Gossipsub from 'libp2p-gossipsub'

export class Libp2pChannelProcessor extends BaseChannelProcessor {
    _libp2p: any;
  _peerId: any;
  _savedEvents: any[];
  streams: any = {};
  async initNew(){
    this._state= {
      counter:0
    }
  }
    async start(): Promise<void> {
          // Listen for new peers
        const a = this;
        if(!this._state.counter)
        this._state.counter = 0;
        this.streams = {}
          // const myPeerId = PeerId.createFromPrivKey('');
        this._peerId = await PeerId.create({ bits: 1024, keyType: 'rsa' });
        const libp2p = await Libp2p.create({
            peerId: this._peerId,
            addresses: {
              // Add the signaling server address, along with our PeerId to our multiaddrs list
              // libp2p will automatically attempt to dial to the signaling server so that it can
              // receive inbound connections from other peers
              listen: [
                '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
                '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star'
              ]
            },
            modules: {
              transport: [Websockets, WebRTCStar],
              connEncryption: [NOISE],
              streamMuxer: [Mplex],
              peerDiscovery: [Bootstrap],
              dht:KadDHT,
              pubsub:Gossipsub
            },
            config: {
              peerDiscovery: {
                // The `tag` property will be searched when creating the instance of your Peer Discovery service.
                // The associated object, will be passed to the service when it is instantiated.
                [Bootstrap.tag]: {
                  enabled: true,
                  list: [
                    '/dns4/ams-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
                    '/dns4/lon-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
                    '/dns4/sfo-3.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
                    '/dns4/sgp-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
                    '/dns4/nyc-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
                    '/dns4/nyc-2.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64'
                  ]
                },
                dht: {
                  enabled: true,
                  randomWalk: {
                    enabled: true
                  }
                }
              }
            }
          });
          
        libp2p.on('peer:discovery', async(peerId) => {
          // await this._dspFacilities.log("DEBUG",{
          //   ltype:'libp2pPeerDiscovery',
          //   from:peerId.toB58String(),
          //   message:'libp2p discovery'
          // });
                      
        })

        // Listen for new connections to peers
        libp2p.connectionManager.on('peer:connect', async (connection) => {
          const from = connection.remotePeer.toB58String();
          // await this._dspFacilities.log("DEBUG",{
          //   ltype:'libp2pPeerConnect',
          //   from,
          //   message:'libp2p connect'
          // });
        })

        // Listen for peers disconnecting
        libp2p.connectionManager.on('peer:disconnect', async(connection) => {
          const from = connection.remotePeer.toB58String();          
          if(this.streams[from]){
            delete this.streams[from];          
            // closed
              await this._dspFacilities.log("INFO",{
                ltype:'libp2pPeerDisconnect',
                from,
                message:'libp2p disconnect (unssubscribe)'
              });
            }
          // else 
          // await this._dspFacilities.log("DEBUG",{
          //   ltype:'libp2pPeerDisconnect',
          //   from,
          //   message:'libp2p disconnect'
          // });
            
        });
        // const a = this;
        
        await libp2p.handle(this._config.protocol, async ({ connection,stream }) => {          
          const from = connection.remotePeer.toB58String();          
          if(this._config.toPeerIds === true){
            // receiver, so must be a subscribe;
            await this._dspFacilities.log("INFO",{
              ltype:'libp2pPeerSubscribe',
              message:'libp2p subscribe'              
            })
            this.streams[from] = {stream,connection};
            return;
          }          
          if(!a._config.fromPeerIds)
            return;
          if(a._config.fromPeerIds !== true){
            if(!a._config.fromPeerIds[from])
              return;            
          }
          const events = [];
          await pipe(
            stream,
            async function (source) {
              for await (const msg of source) {
                events.push(new DSPEvent((a._state.counter++).toString(),          
                {
                  ts: new Date().getTime(),
                  from,
                  processorChannelId: a._channelId,
                  data: JSON.parse(msg)
                  }
                ));
              }
            }
          )
          a.processWithHook(events)

          // Read the stream and output to console          
        });
        this._libp2p = libp2p;
        await libp2p.start();          
        // announce address

        this._state.addresses = libp2p.multiaddrs.map((ma) => 
        `${ma.toString()}/p2p/${this._peerId.toB58String()}`
          );
        

    }
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {      
      if(this._config.toPeerIds){
        let streams;
        if(this._config.toPeerIds === true){
          // todo: to all connected peerids          
           streams = Object.keys(this.streams).map(from=>{
            return this.streams[from].stream;
          })
        }
        else{
          streams = await Promise.all(this._config.toPeerIds.map(async peerId => {
            return (await this._libp2p.dialProtocol(peerId, [this._config.protocol], {})).stream;
          }));
        }
        for (let index = 0; index < streams.length; index++) {
          const stream = streams[index];
          for (let index = 0; index < eventData.length; index++) {
            await pipe(
              [JSON.stringify(eventData[index])],
              stream
            )
          }    
        }        
      }
      return eventData;
    }
   
}
factory.addProcessor('libp2p-source',Libp2pChannelProcessor);