import React, { useState, useEffect } from 'react'
import { useParams, withRouter } from 'react-router-dom'

import Summary from '../components/Summary'
import ReactTooltip from 'react-tooltip'
import WindowPoSt from '../components/WindowPoSt'
import MinerBar from '../components/MinerBar'
import FilToken from '../components/FilToken'

const d3 = require('d3')
const f = d3.format(',')
const f2 = d3.format(',.0f')

function AccountInfo ({ client, miners, head, actors }) {
  const { minerId } = useParams()
  const [minersInfo, setMinersInfo] = useState({ [minerId]: { id: minerId } })

  useEffect(() => {
    if (!minerId || !head || !client) {
      return
    }

    client.client.StateReadState(minerId, head.Cids).then(result => {
      const minerInfo = minersInfo[minerId]
      minerInfo.deposits = result
      setMinersInfo({ ...minersInfo, [minerId]: { ...minerInfo } })
    })
  }, [client, head, minerId])

  if (!minerId || !head || !minersInfo[minerId]) {
    return <></>
  }

  const miner = minersInfo[minerId]

  return (
    <section className='container'>
      <MinerBar
        minerId={minerId}
        miner={miner}
      />
      <div id='deposits' className='section'>
        <div className='grid'>
          <Summary
            title={
              miner.deposits && (
                <>
                  {f(miner.deposits.Balance || 0)}
                  <FilToken />
                </>
              )
            }
            desc='Balance'
          />
        </div>
      </div>
    </section>
  )
}

export default withRouter(AccountInfo)
