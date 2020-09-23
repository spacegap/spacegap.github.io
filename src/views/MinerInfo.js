import React, { useState, useEffect } from 'react'
import { useParams, withRouter } from 'react-router-dom'

import Summary from '../components/Summary'
import ReactTooltip from 'react-tooltip'
import WindowPoSt from '../components/WindowPoSt'
import MinerBar from '../components/MinerBar'

const d3 = require('d3')
const f = d3.format(',')
const f2 = d3.format(',.0f')

function MinerInfo ({ client, miners, head }) {
  const { minerId } = useParams()
  const [miner, setMiner] = useState({ id: minerId })

  // On new (hash or head): fetch miner
  useEffect(() => {
    if (!minerId || !head) {
      return
    }

    let mounted = true

    const fetchInfo = () => {
      setMiner({ ...miner })

      client
        .fetchDeadlines(minerId, head)
        .then(deadlines => {
          if (mounted) {
            miner.deadlines = deadlines
            setMiner({ ...miner })
          }
        })
        .catch(err => {
          console.error('failed to load deadline')
        })

      client.fetchDeposits(minerId, head).then(deposits => {
        if (mounted) {
          miner.deposits = deposits
          setMiner({ ...miner })
        }
      })

      client.fetchPreCommittedSectors(minerId, head).then(preCommits => {
        if (mounted) {
          miner.preCommits = preCommits
          setMiner({ ...miner })
        }
      })

      client.fetchSectors(minerId, head).then(sectors => {
        if (mounted) {
          miner.sectors = sectors
          setMiner({ ...miner })
        }
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
      <MinerBar client={client} miners={miners} minerId={minerId} />
      <div id='deposits' className='section'>
        <div className='grid'>
          {miner.deposits && (
            <Summary
              title={f(miner.deposits.collateral || 0)}
              desc='Collateral'
            />
          )}

          {miner.deposits && (
            <Summary
              title={f(miner.deposits.available || 0)}
              desc='Available'
            />
          )}

          {miner.deposits && (
            <Summary title={f(miner.deposits.locked || 0)} desc='Locked' />
          )}
        </div>
      </div>

      <div id='sectors'>
        <div className='grid'>
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
              <h3>WindowPoSt due</h3>
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

      {miner.preCommits && (
        <div id='provecommit' className='section'>
          <div className='row'>
            <div className='col section-title'>
              <h3>ProveCommits due</h3>
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
                      <div
                        key={v}
                        className={`hdd ${!!miner.sectors &&
                          !!miner.sectors.Sectors[v]}`}
                      >
                        {v === 215428
                          ? miner.sectors && miner.sectors.Sectors[v]
                          : ''}
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
