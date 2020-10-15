const EPOCHS_PER_DAY = (24 * 60 * 60) / 30
const EPOCHS_PER_YEAR = 365 * EPOCHS_PER_DAY
const INITIAL_BASELINE = 2888888880000000000
const BASELINE_ANNUAL_GROWTH = 1

const computeEffectiveNetworkTime = function (cumsumRealized) {
  const x0 = INITIAL_BASELINE
  const annualGrowth = BASELINE_ANNUAL_GROWTH
  const k = Math.pow(1 + annualGrowth, 1 / EPOCHS_PER_YEAR)
  const c = 1 / Math.log(k)
  const a = -x0 * c
  return Math.log((cumsumRealized - a) / (x0 * c)) / Math.log(k)
}

const computeBlockReward = function (
  newWallClockEpoch,
  prevWallClockEpoch,
  newNetworkTimeEpoch,
  prevNetworkTimeEpoch
) {
  const totalSimpleSupply = 330e6
  const totalBaselineSupply = 770e6
  const mintRate = Math.log(2) / (6 * EPOCHS_PER_YEAR)

  const prevSimpleSupply =
    totalSimpleSupply * (1 - Math.pow(Math.E, -mintRate * prevWallClockEpoch))
  const newSimpleSupply =
    totalSimpleSupply * (1 - Math.pow(Math.E, -mintRate * newWallClockEpoch))

  const prevBaselineSupply =
    totalBaselineSupply *
    (1 - Math.pow(Math.E, -mintRate * prevNetworkTimeEpoch))
  const newBaselineSupply =
    totalBaselineSupply *
    (1 - Math.pow(Math.E, -mintRate * newNetworkTimeEpoch))

  return (
    newSimpleSupply + newBaselineSupply - prevSimpleSupply - prevBaselineSupply
  )
}

const getCurrBaseline = function (e) {
  const x0 = INITIAL_BASELINE
  const annualGrowth = BASELINE_ANNUAL_GROWTH
  const k = Math.pow(1 + annualGrowth, 1 / EPOCHS_PER_YEAR)
  return x0 * Math.pow(k, e)
}

export default class Comp {
  constructor ({
    currEpoch,
    nwqap,
    nwqapP,
    nwqapV,
    nwCircSupply,
    perEpochRewardP,
    perEpochRewardV,
    perDurationNwRbGrowth,
    projectedDays,
    perDurationMinerQaGrowth,
    nwCumsumRealized
  }) {
    Object.assign(this, {
      currEpoch,
      nwqap,
      nwqapP,
      nwqapV,
      nwCircSupply,
      perEpochRewardP,
      perEpochRewardV,
      perDurationNwRbGrowth,
      projectedDays,
      perDurationMinerQaGrowth,
      nwCumsumRealized
    })
  }

  projectFutureReward (sectorQAP, days) {
    const networkQAPFilter = new AlphaBetaFilter(this.nwqapP, this.nwqapV)
    const perEpochRewardFilter = new AlphaBetaFilter(
      this.perEpochRewardP,
      this.perEpochRewardV
    )
    return (
      sectorQAP *
      extrapolateCumsumRatio(
        perEpochRewardFilter,
        networkQAPFilter,
        days * EPOCHS_PER_DAY
      )
    )
  }

  computeInitialPledgeForQAPower (sectorQAP, currEpoch) {
    return (
      this.projectFutureReward(sectorQAP, 20) +
      (sectorQAP * 0.3 * this.nwCircSupply) /
        Math.max(this.nwqap, getCurrBaseline(currEpoch))
    )
  }

  summary () {
    const sectorIp = this.computeInitialPledgeForQAPower(
      32 * 2 ** 30,
      this.currEpoch
    )
    const sectorProjectedReward = this.projectFutureReward(32 * 2 ** 30, 360)
    const sectorFaultFee = this.projectFutureReward(32 * 2 ** 30, 3.51)

    return {
      sectorIp,
      sectorProjectedReward,
      sectorFaultFee
    }
  }

  computeInitialPledgeFromAssumptions () {
    const {
      currEpoch,
      nwqap,
      nwqapP,
      nwqapV,
      nwCircSupply,
      perEpochRewardP,
      perEpochRewardV,
      perDurationNwRbGrowth,
      projectedDays,
      perDurationMinerQaGrowth,
      nwCumsumRealized
    } = this

    const networkQAPFilter = new AlphaBetaFilter(nwqapP, nwqapV)
    const perEpochRewardFilter = new AlphaBetaFilter(
      perEpochRewardP,
      perEpochRewardV
    )
    const perEpochNwRbGrowth =
      perDurationNwRbGrowth / projectedDays / EPOCHS_PER_DAY
    const perEpochMinerQaGrowth =
      perDurationMinerQaGrowth / projectedDays / EPOCHS_PER_DAY

    const newInitialPledges = []
    var totalInitialPledge = 0
    let currNetworkQAP = nwqap
    let currCumsumRealized = nwCumsumRealized
    var prevNetworkTime = computeEffectiveNetworkTime(nwCumsumRealized)

    for (
      var e = currEpoch + 1;
      e < currEpoch + projectedDays * EPOCHS_PER_DAY + 1;
      e++
    ) {
      // first compute initial pledge required for this epoch
      const newInitialPledge =
        perEpochMinerQaGrowth *
        (extrapolateCumsumRatio(
          perEpochRewardFilter,
          networkQAPFilter,
          20 * EPOCHS_PER_DAY
        ) +
          (0.3 * nwCircSupply) / Math.max(currNetworkQAP, getCurrBaseline(e)))
      newInitialPledges.push(newInitialPledge)
      totalInitialPledge += newInitialPledge
      // then update filter values
      currNetworkQAP += perEpochNwRbGrowth
      currCumsumRealized += currNetworkQAP
      const newNetworkTime = computeEffectiveNetworkTime(currCumsumRealized)
      const newReward = computeBlockReward(
        e,
        e - 1,
        newNetworkTime,
        prevNetworkTime
      )
      perEpochRewardFilter.addNewEntry(newReward, 1)
      networkQAPFilter.addNewEntry(currNetworkQAP, 1)
      prevNetworkTime = newNetworkTime
    }

    return { newInitialPledges, totalInitialPledge }
  }
}

class AlphaBetaFilter {
  constructor (p, v) {
    this.alpha = 9.25e-4
    this.beta = 2.84e-7
    this.p = p
    this.v = v
  }

  addNewEntry (value, deltaT) {
    this.p += this.v * deltaT
    const residual = value - this.p
    this.p += this.alpha * residual
    this.p = Math.max(this.p, 0)
    this.v += (this.beta * residual) / deltaT
  }
}

const extrapolateCumsumRatio = function (numerator, denominator, futureT) {
  const x2a = Math.log(denominator.p + denominator.v)
  const x2b = Math.log(denominator.p + denominator.v + denominator.v * futureT)
  const m1 = denominator.v * numerator.p * (x2b - x2a)
  const m2 =
    numerator.v * (denominator.p * (x2a - x2b) + denominator.v * futureT)
  return (m1 + m2) / Math.pow(denominator.v, 2)
}
