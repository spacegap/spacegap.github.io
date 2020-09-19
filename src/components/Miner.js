import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Blockies from 'blockies-identicon'

import Summary from './Summary'
import ReactTooltip from 'react-tooltip'
import WindowPoSt from './WindowPoSt'

const d3 = require('d3')
const f = d3.format(',')

export default function Miner ({ client, miners, head }) {
  const { minerId } = useParams()
  const [miner, setMiner] = useState({ id: minerId })

  const canvasRef = React.useRef(null)
  const [context, setContext] = React.useState(null)

  // On new (hash or head): fetch miner
  useEffect(() => {
    if (!minerId || !head) return

    let mounted = true

    const fetchInfo = () => {
      console.log('url', client.url.slice(20), head.Cids, head.Height)
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
          console.error(err)
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

  useEffect(() => {
    if (canvasRef.current) {
      Blockies.render({ seed: miner.id }, canvasRef.current)

      const renderCtx = canvasRef.current.getContext('2d')

      if (renderCtx) {
        setContext(renderCtx)
      }
    }
  }, [context, miner])

  if (!miner || !head) {
    return <></>
  }

  return (
    <div>
      <div id='miner' className='section'>
        {/* <span><canvas ref={canvasRef}></canvas></span> */}
        <h1>{miner.id}</h1>
        <div>
          {miners && miners[miner.id].tag && (
            <span className='miner-name'>{miners[miner.id].tag.en}</span>
          )}
          {miners && miners[miner.id].location && (
            <span> from {miners[miner.id].location.flagEmoji}</span>
          )}
          &nbsp; (
          <a href={`https://filfox.info/en/address/${miner.id}`}>filfox</a>
          ,&nbsp;
          <a
            href={`https://filscan.io/#/tipset/address-detail?address=${miner.identicon}`}
          >
            filscan
          </a>
          ,&nbsp;
          <a href={`https://filscout.io/en/pc/account?id=${miner.id}`}>
            filscout
          </a>
          )
        </div>
      </div>

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
              title={f(miner.deadlines.SectorsCount || 0)}
              desc='Live Sectors'
            />
          )}
          {miner.deadlines && (
            <Summary
              title={f(miner.deadlines.ActiveCount || 0)}
              desc='Active Sectors'
            />
          )}
          {miner.deadlines && (
            <Summary
              title={f(miner.deadlines.FaultsCount || 0)}
              desc='Faulty Sectors'
            />
          )}
          {miner.preCommits && (
            <Summary title={f(miner.preCommits.Count || 0)} desc='PreCommits' />
          )}
        </div>
      </div>

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
                Bars represent ~8TB disks to be proven, white are healthy disks,
                red are faulty.
              </span>
            </ReactTooltip>
          </div>
        </div>
        <WindowPoSt deadlines={miner.deadlines} head={head} />
      </div>
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
          {miner.preCommits &&
            miner.preCommits.PreCommitDeadlines.map((d, i) => (
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
    </div>
  )
}
