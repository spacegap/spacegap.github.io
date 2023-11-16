const blockLimit = 10 * 10 ** 9
const roundsPerDay = 2 * 60 * 24
const roundsInDeadline = 2 * 30
const deadlines = 48
const maxSectorsPerPost = 2349
export function wpostToSectors (wpost) {
  return maxSectorsPerPost * wpost
}

function gbToPB (v) {
  return v / 1024 / 1024
}
function pbToGB (v) {
  return v * 1024 * 1024
}
// Returns the estimated growthRate per day assuming this number of prove
// commits at one height (or an average etc)
export function growthRate (prove) {
  return gbToPB(prove * 32) * roundsPerDay
}

export function objectFilter (obj, fn) {
  return Object.fromEntries(Object.entries(obj).filter(([k, v]) => fn(v, k)))
}

export function objectMap (obj, fn) {
  return Object.entries(obj).map(([k, v], i) => fn(v, k, i))
}

function roundsInDays (rounds) {
  return Math.ceil(rounds / 2 / 60 / 24)
}

function sectorsToPost (sectors) {
  return sectors / maxSectorsPerPost
}

function sizeToString (s) {
  var biUnits = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB']
  var unit = 0
  while (s >= 1024 && unit < biUnits.length - 1) {
    s /= 1024
    unit++
  }
  s = s.toFixed(2)
  return `${s} ${biUnits[unit]}`
}

function sizeToSectors (s) {
  return s / 1024 / 1024 / 1024 / 32
}

function attoToFIL (atto) {
  return atto * 10 ** -18
}

export function msgToGasUsed(m) {
    return m[1].GasUsed
}
export function msgToGasLimit(m) {
    return m[0].Message.GasLimit
}
export function msgToGasFeeCap(m) {
    return m[0].Message.GasFeeCap
}

export default class Stats {
  constructor (client, average) {
    this.fetcher = client
    this.average = average
    this.tipsets = {}
  }

  // XXX Make head a paramter and fethc only what it needs
  async fetchCids () {
    // at the moment take the first block - this is ok since parent tipset
    // is the same for all the blocks
    console.log('Initializing gas stats engine')
    const head = await this.fetcher.fetchHead()
    const height = head.Height
    this.tipsets[head.Height] = head
    for (var i = 1; i < this.average; i++) {
      const tipset = await this.fetcher.fetchTipsetHead(height - i)
      this.tipsets[tipset.Height] = tipset
      console.log(
        i,
        '/',
        this.average,
        ': init fetched tipset at height ',
        tipset.Height,
        ' with [0] = ',
        tipset
      )
    }
    console.log(
      'Stats: got ' +
        Object.keys(this.tipsets).length +
        ' tipset CIDs to make stats from'
    )
  }

  async avgNumberTx (...method) {
    const tx = await this.transactions(...method)
    return tx.length / Object.keys(this.tipsets).length
  }

  async transactions (...method) {
    var allTx = []
    for (var height in this.tipsets) {
      const tipset = this.tipsets[height]
      const msgs = await this.fetcher.parentAndReceiptsMessages(
        tipset.Cids[0],
        ...method
      )
      allTx = allTx.concat(msgs)
    }
    return allTx
  }

  async transactionsPerHeight (...method) {
    const allTx = {}
    for (var height in this.tipsets) {
      const tipset = this.tipsets[height]
      const msgs = await this.fetcher.parentAndReceiptsMessages(
        tipset.Cids[0],
        ...method
      )
      allTx[height] = msgs
    }
    return allTx
  }


  // return the avg total gas limit set per height for the given method over
  // the maximal theoretical gas limit
  async avgTotalGasLimitOverTipsetLimit (...method) {
    var ratios = []
    await this.msgsPerHeight((msgs,height) => {
      const tipset = this.tipsets[height]
      const totalGasLimit = msgs.reduce(
        (total, tup) => total + tup[0].Message.GasLimit,
        0
      )
      const nbBlocks = tipset.Cids.length
      const ratio = totalGasLimit / (blockLimit * nbBlocks)
      ratios.push(ratio)
    },...method)
    // make the average
    return ratios.reduce((acc, v) => acc + v, 0) / ratios.length
  }

  async avgTotalGasUsedOverTipsetLimit (...method) {
    var ratios = []
    await this.msgsPerHeight((msgs,height) => {
      const totalGasUsed = msgs.reduce(
        (total, tup) => total + tup[1].GasUsed,
        0
      )
      const nbBlocks = this.tipsets[height].Cids.length
      const ratio = totalGasUsed / (blockLimit * nbBlocks)
      ratios.push(ratio)
    },...method)
    // make the average
    return ratios.reduce((acc, v) => acc + v, 0) / ratios.length
  }

  // Returns the average value of the field returned by the callback accross all
  // messages and all epochs
  async avgValue(cb, ...method) {
    var avg = 0;
    await this.msgsPerHeight((msgs) => {
        if (msgs.length < 1) {
            return
        }
      avg += msgs.reduce((acc,m) => acc + cb(m), 0) / msgs.length
    },...method)
    return avg / Object.keys(this.tipsets).length
  }

  // Returns the average total value returned by the callback _per epoch_
  async avgTotal(cb, ...method) {
    var avg = [];
    await this.msgsPerHeight((msgs) => {
      avg.push(msgs.reduce((acc,m) => acc + cb(m), 0)) 
    },...method)
    return avg.reduce((acc,v) => v,0) / avg.length
  }

  async msgsPerHeight(cb, ...method)  {
    for (var height in this.tipsets) {
      const tipset = this.tipsets[height]
      const msgs = await this.fetcher.parentAndReceiptsMessages(tipset.Cids[0], ...method);
      cb(msgs,height)
    }
  }


  async biggestGasUserFor (...methods) {
    var datas = {}
    for (var height in this.tipsets) {
      const msgs = await this.transactions(...methods)
      var users = msgs.reduce((acc, tuple) => {
        if (acc[tuple[0].Message.To] == undefined) {
          acc[tuple[0].Message.To] = 0
        }
        acc[tuple[0].Message.To] += tuple[1].GasUsed
        return acc
      }, {})
      // combinatio of mapping over dict
      // https://stackoverflow.com/questions/14810506/map-function-for-objects-instead-of-arrays
      // and sorting in decreasing order
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
      const sorted = objectMap(users, (gas, user) => [user, gas]).sort(
        (a, b) => b[1] - a[1]
      )
      datas[height] = sorted
      console.log('Biggest txs at height', height, ' -> ', sorted.slice(0, 10))
    }
    return datas
  }

  
  sortedHeights () {
    return Object.keys(this.tipsets).sort((a, b) => b - a)
  }

  async minerInfo (miner) {
    const allHeights = this.sortedHeights()
    const tipset = this.tipsets[allHeights[0]]
    const mif = await this.fetcher.getMinerPower(
      tipset.Cids,
      tipset.Height,
      miner
    )
    const gas = await this.avgGasOfMethod(5)
    const nbSectors = sizeToSectors(mif.MinerPower.RawBytePower)
    const size = sizeToString(mif.MinerPower.RawBytePower)
    const dailyGas = sectorsToPost(nbSectors) * gas
    const maxDailyPrice = dailyGas * (await this.avgGasFeeCap(5))
    return {
      raw: mif.MinerPower.RawBytePower,
      ratio: (
        mif.MinerPower.RawBytePower / mif.TotalPower.RawBytePower
      ).toFixed(3),
      size: size,
      dailyGas: dailyGas.toFixed(2),
      maxDailyPrice: attoToFIL(maxDailyPrice).toFixed(2)
    }
  }
}


