import { LotusRPC } from '@filecoin-shipyard/lotus-client-rpc'
import { BrowserProvider } from '@filecoin-shipyard/lotus-client-provider-browser'
import Fil from 'js-hamt-filecoin'
import Economics from './economics'
import Stats from './stats'
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

const codeMap = {
  bafkqaddgnfwc6mjpon4xg5dfnu: 'systemActor',
  bafkqactgnfwc6mjpnfxgs5a: 'initActor',
  bafkqaddgnfwc6mjpojsxoylsmq: 'rewardActor',
  bafkqactgnfwc6mjpmnzg63q: 'cronActor',
  bafkqaetgnfwc6mjpon2g64tbm5sxa33xmvza: 'storagePowerActor',
  bafkqae3gnfwc6mjpon2g64tbm5sw2ylsnnsxi: 'storageMarketActor',
  bafkqaftgnfwc6mjpozsxe2lgnfswi4tfm5uxg5dspe: 'verifiedRegistryActor',
  bafkqadlgnfwc6mjpmfrwg33vnz2a: 'accountActor',
  bafkqadtgnfwc6mjpnv2wy5djonuwo: 'multisigActor',
  bafkqafdgnfwc6mjpobqxs3lfnz2gg2dbnzxgk3a: 'paymentChannelActor',
  bafkqaetgnfwc6mjpon2g64tbm5sw22lomvza: 'storageMinerActor',
  // v2:
  bafkqaddgnfwc6mrpon4xg5dfnu: 'systemActor',
  bafkqactgnfwc6mrpnfxgs5a: 'initActor',
  bafkqaddgnfwc6mrpojsxoylsmq: 'rewardActorV2',
  bafkqactgnfwc6mrpmnzg63q: 'cronActor',
  bafkqaetgnfwc6mrpon2g64tbm5sxa33xmvza: 'storagePowerActorV2',
  bafkqae3gnfwc6mrpon2g64tbm5sw2ylsnnsxi: 'storageMarketActorV2',
  bafkqaftgnfwc6mrpozsxe2lgnfswi4tfm5uxg5dspe: 'verifiedRegistryActor',
  bafkqadlgnfwc6mrpmfrwg33vnz2a: 'accountActor',
  bafkqadtgnfwc6mrpnv2wy5djonuwo: 'multisigActor',
  bafkqafdgnfwc6mrpobqxs3lfnz2gg2dbnzxgk3a: 'paymentChannelActor',
  bafkqaetgnfwc6mrpon2g64tbm5sw22lomvza: 'storageMinerActorV2'
}

const partitionSchema = height => {
  if (!height || height >= 138720) {
    return {
      Sectors: 'buffer',
      Unproven: 'buffer',
      Faults: 'buffer',
      Recoveries: 'buffer',
      Terminated: 'buffer',
      ExpirationEpochs: 'cid',
      EarlyTerminated: 'cid',
      LivePower: {
        a: 'bigint',
        b: 'bigint'
      },
      UnprovenPower: {
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
  }
  return {
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
const BigInt = window.BigInt

function bytesToBig (p) {
  let acc = BigInt(0)
  for (let i = 0; i < p.length; i++) {
    acc *= BigInt(256)
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

function decodeRLE3 (runs) {
  let cur = 0
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
    const node =
      head.Height >= 138720 ? `${state}/1/${path}` : `${state}/${path}`
    const data = (await this.client.chainGetNode(node)).Obj

    const self = this
    return await Fil.methods.decode(schema, data).asObject(async a => {
      const res = await self.client.chainGetNode(a)
      return res.Obj
    })
  }

  async fetchHead () {
    return this.client.chainHead()
  }

  // async fetchPartitionsSectors (head, miner, deadline) {
  //   const partitions = await this.client.StateMinerPartitions(
  //     miner,
  //     deadline,
  //     head.Cids
  //   )
  //   partitions.map(p => ({
  //     Sectors: decodeRLE3(p.AllSectors),
  //     Faults: decodeRLE3(p.FaultySectors).reduce((acc, curr) => {
  //       acc[curr] = true
  //       return acc
  //     }, {}),
  //     Recoveries: decodeRLE2(p.RecoveringSectors).reduce((acc, curr) => {
  //       acc[curr] = true
  //       return acc
  //     }, {}),
  //     Active: decodeRLE2(p.ActiveSectors).reduce((acc, curr) => {
  //       acc[curr] = true
  //       return acc
  //     }, {})
  //   }))
  // }

  async fetchPartitionsSectors (cid, height) {
    const node = (await this.client.chainGetNode(`${cid['/']}`)).Obj[2][2]
    return node.map(partitionRaw => {
      const partitionObj = Fil.methods.decode(
        partitionSchema(height),
        partitionRaw
      )
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
    const node =
      head.Height >= 138720 ? `${state}/1/@Ha:t04/1` : `${state}/@Ha:t04/1`
    const storagePowerActorRaw = (await this.client.chainGetNode(node)).Obj
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

  async fetchActor (hash, head) {
    const actor = await this.client.StateGetActor(hash, head.Cids)
    actor.type = codeMap[actor.Code['/']]
    return actor
  }

  async fetchDeposits (hash, head) {
    const state = await this.client.StateReadState(hash, head.Cids)
    const { State, Balance } = state
    const { PreCommitDeposits, LockedFunds, InitialPledge, FeeDebt } = State
    const Available = Balance - InitialPledge - PreCommitDeposits - LockedFunds

    return {
      Balance: f(Balance / 1000000000000000000),
      InitialPledge: f(InitialPledge / 1000000000000000000),
      Available: f(Available / 1000000000000000000),
      LockedFunds: f(LockedFunds / 1000000000000000000),
      PreCommitDeposits: f(PreCommitDeposits / 1000000000000000000),
      FeeDebt: f(FeeDebt / 1000000000000000000)
    }
  }

  async getMiners () {
    const cached = window.localStorage.getItem('miners')
    const cachedTime = window.localStorage.getItem('time')
    if (cached && cachedTime && Date.now() - +cachedTime < 1000)
      return JSON.parse(cached)

    const json = await (
      await fetch('https://filfox.info/api/v1/miner/top-miners/power?count=100')
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
    const node =
      head.Height >= 138720
        ? `${state}/1/@Ha:${miner}/1/12`
        : `${state}/@Ha:${miner}/1/11`
    const deadlinesCids = (await this.client.chainGetNode(node)).Obj[0]

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

  async fetchMinerInfo (hash, head) {
    return this.client.StateMinerInfo(hash, head.Cids)
  }

  async fetchDeadlines (hash, head) {
    const [deadline, deadlines] = await Promise.all([
      this.client.StateMinerProvingDeadline(hash, head.Cids),
      this.fetchDeadlinesProxy(hash, head)
    ])

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

  async updateMinerInfo (
    minersInfo,
    minerId,
    setMinersIfMounted,
    head,
    filter = { deadlines: true }
  ) {
    const minerInfo = minersInfo[minerId]
    setMinersIfMounted({ ...minersInfo, [minerId]: { ...minerInfo } })

    this.fetchMinerInfo(minerId, head)
      .then(info => {
        minerInfo.info = info
        setMinersIfMounted({ ...minersInfo, [minerId]: { ...minerInfo } })
      })
      .catch(e => {
        console.error('failed to fetch miner info')
      })

    if (filter.deadlines)
      this.fetchDeadlines(minerId, head)
        .then(deadlines => {
          minerInfo.deadlines = deadlines
          setMinersIfMounted({
            ...minersInfo,
            [minerId]: { ...minerInfo }
          })
        })
        .catch(e => {
          console.error('failed to fetch deadlines')
        })

    this.fetchDeposits(minerId, head)
      .then(deposits => {
        minerInfo.deposits = deposits
        setMinersIfMounted({
          ...minersInfo,
          [minerId]: { ...minerInfo }
        })
      })
      .catch(e => {
        console.error('failed to fetch deposits')
      })

    this.fetchPreCommittedSectors(minerId, head)
      .then(preCommits => {
        minerInfo.preCommits = preCommits
        setMinersIfMounted({
          ...minersInfo,
          [minerId]: { ...minerInfo }
        })
      })
      .catch(e => {
        console.error('failed to fetch precommitted sectors', e)
      })
  }

  async updateMinerMarketInfo (
    minersInfo,
    minerId,
    setMinersIfMounted,
    head,
    filter = { deadlines: true }
  ) {
    const minerInfo = minersInfo[minerId]
    delete minerInfo.ask

    // setMinersIfMounted({ ...minersInfo, [minerId]: { ...minerInfo } })

    this.fetchMinerInfo(minerId, head)
      .then(info => {
        const def = new Promise(resolve =>
          setTimeout(() => {
            resolve({ Error: true })
          }, 2000)
        )
        const query = this.client.ClientQueryAsk(info.PeerId, minerId)

        Promise.any([def, query]).then(ask => {
          minerInfo.ask = ask
          setMinersIfMounted({ ...minersInfo, [minerId]: { ...minerInfo } })
        })
      })
      .catch(e => {
        console.error('failed to fetch miner info')
      })
  }

  async fetchPreCommittedSectors (hash, head) {
    const node = head.Height >= 138720 ? `@Ha:${hash}/1/6` : `@Ha:${hash}/1/5`
    const preCommittedSectors = await this.getData(head, node, preCommitSchema)
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

  async parentMessages (cid) {
    if (cid['/'] in this.parents) {
      return this.parents[cid['/']]
    }
    const msgs = await this.client.chainGetParentMessages(cid)
    this.parents[cid['/']] = msgs
    return msgs
  }

  async receiptParentMessages (cid) {
    if (cid['/'] in this.receipts) {
      return this.receipts[cid['/']]
    }
    const r = await this.client.chainGetParentReceipts(cid)
    this.receipts[cid['/']] = r
    return r
  }

  async parentAndReceiptsMessages (cid, ...methods) {
    const msgs = await this.parentMessages(cid)
    const receipts = await this.receiptParentMessages(cid)
    if (msgs.length != receipts.length) {
      throw new Error('invalid length')
    }
    return zip(msgs, receipts).filter(entry => {
      const [tx, r] = entry
      const exit = r.ExitCode == 0
      var inMethod = true
      if (methods.length > 0) {
        inMethod = methods.includes(tx.Message.Method)
      }
      return exit && inMethod
    })
  }

  async getMinerPower (tipset, height, miner) {
    if (tipset['/'] in this.minfo) {
      return this.minfo[tipset['/']]
    }
    //let m = await this.client.minerGetBaseInfo(miner,height,tipset)
    let m = await this.client.stateMinerPower(miner, tipset)
    this.minfo[tipset['/']] = m
    return m
  }

  async fetchGenesisActors (head) {
    const [Supply, Reward, Power, Market] = await Promise.all([
      this.client.StateCirculatingSupply(head.Cids),
      this.client.StateReadState('f02', head.Cids),
      this.client.StateReadState('f04', head.Cids),
      this.client.StateReadState('f05', head.Cids)
    ])

    return { Supply, Reward, Power, Market }
  }

  computeEconomics (
    head,
    { Supply, Reward, Power },
    {
      projectedDays,
      perDurationNwRbGrowth = 10 * 2 ** 50,
      perDurationMinerQaGrowth = 2 ** 51
    }
  ) {
    const inputs = {
      currEpoch: +head.Height,
      nwqap: +Power.State.ThisEpochQualityAdjPower,
      nwqapP: +Power.State.ThisEpochQAPowerSmoothed.PositionEstimate / 2 ** 128,
      nwqapV: +Power.State.ThisEpochQAPowerSmoothed.VelocityEstimate / 2 ** 128,
      nwCircSupply: +Supply / 1e18,
      perEpochRewardP:
        +Reward.State.ThisEpochRewardSmoothed.PositionEstimate /
        (2 ** 128 * 1e18),
      perEpochRewardV:
        +Reward.State.ThisEpochRewardSmoothed.VelocityEstimate /
        (2 ** 128 * 1e18),
      nwCumsumRealized: +Reward.State.CumsumRealized,
      perDurationNwRbGrowth,
      projectedDays,
      perDurationMinerQaGrowth
    }

    const econ = new Economics(inputs)

    return econ.summary()
  }
}

const zip = (arr, ...arrs) => {
  return arr.map((val, i) => arrs.reduce((a, arr) => [...a, arr[i]], [val]))
}
