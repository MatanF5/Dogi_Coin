const {
    Blockchain,
    Transaction
} = require('./blockchain.js');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const myKey =
    ec.keyFromPrivate('50c963fdb1557d9caa85be8e8c8846dc31b1af8fb9d2e9e2cdf13d758a325030')
const myWalletAddress = myKey.getPublic('hex');
const dogiChain = new Blockchain();
const tx1 = new Transaction(myWalletAddress, 'address2', 27);
tx1.signTransaction(myKey);
dogiChain.addTransaction(tx1);
dogiChain.miningPendingTransaction(myWalletAddress);

console.log();
console.log('Balance of dogi is', dogiChain.getBalanceOfAddress(myWalletAddress));

const tx2 = new Transaction(myWalletAddress, 'address1', 2);
tx2.signTransaction(myKey);
dogiChain.addTransaction(tx2);
dogiChain.miningPendingTransaction(myWalletAddress);

console.log();
console.log('Balance of dogi is', dogiChain.getBalanceOfAddress(myWalletAddress));

console.log();
console.log('Blockchain valid?', dogiChain.isChainValid() ? 'yes' : 'no');