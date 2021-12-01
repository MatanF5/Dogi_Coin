const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const key = ec.genKeyPair();
const publicKey = key.getPublic('hex');
const privateKey = key.getPrivate('hex');
console.log();
console.log('Your public key (also wallet address ,free sharable)\n', publicKey);
console.log();
console.log("your private key(keep this secret! to sign transaction)\n", privateKey);