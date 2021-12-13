const SHA256 = require('crypto-js/sha256')
const EC = require('elliptic').ec
const ec = new EC('secp256k1')
const { MerkleTree } = require('merkletreejs')
const {
    PartitionedBloomFilter
} = require('bloom-filters')

class Transaction {
    constructor(fromAddress, toAddress, amount) {
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.timestamp = Date.now();
    }

    calculateHash() {
        return SHA256(this.fromAddress + this.toAddress + this.amount + this.timestamp).toString();
    }
    signTransaction(signingKey) {
        if (signingKey.getPublic('hex') !== this.fromAddress) {
            throw new Error('You cannot sign transactions for other wallet')
        }
        const hashTx = this.calculateHash()
        const sig = signingKey.sign(hashTx, 'base64')
        this.signature = sig.toDER('hex')
    }

    isValid() {
        if (this.fromAddress === null) return true
        if (!this.signature || this.signature.length === 0) {
            throw new Error('No signature in the transaction')
        }
        const publicKey = ec.keyFromPublic(this.fromAddress, 'hex')
        return publicKey.verify(this.calculateHash(), this.signature)
    }

}



class Block {
    constructor(timestamp, transactions, previousHash = '') {
        this.previousHash = previousHash
        this.timestamp = timestamp
        this.transactions = transactions
        this.hash = this.calculateHash()
        this.nonce = 0

        // Merkle tree
        const leaves = transactions.map(x => SHA256(x))
        this.tree = new MerkleTree(leaves, SHA256)

        this.filter = new PartitionedBloomFilter(120, 5, 0.5)

        for (let trx of this.transactions) {
            this.filter.add(trx.calculateHash())
        }
    }

    ifTransactionExists(transaction) {
        return this.filter.has(transaction.calculateHash());
      }
    calculateHash() {
        return SHA256(this.timestamp + this.previousHash + JSON.stringify(this.transactions) + this.nonce).toString()
    }

    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')) {
            this.nonce++
            this.hash = this.calculateHash()
        }

        console.log('Block mined ' + this.hash);
    }

    hasValidTransactions() {
        for (const tx of this.transactions) {
            if (!tx.isValid()) {
                return false
            }
        }

        return true
    }

    hasTransactionInBlock(transaction) {
        return this.filter.has(transaction)
    }
}


class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()]
        this.difficulty = 2
        this.pendingTransaction = []
        this.miningReward = 10
        this.mineCoins = 0
        this.burnedCoins = 0
    }

    createGenesisBlock() {
        return new Block(Date.parse('2017-01-01'), [], '0');
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1]
    }

    miningPendingTransaction(miningRewardAddress) {
        let mineReward = this.miningReward;
        for (let i = 0; i < this.pendingTransaction.length; i++) {
            mineReward += this.chain.length + 1;
            this.burnedCoins += this.chain.length;
            this.mineCoins += this.pendingTransaction[i].amount;
          }
        const rewardTx = new Transaction(null, miningRewardAddress, mineReward)
        this.pendingTransaction.push(rewardTx)

        let block = new Block(Date.now(), this.pendingTransaction, this.getLatestBlock().hash)
        block.mineBlock(this.difficulty)
        console.log('Block successfully mined')

        this.chain.push(block)
        this.pendingTransaction = []
    }

    addTransaction(transaction) {
        if (!transaction.fromAddress || !transaction.toAddress) {
            throw new Error('Transaction must include from and to address')
        }
        if (!transaction.isValid()) {
            throw new Error('Cannot add invalid transaction')
        }
        if (this.getBalanceOfAddress(transaction.fromAddress) - transaction.amount - 1 - this.chain.length < 0){
            throw new Error('Not enough money in the wallet');
        }
        this.pendingTransaction.push(transaction);
    }


    getBalanceOfAddress(address) {
        let balance = 100
        for (const block of this.chain) {
            for (const trans of block.transactions) {

                if (trans.fromAddress === address) {
                    balance -= trans.amount
                }
                if (trans.toAddress === address) {
                    balance += trans.amount
                }
            }
        }

        return balance
    }


    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];
            if (!currentBlock.hasValidTransactions()) {
                return false;
            }

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }
            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }

    hasTransactionInBlockChain(transaction){
        for(let block of this.chain) {
            if(block.hasTransactionInBlock(transaction)){
                return true
            }
        }

        return false
    }

    printBlockChain(){
        for(let block of this.chain){
            console.log("block: " + block.hash)
            for(let tx of block.transactions)
            console.log("   transaction: " + tx.signature)
        }
    }
    
    printMinedCoins(){
        console.log("The Amount Of Coins Mined in the BlockChain is: " + this.mineCount*this.miningReward)
    }
}


module.exports.Blockchain = Blockchain
module.exports.Block = Block
module.exports.Transaction = Transaction