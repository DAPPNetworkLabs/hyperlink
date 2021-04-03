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
const protons = require('protons')
const uint8arrayFromString = require('uint8arrays/from-string')
const uint8arrayToString = require('uint8arrays/to-string')


const { Request, Stats } = protons(`
message Request {
  enum Type {
    SEND_MESSAGE = 0;
    STATS = 1;
  }
  required Type type = 1;
  optional SendMessage sendMessage = 2;
  optional Stats stats = 3;
}
message Event{
  required bytes data = 1;
  required bytes id = 2;
}
message SendMessage {
  repeated Event events = 1;
}
message Stats {
  enum NodeType {
    GO = 0;
    NODEJS = 1;
    BROWSER = 2;
  }
  repeated bytes connectedPeers = 1;
  optional NodeType nodeType = 2;
}
`)
export class Libp2pPubSubChannelProcessor extends BaseChannelProcessor {
    _libp2p: any;
  _peerId: any;
  _savedEvents: any[];
  private _hook: any;
//   streams: any = {};
  async initNew(){
    this._state= {
      counter:0
    }
  }
  async finalize(){

    this._libp2p.pubsub.removeListener(this._config.fromTopic, this._hook)
    this._libp2p.pubsub.unsubscribe(this._config.fromTopic)
  }
    
    async start(): Promise<void> {
          // Listen for new peers
        const a = this;
        if(!this._state.counter)
            this._state.counter = 0;        
        // this.streams = {}
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
        //   const from = connection.remotePeer.toB58String();          
        //   if(this.streams[from]){
        //     delete this.streams[from];          
        //     // closed
        //       await this._dspFacilities.log("INFO",{
        //         ltype:'libp2pPeerDisconnect',
        //         from,
        //         message:'libp2p disconnect (unssubscribe)'
        //       });
        //     }
          // else 
          // await this._dspFacilities.log("DEBUG",{
          //   ltype:'libp2pPeerDisconnect',
          //   from,
          //   message:'libp2p disconnect'
          // });
            
        });
        // const a = this;
       
        this._libp2p = libp2p;
        await libp2p.start();    
        await libp2p.pubsub.start()
        this._hook = async(message)=>{
          try {            
              const request = Request.decode(message.data);
              switch (request.type) {
                case Request.Type.SEND_MESSAGE:
                    const event = new DSPEvent(
                        (a._state.counter++).toString(),                      
                          {                                 
                              events: request.sendMessage.events.map(ev=>{
                                return {
                                  id: uint8arrayToString(ev.id),
                                  data: JSON.parse(uint8arrayToString(ev.data))
                                }
                              }),
                              from:message.from
                          }
                        );
                    await a.processWithHook([event])
                    break;
                 default:
                     throw new Error('unknown message type');
              }
            } catch (err) {
              console.error(err)
            }
        }
        if(this._config.fromTopic){
          libp2p.pubsub.on(this._config.fromTopic, this._hook);
          libp2p.pubsub.subscribe(this._config.fromTopic);
      }
        // announce address        
        this._state.addresses = libp2p.multiaddrs.map((ma) => 
        `${ma.toString()}/p2p/${this._peerId.toB58String()}`
          );
    }
    async process(eventData: DSPEvent[]): Promise<DSPEvent[]> {   
      if(this._config.toTopic){
          const msg = Request.encode({
              type: Request.Type.SEND_MESSAGE,
              sendMessage: {
                events: eventData.map(ev=>{
                  return {
                      id: uint8arrayFromString(ev.id),
                      data: uint8arrayFromString(JSON.stringify(ev.data)),
                  };})
              }
          })
          await this._libp2p.pubsub.publish(this._config.toTopic, msg);
      }
      return eventData;
    }
   
}
factory.addProcessor('libp2p-pubsub-source',Libp2pPubSubChannelProcessor);