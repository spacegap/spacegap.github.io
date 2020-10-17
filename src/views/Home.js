import React, { useState, useEffect } from 'react'
import { withRouter } from 'react-router-dom'
import { Link } from 'react-router-dom'
import Summary from '../components/Summary'
import FilToken from '../components/FilToken'

const d3 = require('d3')
const f = d3.format(',')
const f0 = d3.format(',.0f')
const f3 = d3.format(',.3f')
const f1 = d3.format(',.1f')

function Home ({ miners, client, actors, head }) {
  const econSummary =
    actors &&
    client.computeEconomics(head, actors, {
      projectedDays: 1
    })

  const WindowPoStGasAvg = 534297287
  const PreCommitGasAvg = 21701073
  const ProveCommitGasAvg = 47835932

  const [minersInfo, setMinersInfo] = useState({})

  useEffect(() => {
    if (!miners) {
      setMinersInfo({})
      return
    }
    setMinersInfo(miners)
  }, [miners])

  let count = 0

  useEffect(() => {
    if (!client || !head || !miners || !actors) {
      return
    }

    if (!minersInfo) {
      setMinersInfo({})
      return
    }

    console.log('reload miners list', count++)

    let mounted = true
    const setMinersIfMounted = info => {
      if (mounted) setMinersInfo(info)
    }

    Object.keys(minersInfo).forEach(minerId => {
      client.updateMinerInfo(minersInfo, minerId, setMinersIfMounted, head, {
        deadlines: false
      })
    })
    return () => {
      mounted = false
    }
  }, [client, head, miners, actors])

  const handleSearch = e => {
    if (e.key === 'Enter') {
      window.location.href = `/#/miners/${e.target.value}`
    }
  }

  return (
    <section id='home' className='container'>
      <div className='section'>
        <div class='search-bar'>
          <input
            type='text'
            placeholder='look up a miner address'
            onKeyDown={handleSearch}
          />
        </div>
      </div>
      <div id='actors' className='section'>
        <h3>Tokens</h3>
        <div className='grid'>
          <Summary
            title={
              actors && (
                <>
                  {f0(+actors.Supply / 1e18 || 0)}
                  <FilToken />
                </>
              )
            }
            desc='Circulating Supply'
          />
          <Summary
            title={
              actors && (
                <>
                  {f3(+actors.Reward.State.ThisEpochReward / 5 / 1e18 || 0)}
                  <FilToken />
                </>
              )
            }
            desc='Block Reward'
          />
          {/* <Summary
              title={`${f0(+actors.Supply.FilBurnt / 1e18 || 0)} FIL`}
              desc='Burnt'
            />
            <Summary
              desc='Locked'
              title={`${f0(+actors.Supply.FilLocked / 1e18 || 0)} FIL`}
            /> */}
        </div>
      </div>

      <div id='actors2' className='section'>
        <h3>Power</h3>
        <div className='grid'>
          <Summary
            title={
              actors &&
              `${f0(
                +actors.Power.State.TotalBytesCommitted / 2 ** 50 || 0
              )} PiB`
            }
            desc='Network Raw'
          />
          <Summary
            desc='Active Miners'
            title={
              actors &&
              `${f0(+actors.Power.State.MinerAboveMinPowerCount || 0)}`
            }
          />
        </div>
      </div>

      <div id='economics' className='section'>
        <h3>Economics</h3>
        <div className='grid'>
          <Summary
            title={
              econSummary && (
                <>
                  {f3(econSummary.sectorIp || 0)}
                  <FilToken />
                </>
              )
            }
            desc='Sector Pledge'
          />

          <Summary
            title={
              econSummary && (
                <>
                  {f3(econSummary.sectorProjectedReward || 0)}
                  <FilToken />
                </>
              )
            }
            desc='Sector 360-Days Reward'
          />

          <Summary
            desc='Sector Fault Fee'
            title={
              econSummary && (
                <>
                  {f3(econSummary.sectorFaultFee || 0)}
                  <FilToken />
                </>
              )
            }
          />
        </div>
        These numbers are approximate projections based on the current network
        state and may be incorrect, do your own research.
      </div>

      <div className='section'>
        <h3>Gas</h3>
        See <Link to='/gas'> here </Link> for a detailed gas analysis.
      </div>
      <div className='section'>
        <h3>Top miners</h3>
        <div>
          See deadlines of <Link to='/full'>top 50 miners</Link> or click on
          individual miners or the <Link to='/status'>network status</Link>.
        </div>
      </div>
      <div className='spacerace card section'>
        <div className='card-body'>
          <table className='table table-sm space table-borderless'>
            <thead>
              <tr>
                <th scope='col'>#</th>
                <th scope='col'>Miner</th>
                <th scope='col'>Power</th>
                <th scope='col'>PreCommits</th>
                <th scope='col'>Available Balance</th>
              </tr>
            </thead>
            <tbody>
              {minersInfo &&
                miners &&
                Object.keys(miners)
                  // .slice(0, 5)
                  .map((d, i) => (
                    <tr key={i}>
                      <th scope='row'>{i + 1}</th>
                      <td align='right' className='minerAddress'>
                        <Link to={`/miners/${miners[d].address}`}>
                          {miners && miners[d] && miners[d].address}
                        </Link>
                      </td>
                      <td align='right'>
                        {f1(
                          minersInfo[d] && +minersInfo[d].rawBytePower / 2 ** 50
                        )}{' '}
                        PiB
                      </td>
                      <td align='right'>
                        {minersInfo[d] && minersInfo[d].preCommits ? (
                          minersInfo[d].preCommits.Count
                        ) : (
                          <div className='gradient' />
                        )}
                      </td>
                      <td align='right'>
                        {minersInfo[d] && minersInfo[d].deposits ? (
                          `${minersInfo[d].deposits.Available} FIL`
                        ) : (
                          <div className='gradient' />
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default withRouter(Home)
