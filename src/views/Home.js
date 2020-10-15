import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Summary from '../components/Summary'

const d3 = require('d3')
const f = d3.format(',')
const f3 = d3.format(',.3f')

export default function Home ({ miners, client, actors, head }) {
  const econSummary =
    actors &&
    client.computeEconomics(head, actors, {
      projectedDays: 1
    })

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
      {econSummary && (
        <div id='deposits' className='section'>
          <h3>Economics</h3>
          <div className='grid'>
            {econSummary && (
              <Summary
                title={`${f3(econSummary.sectorIp || 0)} FIL`}
                desc='Pledge'
              />
            )}

            {econSummary && (
              <Summary
                title={`${f3(econSummary.sectorProjectedReward || 0)} FIL`}
                desc='180 Days Reward'
              />
            )}

            {econSummary && (
              <Summary
                desc='Fault Fee'
                title={`${f3(econSummary.sectorFaultFee || 0)} FIL`}
              />
            )}
          </div>
          These numbers are approximate projections based on the current network
          state and may be incorrect, do your own research. All costs are per
          sector.
        </div>
      )}
    <div className="row">
        See <Link to='/gas'> here </Link> for a detailed gas analysis.
      </div>

    </section>
  )
}
