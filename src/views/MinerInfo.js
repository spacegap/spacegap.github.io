import React, {useState, useEffect, useContext} from 'react'
import { useParams, withRouter } from 'react-router-dom'

import Summary from '../components/Summary'
import ReactTooltip from 'react-tooltip'
import WindowPoSt from '../components/WindowPoSt'
import MinerBar from '../components/MinerBar'
import FilToken from '../components/FilToken'
import {DatastoreContext, DatastoreProvider} from "../contexts/api";

const d3 = require('d3')
const f = d3.format(',')
const f0 = d3.format(',.0f')
const f2 = d3.format(',.2f')

function MinerInfo () {
  const { data } = useContext(DatastoreContext)
  const { minerId } = useParams()

  const sectorFaultFee = data?.sectorFaultFee;

  const sectorProjectedReward1 = data?.sectorProjectedReward1
  const sectorProjectedReward = data?.sectorProjectedReward

  if (!data || !data.miners[minerId]) {
    return <></>
  }

  const miner = data.miners[minerId]

  return (
    <section className='container'>
      <MinerBar
        minerId={minerId}
        miner={miner}
      />
      <div id='deposits' className='section'>
        <div className='grid'>
          <Summary
            title={
              miner.deposits && (
                <>
                  {f(miner.deposits.balance || 0)}
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
                  {f(miner.deposits.available || 0)}
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
                  {f(miner.deposits.lockedFunds || 0)}
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
              `${f2((miner.deadlines.sectorsCount * 32) / 1024)} TiB`
            }
            desc={`${(miner.deadlines && f(miner.deadlines.sectorsCount)) ||
            ''} Total Sectors`}
          />

          <Summary
            title={
              miner.deadlines &&
              `${f2((miner.deadlines.activeCount * 32) / 1024)} TiB`
            }
            desc={`${(miner.deadlines && f(miner.deadlines.activeCount)) ||
            ''} Active Sectors`}
          />
          <Summary
            title={
              miner.deadlines &&
              `${f2((miner.deadlines.faultsCount * 32) / 1024)} TiB`
            }
            desc={`${(miner.deadlines && f(miner.deadlines.faultsCount)) ||
            ''} Faulty Sectors`}
          />

          <Summary
            title={f(miner.preCommitsCount || 0)}
            desc='PreCommits'
          />
        </div>
      </div>

      <div id='sectors'>
        <h3>Economics</h3>
        <div className='grid grid-4'>
          <Summary
            title={miner.deposits && (
              <>
                {f(miner.deposits.initialPledge)}
                <FilToken />
              </>
            )}
            desc='Initial Pledge'
          />
          <Summary
            desc='PreCommit Deposit'
            title={miner.deposits && (
              <>
                {f(miner.deposits.preCommitDeposits || 0)}
                <FilToken />
              </>
            )
            }
          />

          <Summary title={miner.deposits && (
            <>
              {f(miner.deposits.feeDebt || 0)}
              <FilToken />
            </>
          )}
                   desc='Fee Debt'
          />
          <Summary
            title={miner.deposits &&
            `${f2(
              (+miner.deposits.available + +miner.deposits.lockedFunds) /
              +sectorFaultFee || 0
            )}`
            }
            desc='Faults to Debt'
          />
        </div>
        <div className='grid'>
          <Summary
            title={miner.deadlines && sectorProjectedReward1 && (
              <>
                {f2(sectorProjectedReward1 * miner.deadlines.activeCount)}
                <FilToken />
              </>
            )
            }
            desc='Daily reward*'
          />
          <Summary
            title={miner.deadlines && sectorProjectedReward && (
              <>
                {f2(sectorProjectedReward * miner.deadlines.activeCount)}
                <FilToken />
              </>
            )
            }
            desc='360-Day reward*'
          />
          <Summary title={miner.deadlines && sectorProjectedReward && (
            <>
              {f2(5 * 2880 * (
                (miner.deadlines.activeCount * 32) /
                (+data.totalBytesCommitted / 2 ** 30)
              ))}
            </>
          )}
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
            head={data.head}
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
                  {miner.deadlines.deadline.FaultCutoff - data.head.Height}
                </li>
                <li>
                  Challenge: {miner.deadlines.deadline.Challenge - data.head.Height}
                </li>
                <li>
                  {miner.deadlines.deadline.Open - data.head.Height > 0
                    ? 'Open'
                    : 'Opened'}
                  : {miner.deadlines.deadline.Open - data.head.Height}
                </li>
                <li>Close: {miner.deadlines.deadline.Close - data.head.Height}</li>
              </ul>
            </div>
            <div className='col'>
              <WindowPoSt
                minerId={minerId}
                deadlines={[miner.deadlines.nextDeadlines[0]]}
                head={data.head}
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
          {miner.preCommits.preCommitDeadlines?.length === 0 && (
            <div>No new sectors</div>
          )}
          <div className='deadlines provecommit'>
            {miner.preCommits.preCommitDeadlines?.map((d, i) => (
              <div key={i} className='deadline'>
                <div className='out'>
                  In {d.Expiry - data.head.Height}
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
