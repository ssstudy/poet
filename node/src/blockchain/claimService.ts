import {Block as PureBlock, Claim as PureClaim} from "../claim";
import {Connection, Repository} from "typeorm";
import {ClaimBuilder} from "../serialization/builder";
import {getHash} from "../helpers/torrentHash";
import {BlockMetadata} from "../events";
import Claim from "./orm/claim";
import BlockInfo from "./orm/blockInfo";
import ClaimInfo from "./orm/claimInfo";
import Block from "./orm/block";

export class ClaimService {

  db: Connection
  starting: boolean
  started: boolean
  creator: ClaimBuilder

  constructor() {
    this.starting = false
    this.started = false
  }

  async start(getConnection: () => Promise<Connection>,
              getBuilder: () => Promise<ClaimBuilder>) {
    if (this.starting) {
      return
    }
    this.starting = true
    this.db = await getConnection()
    this.creator = await getBuilder()
    this.started = true
    return
  }

  async blockSeen(block: PureBlock) {

    await this.saveBlockIfNotExists(block)

    const id = await getHash(this.creator.serializeBlockForSave(block), block.id)

    const preliminarInfo = {
      hash: block.id,
      torrentHash: id
    }

    const blockInfo = await this.getBlockInfoByTorrentHash(id)

    if (blockInfo) {

      const unknownContents = !blockInfo.hash

      if (unknownContents) {

        await this.updateBlockInfo(blockInfo, preliminarInfo)

        return await this.updateClaimInfoForBlock(blockInfo, block)

      }

    } else {

      // This will just update the SHA256 hash on the db entry
      const blockData = await this.createOrUpdateBlockInfo(preliminarInfo)

      // Remember to store info for claims
      await this.updateClaimInfoForBlock(preliminarInfo, block)

      return blockData

    }
  }

  async blockConfirmed(blockInfo: BlockMetadata) {

    const existent = await this.getBlockInfoByTorrentHash(blockInfo.torrentHash)

    if (existent) {
      if (!existent.bitcoinHeight) {
        await this.updateBlockInfo(existent, blockInfo)
      }

      const block = await this.getBlock(blockInfo.hash)

      if (block) {

        return await this.updateClaimInfoForBlock(blockInfo, block)

      }

    } else {

      return await this.createOrUpdateBlockInfo(blockInfo)

    }
  }

  private async saveBlockIfNotExists(block: PureBlock) {

    const exists = await this.getBlock(block.id)

    if (exists) {
      return
    }

    const claimSet: Claim[] = []
    for (let claim of block.claims) {
      claimSet.push(await this.storeClaim(claim))
    }

    return await this.blockRepository.persist(this.blockRepository.create({
      id: block.id,
      claims: claimSet
    }))
  }

  async storeClaim(claim: PureClaim) {

    const attributeSet = []

    for (let key in claim.attributes) {
      const value: string = claim.attributes[key]
      attributeSet.push({key, value, claim: claim.id})
    }

    return await this.claimRepository.persist(this.claimRepository.create({
      ...claim,
      attributes: attributeSet
    }))
  }

  async updateClaimInfoForBlock(blockInfo: BlockMetadata, block: PureBlock) {

    const results = []

    for (let index in block.claims) {

      const claim = block.claims[index]
      results.push(await this.createOrUpdateClaimInfo(claim, { ...blockInfo, claimOrder: parseInt(index, 10) }))

    }
    return results
  }

  async createOrUpdateClaimInfo(claim: PureClaim, txInfo: BlockMetadata) {

    const existent = (await this.claimInfoRepository.findOne({ hash: claim.id })) as ClaimInfo

    if (existent) {

      console.log('Claim already exists')
      return await this.claimInfoRepository.persist(Object.assign(existent, txInfo))

    } else {

      return await this.claimInfoRepository.persist(this.claimInfoRepository.create({
        ...txInfo,
        hash: claim.id,
        blockHash: txInfo.hash,
        blockHeight: txInfo.height,
      }))

    }
  }

  async getBlock(id: string) {
    const blockEntry = await this.fetchBlock(id)

    if (!blockEntry) {
      return null
    }
    const block = {id, claims: [] as PureClaim[]} as PureBlock
    for (let claimEntry of blockEntry.claims) {
      const claim = ClaimService.transformEntityToPureClaim(claimEntry)
      block.claims.push(claim)
    }
    return block
  }

  private async fetchBlock(id: string) {
    const blockEntry = await this.blockRepository.createQueryBuilder('block')
      .where('block.id=:id')
      .leftJoinAndMapMany('block.claims', 'block.claims', 'claim')
      .setParameters({id})
      .getOne()
    if (!blockEntry) {
      return
    }
    blockEntry.claims = await this.claimRepository.createQueryBuilder('claim')
      .leftJoinAndMapMany('claim.attributes', 'claim.attributes', 'attribute')
      .where('claim.id IN (:claims)')
      .setParameters({claims: blockEntry.claims.map(claim => claim.id)})
      .getMany()
    return blockEntry
  }

  public static transformEntityToPureClaim(claimEntry: Claim) {
    if (!claimEntry) {
      console.log('Asked to confirm for null entry', claimEntry)
      return
    }
    const attributes: {[key: string]: string} = {}
    for (let attribute of claimEntry.attributes) {
      attributes[attribute.key] = attribute.value
    }
    return {
      id: claimEntry.id,
      publicKey: claimEntry.publicKey,
      signature: claimEntry.signature,
      type: claimEntry.type,
      attributes
    } as PureClaim
  }

  async getBlockInfoByTorrentHash(torrentHash: string) {
    return this.blockInfoRepository.findOne({torrentHash: torrentHash})
  }

  async getHeight(blockMetadata: BlockMetadata) {
    return await this.blockInfoRepository.createQueryBuilder('info')
        .where(`info.height<:height OR 
           (info.height=:height AND info.transactionOrder<:transactionOrder) OR
           (info.height=:height AND info.transactionOrder=:transactionOrder AND info.outputIndex<:outputIndex)`)
        .setParameters(blockMetadata)
        .getCount() + 1
  }

  public async createOrUpdateBlockInfo(blockMetadata: BlockMetadata) {

    const existent = await this.getBlockInfoByTorrentHash(blockMetadata.torrentHash)

    if (existent) {

      return await this.updateBlockInfo(existent, blockMetadata)

    } else {

      const entity = this.blockInfoRepository.create(blockMetadata)
      return await this.blockInfoRepository.persist(entity)

    }
  }

  public async updateBlockInfo(existent: BlockInfo, blockMetadata: BlockMetadata): Promise<BlockInfo> {

    for (let key of Object.keys(blockMetadata)) {

      const blockKey: keyof BlockMetadata = key as keyof BlockMetadata

      if (blockMetadata[blockKey] !== null && blockMetadata[blockKey] !== undefined) {
        existent[blockKey] = blockMetadata[blockKey]
      }

    }
    existent.height = await this.getHeight(existent)

    return await this.blockInfoRepository.persist(existent)
  }

  async getClaim(id: string) {
    const claim = await this.claimRepository.createQueryBuilder('claim')
      .leftJoinAndMapMany('claim.attributes', 'claim.attributes', 'attribute')
      .where('claim.id=:id')
      .setParameters({id})
      .getOne()
    if (!claim) {
      return
    }
    return ClaimService.transformEntityToPureClaim(claim)
  }

  async getClaimInfo(id: string) {
    return await this.claimInfoRepository.findOne({hash: id})
  }

  get blockInfoRepository(): Repository<BlockInfo> {
    return this.db.getRepository(BlockInfo)
  }

  get claimRepository(): Repository<Claim> {
    return this.db.getRepository(Claim)
  }

  get claimInfoRepository(): Repository<ClaimInfo> {
    return this.db.getRepository(ClaimInfo)
  }

  get blockRepository(): Repository<Block> {
    return this.db.getRepository(Block)
  }
}
