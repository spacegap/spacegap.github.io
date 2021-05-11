import React, {useState, useEffect, useContext} from 'react'
import { withRouter } from 'react-router-dom'
import { Link } from 'react-router-dom'
import filesize from 'filesize'
import Summary from '../components/Summary'
import FilToken from '../components/FilToken'
import {DatastoreContext} from "../contexts/api";

const d3 = require('d3')
const f = d3.format(',')
const f0 = d3.format(',.0f')
const f3 = d3.format(',.3f')
const f1 = d3.format(',.1f')

function Home ({ miners, client, actors, head }) {
  const WindowPoStGasAvg = 534297287
  const PreCommitGasAvg = 21701073
  const ProveCommitGasAvg = 47835932

  const { data } = useContext(DatastoreContext)

  const handleSearch = e => {
    if (e.key === 'Enter') {
      window.location.href = `/#/address/${e.target.value}`
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
          <Summary title={data && <>{f0(data.circulatingSupply)}<FilToken /></>} desc='Circulating Supply' />
          <Summary title={data && <>{f0(data.burnt)}<FilToken /></>} desc='Burnt'/>
          <Summary title={data && <>{f0(data.locked)}<FilToken /></>} desc='Locked'/>
        </div>
        <div className='grid'>
          <Summary title={data && <>{f0(data.last24hNewSupply)}<FilToken /></>} desc='24h new supply' />
          <Summary title={data && <>{f0(data.last24hNewBurnt)}<FilToken /></>} desc='24h new Burnt'/>
          <Summary title={data && <>{f0(data.last24hLocked)}<FilToken /></>} desc='Locked'/>
        </div>
      </div>
      <div id='actors2' className='section'>
        <h3>Power</h3>
        <div className='grid'>
          <Summary title={data && `${f1(data.networkRaw)} PiB`} desc='Network Raw'/>
          <Summary title={data && `${f1(data.last24hNewStorage)} PiB`} desc='24h new storage' />
          <Summary title={data && data.activeMiners} desc='Active Miners'/>
        </div>
      </div>

      <div id='economics' className='section'>
        <h3>Economics</h3>
        <div className='grid'>
          <Summary title={data && <>{f3(data.sectorPledge)}<FilToken /></>} desc='Sector Pledge'/>
          <Summary title={data && <>{f3(data.sector360daysReward || 0)}<FilToken /></>} desc='Sector 360-Days Reward'/>
          <Summary title={data && <>{f3(data.sectorFaultFee || 0)}<FilToken /></>} desc='Sector Fault Fee' />
        </div>
        <div class='grid'>
          <Summary title={data && <>{f3(data.blockReward)}<FilToken /></>} desc='Block Reward'/>
          <Summary title={data && <>{f3(data.dayFilTiBReward)}<FilToken /></>} desc='1-day FIL/TiB Reward'/>
        </div>
        These numbers are approximate projections based on the current network
        state and may be incorrect, do your own research.
      </div>

      <div className='section'>
        <h3>Gas</h3>
        See <Link to='/gas'> Gas </Link> for a detailed gas analysis.
      </div>
      <div className='section'>
        <h3>Market</h3>
        See <Link to='/market'> Market </Link>.
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
              {data && data.miners &&
                Object.keys(data.miners)
                  .map((d, i) => (
                    <tr key={i}>
                      <th scope='row'>{i + 1}</th>
                      <td align='right' className='minerAddress'>
                        <Link to={`/miners/${data.miners[d].address}`}>
                          {data.miners[d].address}
                        </Link>
                      </td>
                      <td align='right'>
                        {filesize(data.miners[d].rawPower, { standard: "iec", round: 3 })}
                      </td>
                      <td align='right'>
                        {data.miners[d] ? (
                          data.miners[d].preCommitsCount || 0
                        ) : (
                          <div className='gradient' />
                        )}
                      </td>
                      <td align='right'>
                        {data.miners[d].deposits ? (
                          `${data.miners[d].deposits} FIL`
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
