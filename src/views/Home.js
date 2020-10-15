import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Summary from '../components/Summary'

const d3 = require('d3')
const f = d3.format(',')
const f0 = d3.format(',.0f')
const f3 = d3.format(',.3f')

export default function Home ({ miners, client, actors, head }) {
  const econSummary =
    actors &&
    client.computeEconomics(head, actors, {
      projectedDays: 1
    })

  const WindowPoStGasAvg = 534297287
  const PreCommitGasAvg = 21701073
  const ProveCommitGasAvg = 47835932

  return (
    <section id='home' className='container'>
      <div className='spacerace'>
        <h3>Top miners</h3>
        {miners &&
          Object.keys(miners)
            .slice(0, 5)
            .map((d, i) => (
              <div key={i}>
                {i + 1}.{' '}
                <Link to={`/miners/${miners[d].address}`}>
                  {miners[d].address}
                </Link>
              </div>
            ))}
        <div>
          See deadlines of <Link to='/full'>top 50 miners</Link> or click on
          individual miners or the <Link to='/status'>network status</Link>.
        </div>
      </div>
      {actors && (
        <div id='actors' className='section'>
          <h3>Tokens</h3>
          <div className='grid'>
            <Summary
              title={`${f0(+actors.Supply / 1e18 || 0)} FIL`}
              desc='Circulating Supply'
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
      )}
      {actors && (
        <div id='actors2' className='section'>
          <h3>Power</h3>
          <div className='grid'>
            <Summary
              title={`${f0(
                +actors.Power.State.TotalBytesCommitted / 2 ** 50 || 0
              )} PiB`}
              desc='Network Raw'
            />
            <Summary
              title={`${f3(
                +actors.Reward.State.ThisEpochReward / 5 / 1e18 || 0
              )} FIL`}
              desc='Block Reward'
            />
            <Summary
              desc='Active Miners'
              title={`${f0(+actors.Power.State.MinerAboveMinPowerCount || 0)}`}
            />
          </div>
        </div>
      )}
      {econSummary && (
        <div id='economics' className='section'>
          <h3>Economics</h3>
          <div className='grid'>
            {econSummary && (
              <Summary
                title={`${f3(econSummary.sectorIp || 0)} FIL`}
                desc='Sector Pledge'
              />
            )}

            {econSummary && (
              <Summary
                title={`${f3(econSummary.sectorProjectedReward || 0)} FIL`}
                desc='Sector 360-Days Reward'
              />
            )}

            {econSummary && (
              <Summary
                desc='Sector Fault Fee'
                title={`${f3(econSummary.sectorFaultFee || 0)} FIL`}
              />
            )}
          </div>
          These numbers are approximate projections based on the current network
          state and may be incorrect, do your own research.
        </div>
      )}
      <div className='section'>
        <h3>Gas</h3>
        See <Link to='/gas'> here </Link> for a detailed gas analysis.
      </div>
    </section>
  )
}
