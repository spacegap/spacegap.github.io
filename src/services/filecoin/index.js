import { LotusRPC } from '@filecoin-shipyard/lotus-client-rpc'
import { BrowserProvider } from '@filecoin-shipyard/lotus-client-provider-browser'
import Fil from 'js-hamt-filecoin'
const d3 = require('d3')
const bx = require('base-x')
const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
const b64 = bx(BASE64)

const f = d3.format('0.2f')

const schema = require('@filecoin-shipyard/lotus-client-schema').testnet.fullNode

const preCommitSchema = ({
  type: 'hamt',
  key: 'bigint',
  value: {
    info: {
      seal_proof: 'int',
      sector_number: 'int',
      sealed_cid: 'cid',
      seal_rand_epoch: 'int',
      deal_ids: ['list', 'int'],
      expiration: 'int',
      replace_capacity: 'bool',
      replace_sector_deadline: 'int',
      replace_sector_partition: 'int',
      replace_sector_number: 'int',
    },
    precommit_deposit: 'bigint',
    precommit_epoch: 'int',
    deal_weight: 'bigint',
    verified_deal_weight: 'bigint',
  },
})

function bytesToBig(p) {
  let acc = 0n
  for (let i = 0; i < p.length; i++) {
    acc *= 256n
    acc += window.BigInt(p[i])
  }
  return acc
}

export default class Filecoin {
  constructor(endpointUrl) {
    this.url = endpointUrl
    const provider = new BrowserProvider(endpointUrl)
    console.log('new endpoint', endpointUrl)
    this.client = new LotusRPC(provider, { schema })
  }
  close () {

  }

  async getData (head, path, schema) {
    const state = head.Blocks[0].ParentStateRoot['/']
    const data = (await this.client.chainGetNode(`${state}/${path}`)).Obj

    const self = this;
    return await Fil.methods.decode(schema, data).asObject(async (a) => {
      const res = await self.client.chainGetNode(a)
      return res.Obj
    })
  }

  async fetchHead () {
    return await this.client.chainHead()
  }

  async fetchPower (head) {
    const state = head.Blocks[0].ParentStateRoot['/']
    const storagePowerActorRaw = (await this.client.chainGetNode(`${state}/@Ha:t04/1`)).Obj
    return {
      'TotalRawBytePower': bytesToBig(b64.decode(storagePowerActorRaw[0])),
      'TotalBytesCommitted': bytesToBig(b64.decode(storagePowerActorRaw[1])),
      'TotalQualityAdjPower': bytesToBig(b64.decode(storagePowerActorRaw[2])),
      'TotalQABytesCommitted': bytesToBig(b64.decode(storagePowerActorRaw[3])),
      'TotalPledgeCollateral': bytesToBig(b64.decode(storagePowerActorRaw[4])),
      'ThisEpochRawBytePower': bytesToBig(b64.decode(storagePowerActorRaw[5])),
      'ThisEpochQualityAdjPower': bytesToBig(b64.decode(storagePowerActorRaw[6])),
      'ThisEpochPledgeCollateral': bytesToBig(b64.decode(storagePowerActorRaw[7])),
    }
  }

  async fetchDeposits (hash, head) {
    const state = await this.client.StateReadState(hash, head.Cids)
    const precommitdeposits = state.State.PreCommitDeposits
    const locked = state.State.LockedFunds
    const collateral = state.Balance
    const available = collateral - precommitdeposits - locked

    return {
      collateral: f(state.Balance / 1000000000000000000),
      available: f(available / 1000000000000000000),
      locked: f(locked / 1000000000000000000),
      precommitdeposits: f(precommitdeposits / 1000000000000000000),
    }
  }

  async getMiners () {
    const cached = window.localStorage.getItem('miners')
    if (cached) return JSON.parse(cached)

    const json = await (await fetch('https://filfox.info/api/v0/miner/list/power?pageSize=1000&page=0')).json()
    const miners = json.miners.reduce((acc, curr) => {
      acc[curr.address] = curr;
      return acc
    }, {})

    window.localStorage.setItem('miners', JSON.stringify(miners))

    return miners
  }

   async fetchDeadlines (hash, head) {
    const [deadline, deadlines] = await Promise.all([
      this.client.StateMinerProvingDeadline(hash, head.Cids),
      this.client.StateMinerDeadlines(hash, head.Cids)
    ])


    const nextDeadlines = [...Array(48)]
          .map((_, i) => ({
            ...deadlines[(deadline.Index + i) % 48],
            Close: deadline.Close + i * 60}))
          .map(({Close, LiveSectors, TotalSectors, FaultyPower}) => ({Close, LiveSectors, TotalSectors, FaultyPower}))

    const SectorsCount = deadlines
          .map(d => +d.LiveSectors)
          .reduce((acc, curr) => acc + curr, 0)

    const FaultsCount = deadlines
          .map(d => +d.FaultyPower.Raw)
          .reduce((acc, curr) => acc + curr, 0) / (32*1024*1024*1024)

    return {
      nextDeadlines,
      SectorsCount,
      FaultsCount,
      ActiveCount: SectorsCount - FaultsCount
    }
  }

  async fetchPreCommittedSectors (hash, head) {
    const preCommittedSectors = await this.getData(head, `@Ha:${hash}/1/5`, preCommitSchema)
    const PreCommitDeadlines = d3.groups(
      Object.keys(preCommittedSectors)
        .map(d => ({
          SectorNumber: preCommittedSectors[d].info.sector_number,
          Expiry: preCommittedSectors[d].precommit_epoch + (10000 + 60 + 150)
        })),
      d => d.Expiry)
          .map(([Expiry, Sectors]) => ({
            Expiry,
            Sectors: Sectors.map(d => d.SectorNumber)
          }))
          .sort((a, b) => a.Expiry - b.Expiry)

    return {PreCommitDeadlines, Count:  Object.keys(preCommittedSectors).length}
  }

  async fetchSectors (hash, head) {
    const sectorList = await this.client.StateMinerSectors(hash, null, null, head.Cids)
    const Sectors = sectorList.reduce((acc, curr) => {
      acc[curr.ID] = { number: curr.ID, info: curr }
      return acc
    }, {})

    const sectorsCount = Object.keys(Sectors).length
    return { sectorsCount, Sectors }
  }
}

