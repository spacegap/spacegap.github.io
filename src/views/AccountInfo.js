import React, {useContext, useMemo} from 'react'
import { useParams, withRouter } from 'react-router-dom'

import Summary from '../components/Summary'
import MinerBar from '../components/MinerBar'
import FilToken from '../components/FilToken'
import {DatastoreContext} from "../contexts/api";

const d3 = require('d3')
const f = d3.format(',')

function AccountInfo () {
  const { minerId } = useParams()
  const { data } = useContext(DatastoreContext)
  const { miners } = data;
  const miner = useMemo(() => miners && miners[minerId] ? miners[minerId] : undefined, [miners]);

  if (!miner) {
    return <></>;
  }
  
  return (
    <section className='container'>
      <MinerBar
        minerId={minerId}
        miner={miner}
      />
      <div id='deposits' className='section'>
        <div className='grid'>
          <Summary
            title={miner.deposits && (
              <>
                {f(miner.deposits.balance || 0)}
                <FilToken />
              </>
            )}
            desc='Balance'
          />
        </div>
      </div>
    </section>
  )
}

export default withRouter(AccountInfo)
