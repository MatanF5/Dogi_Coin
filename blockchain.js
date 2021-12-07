const SHA256 = require('crypto-js/sha256')
const EC = require('elliptic').ec
const ec = new EC('secp256k1')
const { MerkleTree } = require('merkletreejs')
const {
    PartitionedBloomFilter
} = require('bloom-filters')

const pendingTransactionToExport = []
const myKey1 = ec.keyFromPrivate('04411cc35f4d3040cc864778dbafea18cfb7edee03d2eef2f4c0029e7d18df5798f7d0c0313fb8758a7a2950a2c2784c4e32e378dc3e0a164d7fde0e564e0537ad')
const myKey2 = ec.keyFromPrivate('04a60ef1727cb3d41402b8e7d7b5577144dbe0b989dea7abc148255ee370f34dc2c4bcecc38bed7b9d8eed3aa070caa5d7f3961c6b3bbafbf2f4b54ca4e95f6438')
const myWalletAddress1 = myKey1.getPublic('hex')
const myWalletAddress2 = myKey2.getPublic('hex')
const miningRewardAddress = myWalletAddress2

const wallets = [{}, { private: myKey1, public: myWalletAddress1 }, { private: myKey2, public: myWalletAddress2 }]

class Transaction {
    constructor(fromAddress, toAddress, amount) {
        this.fromAddress = fromAddress
        this.toAddress = toAddress
        this.amount = amount
        this.timestamp = Date.now()
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

    toString() {
        return SHA256(this.fromAddress + this.toAddress + this.amount + this.timestamp + this.signature).toString()
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

        //Create a PartitionedBloomFilter optimal for a collections of items and a desired error rate
        this.filter = new PartitionedBloomFilter(120, 5, 0.5)

        for (let trx of this.transactions) {
            this.filter.add(trx.toString())
        }
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
        this.miningReward = 100
    }

    createGenesisBlock() {
        return new Block(Date.parse('2017-01-01'), [], '0');
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1]
    }

    loadTransactionsIntoBlocks(transactionPool) {
        let counter = 0;
        for (const element of transactionPool) {
            let newTransaction = new Transaction(wallets[element.fromAddress].public, wallets[element.toAddress].public, element.amount)
            newTransaction.signTransaction(wallets[element.fromAddress].private)
            pendingTransactionToExport.push(newTransaction)
            this.addTransaction(newTransaction)
            counter += 1;

            if (counter % 4 === 0) {
                this.miningPendingTransaction(miningRewardAddress)
            }
        }
    }

    miningPendingTransaction(miningRewardAddress) {
        const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward)
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
        this.pendingTransaction.push(transaction)
    }

    getTotalBalanceOBlockChain() {
        let totalSum = 0
        totalSum += this.getBalanceOfAddress(wallets[1].public)
        totalSum += this.getBalanceOfAddress(wallets[2].public)
        return totalSum + 3000 // 3000 is the amount of the initial wallets value
    }
    getBalanceOfAddress(address) {
        let balance = 0
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
}


module.exports.Blockchain = Blockchain
module.exports.Block = Block
module.exports.Transaction = Transaction
module.exports.PendingTransaction = pendingTransactionToExport