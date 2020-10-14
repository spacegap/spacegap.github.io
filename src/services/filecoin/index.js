import { LotusRPC } from '@filecoin-shipyard/lotus-client-rpc'
import { BrowserProvider } from '@filecoin-shipyard/lotus-client-provider-browser'
import Fil from 'js-hamt-filecoin'
import { partition } from 'd3'
import asyncPool from 'tiny-async-pool'
const d3 = require('d3')
const f = d3.format('0.2f')
const bx = require('base-x')
const BASE64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const b64 = bx(BASE64)
const BN = require('bn.js')

const schema = require('@filecoin-shipyard/lotus-client-schema').testnet
  .fullNode

function b64ToBn (b64) {
  if (b64 === '') return window.BigInt(0)
  var bin = atob(b64)
  var hex = []

  bin.split('').forEach(function (ch) {
    var h = ch.charCodeAt(0).toString(16)
    if (h.length % 2) {
      h = '0' + h
    }
    hex.push(h)
  })

  return window.BigInt('0x' + hex.join(''))
}

const partitionSchema = {
  Sectors: 'buffer',
  Faults: 'buffer',
  Recoveries: 'buffer',
  Terminated: 'buffer',
  ExpirationEpochs: 'cid',
  EarlyTerminated: 'cid',
  LivePower: {
    a: 'bigint',
    b: 'bigint'
  },
  FaultyPower: {
    a: 'bigint',
    b: 'bigint'
  },
  RecoveringPower: {
    a: 'bigint',
    b: 'bigint'
  }
}

const preCommitSchema = {
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
      replace_sector_number: 'int'
    },
    precommit_deposit: 'bigint',
    precommit_epoch: 'int',
    deal_weight: 'bigint',
    verified_deal_weight: 'bigint'
  }
}

function bytesToBig (p) {
  let acc = 0n
  for (let i = 0; i < p.length; i++) {
    acc *= 256n
    acc += window.BigInt(p[i])
  }
  return acc
}

function bytesToBigRev (p) {
  let acc = new BN(0)
  for (let i = 0; i < p.length; i++) {
    acc = acc.mul(new BN(256))
    acc = acc.add(new BN(p[p.length - i - 1]))
  }
  return acc
}

function nextBits (obj, n) {
  // if (obj.left < n) throw new Error("out of bits")
  const res = obj.num.and(new BN(1).shln(n).sub(new BN(1)))
  obj.num = obj.num.shrn(n)
  obj.left -= n
  return res.toNumber()
}

function decodeRLE (buf) {
  const obj = {
    left: 8 * buf.length,
    num: bytesToBigRev(buf)
  }
  const version = nextBits(obj, 2)
  const first = nextBits(obj, 1)
  const res = []
  while (obj.left > 0) {
    let b1 = nextBits(obj, 1)
    if (b1 === 1) {
      res.push(1)
      continue
    }
    let b2 = nextBits(obj, 1)
    if (b2 === 1) {
      const a = nextBits(obj, 4)
      res.push(a)
      continue
    }
    let x = 0
    let s = 0
    for (let i = 0; true; i++) {
      if (i === 10) {
        throw new Error('run too long')
      }
      let b = nextBits(obj, 8)
      if (b < 0x80) {
        if (i > 9 || (i === 9 && b > 1)) {
          throw new Error('run too long')
        } else if (b === 0 && s > 0) {
          throw new Error('invalid run')
        }
        x |= b << s
        break
      }
      x |= (b & 0x7f) << s
      s += 7
    }
    res.push(x)
  }
  return { first, runs: res }
}

function decodeRLE2 (buf) {
  const { first, runs } = decodeRLE(buf)
  let cur = first
  const res = []
  let acc = 0
  for (let r of runs) {
    for (let i = 0; i < r; i++) {
      if (cur === 1) res.push(acc)
      acc++
    }
    cur = 1 - cur
  }
  return res
}

export default class Filecoin {
  constructor (endpointUrl) {
    this.url = endpointUrl
    const provider = new BrowserProvider(endpointUrl)
    console.log('new endpoint', endpointUrl)
    this.client = new LotusRPC(provider, { schema })
    this.parents = {}
    this.receipts = {}
    this.minfo = {}
  }

  async getData (head, path, schema) {
    const state = head.Blocks[0].ParentStateRoot['/']
    const data = (await this.client.chainGetNode(`${state}/${path}`)).Obj

    const self = this
    return await Fil.methods.decode(schema, data).asObject(async a => {
      const res = await self.client.chainGetNode(a)
      return res.Obj
    })
  }

  async fetchHead () {
    return this.client.chainHead()
  }

  async fetchPartitionsSectors (cid) {
    const node = (await this.client.chainGetNode(`${cid['/']}`)).Obj[2][2]
    return node.map(partitionRaw => {
      const partitionObj = Fil.methods.decode(partitionSchema, partitionRaw)
      return [
        {
          Sectors: decodeRLE2(partitionObj.Sectors),
          Faults: decodeRLE2(partitionObj.Faults).reduce((acc, curr) => {
            acc[curr] = true
            return acc
          }, {}),
          Terminated: decodeRLE2(partitionObj.Terminated).reduce(
            (acc, curr) => {
              acc[curr] = true
              return acc
            },
            {}
          ),
          Recoveries: decodeRLE2(partitionObj.Recoveries).reduce(
            (acc, curr) => {
              acc[curr] = true
              return acc
            },
            {}
          )
        }
      ]
    })
  }

  async fetchTipsetHead (height) {
    return await this.client.ChainGetTipSetByHeight(height, null)
  }

  async fetchPower (head) {
    const state = head.Blocks[0].ParentStateRoot['/']
    const storagePowerActorRaw = (
      await this.client.chainGetNode(`${state}/@Ha:t04/1`)
    ).Obj
    return {
      TotalRawBytePower: bytesToBig(b64.decode(storagePowerActorRaw[0])),
      TotalBytesCommitted: bytesToBig(b64.decode(storagePowerActorRaw[1])),
      TotalQualityAdjPower: bytesToBig(b64.decode(storagePowerActorRaw[2])),
      TotalQABytesCommitted: bytesToBig(b64.decode(storagePowerActorRaw[3])),
      TotalPledgeCollateral: bytesToBig(b64.decode(storagePowerActorRaw[4])),
      ThisEpochRawBytePower: bytesToBig(b64.decode(storagePowerActorRaw[5])),
      ThisEpochQualityAdjPower: bytesToBig(b64.decode(storagePowerActorRaw[6])),
      ThisEpochPledgeCollateral: bytesToBig(b64.decode(storagePowerActorRaw[7]))
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
      precommitdeposits: f(precommitdeposits / 1000000000000000000)
    }
  }

  async getMiners () {
    const cached = window.localStorage.getItem('miners')
    const cachedTime = window.localStorage.getItem('time')
    if (cached && cachedTime && Date.now() - +cachedTime > 60000)
      return JSON.parse(cached)

    const json = await (
      await fetch('https://filfox.info/api/v0/miner/list/power?pageSize=1000')
    ).json()
    const miners = json.miners.reduce((acc, curr) => {
      acc[curr.address] = curr
      return acc
    }, {})

    window.localStorage.setItem('miners', JSON.stringify(miners))
    window.localStorage.setItem('time', Date.now())

    return miners
  }

  async fetchDeadlinesProxy (miner, head) {
    const state = head.Blocks[0].ParentStateRoot['/']
    const deadlinesCids = (
      await this.client.chainGetNode(`${state}/@Ha:${miner}/1/11`)
    ).Obj[0]
    const deadlines = await asyncPool(24, deadlinesCids, async minerCid => {
      const deadline = (await this.client.ChainGetNode(`${minerCid['/']}`)).Obj
      return {
        Partitions: deadline[0],
        LiveSectors: deadline[4],
        TotalSectors: deadline[5],
        FaultyPower: { Raw: Number(b64ToBn(deadline[6][0])) }
      }
    })
    return deadlines
  }

  async fetchDeadlines (hash, head) {
    console.log('to fetch', hash, head)
    const [deadline, deadlines] = await Promise.all([
      this.client.StateMinerProvingDeadline(hash, head.Cids),
      this.fetchDeadlinesProxy(hash, head)
    ])
    console.log('fetched', hash, head)

    const nextDeadlines = [...Array(48)].map((_, i) => ({
      ...deadlines[(deadline.Index + i) % 48],
      Close: deadline.Close + i * 60,
      Index: (deadline.Index + i) % 48
    }))

    const SectorsCount = deadlines
      .map(d => +d.LiveSectors)
      .reduce((acc, curr) => acc + curr, 0)

    const FaultsCount =
      deadlines
        .map(d => +d.FaultyPower.Raw)
        .reduce((acc, curr) => acc + curr, 0) /
      (32 * 1024 * 1024 * 1024)

    return {
      deadlines: deadlines.map((d, i) => ({
        ...deadlines[i],
        Close: deadline.Close + i * 60,
        Index: i
      })),
      nextDeadlines,
      SectorsCount,
      FaultsCount,
      ActiveCount: SectorsCount - FaultsCount,
      deadline
    }
  }

  async fetchPreCommittedSectors (hash, head) {
    const preCommittedSectors = await this.getData(
      head,
      `@Ha:${hash}/1/5`,
      preCommitSchema
    )
    const PreCommitDeadlines = d3
      .groups(
        Object.keys(preCommittedSectors).map(d => ({
          SectorNumber: preCommittedSectors[d].info.sector_number,
          Expiry: preCommittedSectors[d].precommit_epoch + (10000 + 60 + 150)
        })),
        d => d.Expiry
      )
      .map(([Expiry, Sectors]) => ({
        Expiry,
        Sectors: Sectors.map(d => d.SectorNumber)
      }))
      .sort((a, b) => a.Expiry - b.Expiry)

    return {
      PreCommitDeadlines,
      Count: Object.keys(preCommittedSectors).length
    }
  }

  async fetchSectors (hash, head) {
    const sectorList = await this.client.StateMinerSectors(
      hash,
      null,
      head.Cids
    )
    const Sectors = sectorList.reduce((acc, curr) => {
      acc[curr.ID] = { number: curr.ID, info: curr }
      return acc
    }, {})

    const sectorsCount = Object.keys(Sectors).length
    return { sectorsCount, Sectors }
  }

  async parentMessages(cid) {
      if (cid["/"] in this.parents) {
          return this.parents[cid["/"]]
      }
      const msgs = await this.client.chainGetParentMessages(cid)
      this.parents[cid["/"]] = msgs
      return msgs
  }
 

  async receiptParentMessages(cid) {
      if (cid["/"] in this.receipts) {
          return this.receipts[cid["/"]]
      }
      const r = await this.client.chainGetParentReceipts(cid)
      this.receipts[cid["/"]] = r
      return r
  }

  async parentAndReceiptsMessages(cid, ...methods) {
      const msgs = await this.parentMessages(cid)
      const receipts = await this.receiptParentMessages(cid)
      if (msgs.length != receipts.length) {
          throw new Error("invalid length")
      }
      return zip(msgs,receipts).filter(entry =>  {
          const [tx,r] = entry
          const exit =  r.ExitCode == 0
          var inMethod = true
          if (methods.length > 0) {
              inMethod =  methods.includes(tx.Message.Method)
          }
          return exit && inMethod
      })
  }

  async getMinerPower(tipset,height,miner) {
    if (tipset["/"] in this.minfo) {
        return this.minfo[tipset["/"]]
    }
    //let m = await this.client.minerGetBaseInfo(miner,height,tipset)
    let m = await this.client.stateMinerPower(miner,tipset)
    this.minfo[tipset["/"]] = m
    return m
  }
}

const zip = (arr, ...arrs) => {
  return arr.map((val, i) => arrs.reduce((a, arr) => [...a, arr[i]], [val]));
}
