import { Block } from 'poet-js'

import { BlockchainService } from '../blockchain/domainService'
import { Queue } from '../queue'
import { BitcoinBlockMetadata } from '../events'
import { getConnection } from '../blockchain/connection'
import { ClaimsToDBConfiguration } from './configuration'

export class ClaimsToDb {
  private configuration: ClaimsToDBConfiguration
  private queue: Queue
  private blockchain: BlockchainService

  constructor(configuration: ClaimsToDBConfiguration) {
    this.configuration = configuration
    this.blockchain = new BlockchainService()
    this.queue = new Queue()
  }

  public async start() {
    await this.blockchain.start(() => getConnection(this.configuration.db))

    console.log('Retrieving last processed block...')
    const latest = await this.blockchain.getLastProcessedBlock()
    console.log(`Latest processed block was ${latest}.`)

    console.log(`Initializing scan.`)
    this.queue.announceBitcoinBlockProcessed(latest)

    this.queue.blockDownloaded().subscribeOnNext(this.blockDownloaded)
    this.queue.blocksToSend().subscribeOnNext(this.blocksToSend)
    this.queue.bitcoinBlock().subscribeOnNext(this.bitcoinBlock)
  }

  private blockDownloaded = async (block: Block) => {
    console.log('Storing block', block.id)
    try {
      await this.blockchain.blockSeen(block)
    } catch (error) {
      console.log(error, error.stack)
      this.queue.dispatchWork('blockRetry', block)
    }
  }

  private blocksToSend = async (block: Block) => {
    console.log('Storing block', block.id)
    try {
      await this.blockchain.blockSeen(block)
    } catch (error) {
      console.log(error, error.stack)
      this.queue.dispatchWork('blockRetry', block)
    }
  }

  private bitcoinBlock = async (block: BitcoinBlockMetadata) => {
    for (let poetTx of block.poet) {
      try {
        poetTx.bitcoinHash = block.blockHash
        poetTx.bitcoinHeight = block.blockHeight
        poetTx.timestamp = block.timestamp
        const blockInfo = (await this.blockchain.getBlockInfoByTorrentHash(poetTx.torrentHash))
        if (blockInfo && blockInfo.timestamp) {
          continue
        }
        console.log('Confirming block with torrent hash', poetTx.torrentHash)
        await this.blockchain.blockConfirmed(poetTx)
      } catch (error) {
        console.log(error, error.stack)
        this.queue.dispatchWork('confirmRetry', poetTx)
      }
    }

    this.blockchain.storeBlockProcessed(block)
    this.queue.announceBitcoinBlockProcessed(block.blockHeight)
  }

}