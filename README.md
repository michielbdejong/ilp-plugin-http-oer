# ilp-plugin-http-oer
Simple peer-to-peer plugin that POSTs ILP packets over HTTP, written in typescript

npm install typescript -g
npm install
tsc index.ts

# Connecting to Amundsen
To connect to Amundsen using this protocol, use `btp+wss://:${token}@amundsen.ilpdemo.org:1801/` where ${token} is your own unique token, which you should generate randomly. You can only connect as a client (sender), not as a server (receiver).
