const topology = require('fully-connected-topology')
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const { argv,exit } = process
const { log } = console
const { me, peers } = extractPeersAndMyPort()
const {
    Blockchain,
    Transaction,
} = require('./blockChain.js')
const sockets = {}
const fs = require('fs');

const dogiCoin = new Blockchain();
let key = ec.genKeyPair();
const wallets = {};

log('---------------------')
log('Welcome server!')
log('me - ', me)
log('peers - ', peers)
log('connecting to peers...')

const myIp = toLocalIp(me)
const peerIps = getPeerIps(peers)
wallets[me] = {
    privateKey: key.getPrivate('hex'),
    publicKey: key.getPublic('hex'),
    key,
};
let transactionPool = [];
let count = 0;
let coinSum = 0;
const interval = (Math.random() * 5) * 1000 + 5000;
transactionPool = JSON.parse(fs.readFileSync('memPool.js', 'utf8'));

setInterval(() => {
    if (Object.keys(wallets).length < 3)
        return;
    for (let i = 0; i < 3; i++) {
        const tran1 = new Transaction
            (wallets[transactionPool[count].fromAddress].publicKey,
                wallets[transactionPool[count].toAddress].publicKey,
                transactionPool[count].amount
            );
        tran1.signTransaction(wallets[transactionPool[count].fromAddress].key);
        try {
            dogiCoin.addTransaction(tran1);
            sockets[transactionPool[count].fromAddress].write('Transaction Number:' + count + ' Success');
        } catch (err) {
            sockets[transactionPool[count].fromAddress].write('Transaction Number:' + count + ' Failed');
        }
        count++;
    }
    dogiCoin.miningPendingTransaction(wallets[me].publicKey);
    if (count === transactionPool.length) {
        Object.keys(wallets).forEach(wallet => {
            coinSum += dogiCoin.getBalanceOfAddress(wallets[wallet].publicKey);
        });
        console.log(`The amount of coin in the blockchain is: ${coinSum}\nThe Amount of Mined Coins: ${dogiCoin.mineCoins}\nCoin That Were Burned: ${dogiCoin.burnedCoins}\n`);
        exit(0);
    }
}, interval);

//connect to peers
topology(myIp, peerIps).on('connection', (socket, peerIp) => {
    const peerPort = extractPortFromIp(peerIp)
    log('connected to peer - ', peerPort)
    sockets[peerPort] = socket

    wallets[peerPort] = {
        privateKey: key.getPrivate('hex'),
        publicKey: key.getPublic('hex'),
        key
    };
});


//extract ports from process arguments, {me: first_port, peers: rest... }
function extractPeersAndMyPort() {
    return {
        me: argv[2],
        peers: argv.slice(3, argv.length)
    }
}


function toLocalIp(port) {
    return `127.0.0.1:${port}`
}


function getPeerIps(peers) {
    return peers.map(peer => toLocalIp(peer))
}

function extractPortFromIp(peer) {
    return peer.toString().slice(peer.length - 4, peer.length);
}


