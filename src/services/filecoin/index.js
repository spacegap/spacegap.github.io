import { LotusRPC } from '@filecoin-shipyard/lotus-client-rpc'
import { BrowserProvider } from '@filecoin-shipyard/lotus-client-provider-browser'
import Fil from 'js-hamt-filecoin'
const d3 = require('d3')

const f = d3.format('0.2f')

const schema = require('@filecoin-shipyard/lotus-client-schema').testnet
  .fullNode

const endpointUrl = 'wss://lotus.jimpick.com/spacerace_api/0/node/rpc/v0'
const provider = new BrowserProvider(endpointUrl)
const client = new LotusRPC(provider, { schema })

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

const load = async function (a) {
  const res = await client.chainGetNode(a)
  return res.Obj
}

const getData = async function (head, path, schema) {
  const state = head.Blocks[0].ParentStateRoot['/']
  const data = (await client.chainGetNode(`${state}/${path}`)).Obj
  return await Fil.methods.decode(schema, data).asObject(load)
}


export const fetchHead = async () => {
  return await client.chainHead()
}

export const fetchDeposits = async (hash, head) => {
  const state = await client.StateReadState(hash, head.Cids)
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

export const getMiners = async () => {
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

export const fetchDeadlines = async (hash, head) => {
  const [deadline, deadlines] = await Promise.all([
          client.StateMinerProvingDeadline(hash, head.Cids),
          client.StateMinerDeadlines(hash, head.Cids)
  ])

  const nextDeadlines = [...Array(48)]
        .map((_, i) => ({
          ...deadlines[(deadline.Index + i) % 48],
          Close: deadline.Close + i * 60}))
        .filter(d => d.TotalSectors)
        .map(({Close, LiveSectors, TotalSectors, FaultyPower}) => ({Close, LiveSectors, TotalSectors, FaultyPower}))

  return {nextDeadlines}
}

export const fetchPreCommittedSectors = async (hash, head) => {
  const preCommittedSectors = await getData(head, `@Ha:${hash}/1/5`, preCommitSchema)
  const preCommitDeadlines = d3.groups(
    Object.keys(preCommittedSectors)
      .map(d => ({
        SectorNumber: +d,
        Expiry: preCommittedSectors[d].precommit_epoch + (10000+1)
      })),
    d => d.Expiry)
        .map(([Expiry, Sectors]) => ({
          Expiry,
          Sectors: Sectors.map(d => d.SectorNumber)
        }))
        .sort((a, b) => a.Expiry - b.Expiry)

  return preCommitDeadlines
}

export const fetchSectors = async (hash, head) => {
  const sectors = (
    await client.StateMinerSectors(hash, null, null, head.Cids)
  ).reduce((acc, curr) => {
    acc[curr.ID] = { number: curr.ID, state: 'committed' }
    return acc
  }, {})

  // const faults = (await client.StateMinerFaults(hash, head.Cids)).reduce(
  //   (acc, curr) => {
  //     acc[curr] = true
  //     return acc
  //   },
  //   {}
  // )

  // const recoveries = (
  //   await client.StateMinerRecoveries(hash, head.Cids)
  // ).reduce((acc, curr) => {
  //   acc[curr] = true
  //   return acc
  // }, {})

  const sectorsCount = Object.keys(sectors).length

  return { sectorsCount }
}
