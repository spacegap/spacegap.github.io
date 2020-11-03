import React, { useState, useEffect } from 'react'
import { useParams, withRouter } from 'react-router-dom'

import Summary from '../components/Summary'
import ReactTooltip from 'react-tooltip'
import WindowPoSt from '../components/WindowPoSt'
import MinerBar from '../components/MinerBar'
import FilToken from '../components/FilToken'

const d3 = require('d3')
const f = d3.format(',')
const f0 = d3.format(',.0f')
const f2 = d3.format(',.2f')

function MinerInfo ({ client, miners, head, actors }) {
  const { minerId } = useParams()
  const [minersInfo, setMinersInfo] = useState({ [minerId]: { id: minerId } })

  const sectorFaultFee =
    actors &&
    client.computeEconomics(head, actors, {
      projectedDays: 1
    }).sectorFaultFee

  const sectorProjectedReward1 =
    actors && client.computeEconomics(head, actors, {}).sectorProjectedReward1

  const sectorProjectedReward =
    actors && client.computeEconomics(head, actors, {}).sectorProjectedReward

  // On new (hash or head): fetch miner
  useEffect(() => {
    if (!minerId || !head || !client) {
      return
    }

    let mounted = true
    const setMinersIfMounted = info => {
      if (mounted) setMinersInfo(info)
    }

    client.updateMinerInfo(minersInfo, minerId, setMinersIfMounted, head)

    return () => {
      mounted = false
    }
  }, [client, head, minerId])

  if (!minerId || !head || !minersInfo[minerId]) {
    return <></>
  }

  const miner = minersInfo[minerId]

  return (
    <section className='container'>
      <MinerBar
        client={client}
        miners={miners}
        minerId={minerId}
        miner={miner}
      />
      <div id='deposits' className='section'>
        <div className='grid'>
          <Summary
            title={
              miner.deposits && (
                <>
                  {f(miner.deposits.Balance || 0)}
                  <FilToken />
                </>
              )
            }
            desc='Balance'
          />

          <Summary
            title={
              miner.deposits && (
                <>
                  {f(miner.deposits.Available || 0)}
                  <FilToken />
                </>
              )
            }
            desc='Available'
          />

          <Summary
            desc='Vesting'
            title={
              miner.deposits && (
                <>
                  {f(miner.deposits.LockedFunds || 0)}
                  <FilToken />
                </>
              )
            }
          />
        </div>
        <div className='grid grid-4'>
          <Summary
            title={
              miner.deadlines &&
              `${f2((miner.deadlines.SectorsCount * 32) / 1024)} TiB`
            }
            desc={`${(miner.deadlines && f(miner.deadlines.SectorsCount)) ||
              ''} Total Sectors`}
          />

          <Summary
            title={
              miner.deadlines &&
              `${f2((miner.deadlines.ActiveCount * 32) / 1024)} TiB`
            }
            desc={`${(miner.deadlines && f(miner.deadlines.ActiveCount)) ||
              ''} Active Sectors`}
          />
          <Summary
            title={
              miner.deadlines &&
              `${f2((miner.deadlines.FaultsCount * 32) / 1024)} TiB`
            }
            desc={`${(miner.deadlines && f(miner.deadlines.FaultsCount)) ||
              ''} Faulty Sectors`}
          />

          <Summary
            title={(miner.preCommits && f(miner.preCommits.Count)) || ''}
            desc='PreCommits'
          />
        </div>
      </div>

      <div id='sectors'>
        <h3>Economics</h3>
        <div className='grid grid-4'>
          <Summary
            title={
              miner.deposits && (
                <>
                  {f(miner.deposits.InitialPledge || 0)}
                  <FilToken />
                </>
              )
            }
            desc='Initial Pledge'
          />

          <Summary
            desc='PreCommit Deposit'
            title={
              miner.deposits && (
                <>
                  {f(miner.deposits.PreCommitDeposits || 0)}
                  <FilToken />
                </>
              )
            }
          />

          <Summary
            title={
              miner.deposits && (
                <>
                  {f(miner.deposits.FeeDebt || 0)}
                  <FilToken />
                </>
              )
            }
            desc='Fee Debt'
          />

          <Summary
            title={
              miner.deposits &&
              sectorFaultFee &&
              `${f2(
                (+miner.deposits.Available + +miner.deposits.LockedFunds) /
                  +sectorFaultFee || 0
              )}`
            }
            desc='Faults to Debt'
          />
        </div>
        <div className='grid'>
          <Summary
            title={
              miner.deadlines &&
              sectorProjectedReward1 && (
                <>
                  {f2(sectorProjectedReward1 * miner.deadlines.ActiveCount)}
                  <FilToken />
                </>
              )
            }
            desc='Daily reward*'
          />
          <Summary
            title={
              miner.deadlines &&
              sectorProjectedReward && (
                <>
                  {f2(sectorProjectedReward * miner.deadlines.ActiveCount)}
                  <FilToken />
                </>
              )
            }
            desc='360-Day reward*'
          />
          <Summary
            title={
              actors &&
              miner.deadlines &&
              sectorProjectedReward && (
                <>
                  {f2(
                    // 1.0 /
                    5 *
                      2880 *
                      ((miner.deadlines.ActiveCount * 32) /
                        (+actors.Power.State.TotalBytesCommitted / 2 ** 30))
                  )}
                </>
              )
            }
            desc='Daily Blocks*'
          />
        </div>
        (*) These numbers are projections and do not take into account several
        factors like network growth. Do your own research.
      </div>

      {miner.deadlines && (
        <div className='section wpost'>
          <div className='row'>
            <div className='col section-title'>
              <h3>Deadlines</h3>
              <a data-tip data-for='wpost-desc'>
                (what is this?)
              </a>
              <ReactTooltip id='wpost-desc' effect='solid' place='top'>
                <span>
                  List of 48 WindowPoSt submission deadlines ordered by due time
                  (in epochs).
                  <br />
                  Bars represent ~8TB disks to be proven, white are healthy
                  disks, red are faulty.
                </span>
              </ReactTooltip>
            </div>
          </div>
          <WindowPoSt
            minerId={minerId}
            deadlines={miner.deadlines.nextDeadlines}
            head={head}
          />
        </div>
      )}

      {miner.deadlines && (
        <div className='section'>
          <div className='row'>
            <div className='col section-title'>
              <h3>Upcoming Deadline</h3>
            </div>
          </div>
          <div className='row'>
            <div className='col'>
              <div className='timeline'></div>
              <ul>
                <li>
                  PoStSubmissions:
                  {miner.deadlines.nextDeadlines[0].PostSubmissions}
                </li>
                <li>
                  Sectors to Prove:{' '}
                  {miner.deadlines.nextDeadlines[0].LiveSectors}
                </li>
                <li>Current Deadline: {miner.deadlines.deadline.Index}</li>
                <li>
                  FaultCutoff:{' '}
                  {miner.deadlines.deadline.FaultCutoff - head.Height}
                </li>
                <li>
                  Challenge: {miner.deadlines.deadline.Challenge - head.Height}
                </li>
                <li>
                  {miner.deadlines.deadline.Open - head.Height > 0
                    ? 'Open'
                    : 'Opened'}
                  : {miner.deadlines.deadline.Open - head.Height}
                </li>
                <li>Close: {miner.deadlines.deadline.Close - head.Height}</li>
              </ul>
            </div>
            <div className='col'>
              <WindowPoSt
                minerId={minerId}
                deadlines={[miner.deadlines.nextDeadlines[0]]}
                head={head}
              />
            </div>
          </div>
        </div>
      )}

      {miner.preCommits && (
        <div id='provecommit' className='section'>
          <div className='row'>
            <div className='col section-title'>
              <h3>New sectors</h3>
              <a data-tip data-for='provecommit-desc'>
                (what is this?)
              </a>
              <ReactTooltip id='provecommit-desc' effect='solid' place='top'>
                <span>
                  List of ProveCommits ordered by due time (in epochs).
                  <br />
                  Circles represent sectors to be proven.
                </span>
              </ReactTooltip>
            </div>
          </div>
          {miner.preCommits.PreCommitDeadlines.length === 0 && (
            <div>No new sectors</div>
          )}
          <div className='deadlines provecommit'>
            {miner.preCommits.PreCommitDeadlines.map((d, i) => (
              <div key={i} className='deadline'>
                <div className='out'>
                  In {d.Expiry - head.Height}
                  {/* <span className="epochs">epochs</span> */}
                </div>
                <div className='hddWrapper'>
                  <div className='in'>
                    {Math.round(d.Sectors.length)} sectors
                  </div>
                  <div className='hdds'>
                    {d.Sectors.map(v => (
                      <div key={v} className='hdd'>
                        {''}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default withRouter(MinerInfo)
