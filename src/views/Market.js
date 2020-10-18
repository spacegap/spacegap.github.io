import React, { useState, useEffect } from 'react'
import { withRouter } from 'react-router-dom'
import { Link } from 'react-router-dom'
import Summary from '../components/Summary'
import Spacegap from '../components/Spacegap'
import FilToken from '../components/FilToken'

const d3 = require('d3')
const f = d3.format(',')
const f0 = d3.format(',.0f')
const f3 = d3.format(',.3f')
const f1 = d3.format(',.1f')

function Market ({ miners, client, actors, head }) {
  const [annotations, setAnnotations] = useState({})
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
    const url =
      'https://raw.githubusercontent.com/jimpick/workshop-client-testnet/spacerace/src/annotations-spacerace-slingshot-medium.js'
    async function run () {
      const resp = await fetch(url)
      const slingshotTestResultsJs = await resp.text()
      const fixedJs =
        slingshotTestResultsJs.replace(/export.*/m, '') + '; annotations'
      const annotations = eval(fixedJs)
      const filteredAnnotations = {}
      for (const miner in annotations) {
        if (annotations[miner].match(/(active,|sealing,)/)) {
          filteredAnnotations[miner] = annotations[miner]
        }
      }
      setAnnotations(filteredAnnotations)
    }
    run()
  }, [])

  useEffect(() => {
    // if (!miners) {
    //   setMinersInfo({})
    //   return
    // }
    setMinersInfo(miners)
  }, [miners])

  let count = 0

  useEffect(() => {
    if (!client || !head || !actors) {
      return
    }

    console.log('reload miners list', count++)

    let mounted = true
    const setMinersIfMounted = info => {
      if (mounted) setMinersInfo(info)
    }

    Object.keys(minersInfo).forEach(minerId => {
      client.updateMinerMarketInfo(
        minersInfo,
        minerId,
        setMinersIfMounted,
        head
      )
    })
    return () => {
      mounted = false
    }
  }, [client, head, actors])

  return (
    <section id='market' className='container'>
      {/* <Spacegap /> */}
      <div class='section minerbar'>
        <div class='minerId'>
          <Link to='/market'>Market</Link>
        </div>
      </div>
      <div id='actors' className='section'>
        <div className='grid'>
          <Summary
            title={
              actors && (
                <>
                  {f3(
                    +actors.Market.State.TotalProviderLockedCollateral / 1e18
                  )}
                  <FilToken />
                </>
              )
            }
            desc='Provider Collateral'
          />
          <Summary
            title={
              actors && (
                <>
                  {f3(+actors.Market.State.TotalClientStorageFee / 1e18)}
                  <FilToken />
                </>
              )
            }
            desc='Client Storage Fee'
          />
          <Summary
            title={actors && <>{f0(+actors.Market.State.NextID)}</>}
            desc='Total deals'
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
        These numbers are approximate projections based on the current network
        state and may be incorrect, do your own research.
      </div>
      <div className='section'>
        <h3>Asks</h3>
      </div>
      <div className='spacerace card section'>
        <div className='card-body'>
          <table className='table table-sm space table-borderless'>
            <thead>
              <tr>
                <th scope='col'>#</th>
                <th scope='col'>Miner</th>
                <th scope='col'>Power</th>
                <th scope='col'>Ask</th>
              </tr>
            </thead>
            <tbody>
              {minersInfo &&
                miners &&
                Object.keys(miners)
                  .filter(miner => annotations[miner])
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
                        {minersInfo[d] && minersInfo[d].ask ? (
                          +minersInfo[d].ask.Error ? (
                            'no price'
                          ) : (
                            `${f3(
                              (+minersInfo[d].ask.Price / 1e18) *
                                2880 *
                                30 *
                                1024
                            )} TiB/month`
                          )
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

export default withRouter(Market)
