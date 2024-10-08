import { createLightNode, waitForRemotePeer, createEncoder, utf8ToBytes, createDecoder,bytesToUtf8 } from '@waku/sdk';
import express from 'express';
import pkg from 'protobufjs';
import socket from 'socket.io';
import http from "http";
import cors from "cors";
import Server from "socket.io";
import dotenv from 'dotenv';
dotenv.config()


const { Type, Field } = pkg;
const app = express();
const port = 3005;
const server = http.createServer(app);
const contentTopic="/toy-chat/2/huilong/proto";
app.use(cors());


const io = socket(server, {
  cors: {
    origin: "*",
    credentials:true,
  },
});
io.on("connection", (socket) => {
  global.chatSocket = socket;
 console.log("Connection established")
})
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
    io.emit('recieve', messageObj);
  
  })
};

// Create a filter subscription
const subscription = await node.filter.createSubscription();

// Subscribe to content topics and process new messages
await subscription.subscribe([Decoder], callback);

//commit3
//commit4
//commit5
//commit6
//commit7
//commit8
//commit9
//commit10
//commit11
//commit12

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
app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});
app.use(express.json({
  limit: "100mb",
  extended: true
}));
app.use(express.urlencoded({
  limit: "100mb",
  extended: true,
  parameterLimit: 50000
}));
// Home route
app.post('/publish', async (req, res) => {

  res.send(await initWakuContext({ name : req?.body?.name,text : req?.body?.text}));
});

// 404 Not Found route
app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

// Start the server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
