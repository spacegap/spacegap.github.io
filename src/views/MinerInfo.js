import React, { useState, useEffect } from 'react'
import { useParams, withRouter } from 'react-router-dom'

import Summary from '../components/Summary'
import ReactTooltip from 'react-tooltip'
import WindowPoSt from '../components/WindowPoSt'
import MinerBar from '../components/MinerBar'

const d3 = require('d3')
const f = d3.format(',')
const f2 = d3.format(',.0f')

function MinerInfo ({ client, miners, head, actors }) {
  const { minerId } = useParams()
  const [miner, setMiner] = useState({ id: minerId })

  const sectorFaultFee =
    actors &&
    client.computeEconomics(head, actors, {
      projectedDays: 1
    }).sectorFaultFee

  // On new (hash or head): fetch miner
  useEffect(() => {
    if (!minerId || !head || !client) {
      return
    }

    let mounted = true

    const fetchInfo = () => {
      setMiner({ ...miner })

      client
        .fetchMinerInfo(minerId, head)
        .then(info => {
          if (mounted) {
            miner.info = info
            setMiner({ ...miner })
          }
        })
        .catch(e => {
          console.error('failed to fetch miner info')
        })

      client
        .fetchDeadlines(minerId, head)
        .then(deadlines => {
          if (mounted) {
            miner.deadlines = deadlines
            setMiner({ ...miner })
            console.log('deadlines setting')
          }
        })
        .catch(e => {
          console.error('failed to fetch deadlines')
        })

      client
        .fetchDeposits(minerId, head)
        .then(deposits => {
          if (mounted) {
            miner.deposits = deposits
            setMiner({ ...miner })
          }
        })
        .catch(e => {
          console.error('failed to fetch deposits')
        })

      client
        .fetchPreCommittedSectors(minerId, head)
        .then(preCommits => {
          if (mounted) {
            miner.preCommits = preCommits
            setMiner({ ...miner })
          }
        })
        .catch(e => {
          console.error('failed to fetch precommitted sectors', e)
        })
    }

    fetchInfo()

    return () => {
      mounted = false
    }
  }, [client, head, minerId])

  if (!miner || !head) {
    return <></>
  }

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
          {miner.deposits && (
            <Summary
              title={`${f(miner.deposits.Balance || 0)} FIL`}
              desc='Balance'
            />
          )}

          {miner.deposits && (
            <Summary
              title={`${f(miner.deposits.Available || 0)} FIL`}
              desc='Available'
            />
          )}

          {miner.deposits && (
            <Summary
              desc='Vesting'
              title={`${f(miner.deposits.LockedFunds || 0)} FIL`}
            />
          )}
        </div>
        <div className='grid grid-4'>
          {miner.deposits && (
            <Summary
              title={`${f(miner.deposits.InitialPledge || 0)} FIL`}
              desc='Initial Pledge'
            />
          )}
          {miner.deposits && (
            <Summary
              desc='PreCommit Deposit'
              title={`${f(miner.deposits.PreCommitDeposits || 0)} FIL`}
            />
          )}
          {miner.deposits && (
            <Summary
              title={`${f(miner.deposits.FeeDebt || 0)} FIL`}
              desc='Fee Debt'
            />
          )}
          {miner.deposits && sectorFaultFee && (
            <Summary
              title={`${f2(
                (+miner.deposits.Available + +miner.deposits.LockedFunds) /
                  +sectorFaultFee || 0
              )}`}
              desc='Faults to Debt'
            />
          )}
        </div>
      </div>

      <div id='sectors'>
        <div className='grid grid-4'>
          {miner.deadlines && (
            <Summary
              title={`${f2((miner.deadlines.SectorsCount * 32) / 1024)} TiB`}
              desc={`${f(miner.deadlines.SectorsCount || 0)} Total Sectors`}
            />
          )}
          {miner.deadlines && (
            <Summary
              title={`${f2((miner.deadlines.ActiveCount * 32) / 1024)} TiB`}
              desc={`${f(miner.deadlines.ActiveCount || 0)} Active Sectors`}
            />
          )}
          {miner.deadlines && (
            <Summary
              title={`${f2((miner.deadlines.FaultsCount * 32) / 1024)} TiB`}
              desc={`${f(miner.deadlines.FaultsCount || 0)} Faulty Sectors`}
            />
          )}
          {miner.preCommits && (
            <Summary title={f(miner.preCommits.Count || 0)} desc='PreCommits' />
          )}
        </div>
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
                  List of 48 WindoPoSt submission deadlines ordered by due time
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
