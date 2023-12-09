import { createLightNode, waitForRemotePeer, createEncoder, utf8ToBytes, createDecoder,bytesToUtf8 } from '@waku/sdk';
import express from 'express';
import pkg from 'protobufjs';
import socket from 'socket.io';
import http from "http";


const { Type, Field } = pkg;
const app = express();
const port = 3005;
const server = http.createServer(app);
const contentTopic="/toy-chat/2/huilong/proto";

const io = socket(server, {
  cors: {
    origin: "*",
    credentials:true,
  },
});
const Encoder = createEncoder({ contentTopic });
const Decoder = createDecoder( contentTopic );

  
const ChatMessage = new Type("ChatMessage")
  .add(new Field("timestamp", 1, "uint64"))
  .add(new Field("sender", 2, "string"))
  .add(new Field("message", 3, "bytes"));

const node = await createLightNode({ defaultBootstrap: true });

await node.start();
await waitForRemotePeer(node);

// Create the callback function
const callback = (wakuMessage) => {
  console.log("message returned");
  // Check if there is a payload on the message
  if (!wakuMessage.payload) return;
  // Render the messageObj as desired in your application
  const messageObj = ChatMessage.decode(wakuMessage.payload);
  console.log(messageObj);
  console.log(bytesToUtf8(messageObj.message));
  io.on("connection", (socket) => {
    global.chatSocket = socket;
    io.emit('receive', messageObj);
  
  })
};

// Create a filter subscription
const subscription = await node.filter.createSubscription();

// Subscribe to content topics and process new messages
await subscription.subscribe([Decoder], callback);



async function initWakuContext({ name,text }) {
   
  
const protoMessage = ChatMessage.create({
    timestamp: Date.now(),
    sender: name,
    message: utf8ToBytes(text),
});

const serialisedMessage = ChatMessage.encode(protoMessage).finish();

await node.lightPush.send(Encoder, {
    payload: serialisedMessage,
});
    const localPeerId = node.libp2p.peerId.toString();
  
    const remotePeers = await node.libp2p.peerStore.all();
    const remotePeerIds = remotePeers.map((peer) => peer.id.toString());
    return {
        info: {
          contentTopic,
          localPeerId,
          remotePeerIds,
        }
      };
   
  }

// Define routes
app.use(express.json());

// Home route
app.post('/', async (req, res) => {

  res.send(await initWakuContext({ name : req?.body?.name,text : req?.body?.text}));
});

// 404 Not Found route
app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
