import React, {useState, useEffect, useContext} from 'react'
import { withRouter } from 'react-router-dom'
import { Link } from 'react-router-dom'
import Summary from '../components/Summary'
import Spacegap from '../components/Spacegap'
import FilToken from '../components/FilToken'
import {DatastoreContext} from "../contexts/api";
import filesize from 'filesize';

const d3 = require('d3')
const f0 = d3.format(',.0f')
const f3 = d3.format(',.3f')

function Market()  {
  const { data } = useContext(DatastoreContext)
  const { actors } = data;

  return (
    <section id='market' className='container'>
       {/*<Spacegap />*/}
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
                  {f3(actors && actors.totalProviderLockedCollateral)}
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
                  {f3(actors && actors.totalClientStorageFee)}
                  <FilToken />
                </>
              )
            }
            desc='Client Storage Fee'
          />
          <Summary
            title={actors && <>{f0(actors.nextId)}</>}
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
