import React, {useState, useEffect, useContext} from 'react'
import { withRouter } from 'react-router-dom'
import { Link } from 'react-router-dom'
import Summary from '../components/Summary'
import Spacegap from '../components/Spacegap'
import FilToken from '../components/FilToken'
import {DatastoreContext} from "../contexts/api";
import filesize from 'filesize';

const d3 = require('d3')
const f = d3.format(',')
const f0 = d3.format(',.0f')
const f3 = d3.format(',.3f')
const f1 = d3.format(',.1f')

function Market ({ miners, client, actors, head }) {
  const { data } = useContext(DatastoreContext)
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
              data && (
                <>
                  {f3(data.totalProviderLockedCollateral)}
                  <FilToken />
                </>
              )
            }
            desc='Provider Collateral'
          />
          <Summary
            title={
              data && (
                <>
                  {f3(data.totalClientStorageFee)}
                  <FilToken />
                </>
              )
            }
            desc='Client Storage Fee'
          />
          <Summary
            title={data && <>{f0(data.nextId)}</>}
            desc='Total deals'
          />
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
              {data && data.miners && Object.keys(data.miners)
                  .map((address, idx) => (
                    <tr key={idx}>
                      <th scope='row'>{idx + 1}</th>
                      <td align='right' className='minerAddress'>
                        <Link to={`/miners/${data.miners[address].address}`}>
                          {data.miners[address].address}
                        </Link>
                      </td>
                      <td align='right'>
                        {filesize(data.miners[address].rawPower, { standard: "iec" })}
                      </td>
                      <td align='right'>
                        {!data.miners[address].price ? (
                            'no price'
                          ) : (
                            `${f3(
                              (data.miners[address].price / 1e18) *
                                2880 *
                                30 *
                                1024
                            )} FIL TiB/month`
                          )
                        }
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
