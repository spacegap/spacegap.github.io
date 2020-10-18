import React, { useState, useEffect } from 'react'
import { useParams, withRouter } from 'react-router-dom'

import MinerInfo from './MinerInfo'
import { Redirect } from 'react-router-dom'

const d3 = require('d3')
const f = d3.format(',')
const f2 = d3.format(',.0f')

function AddressInfo ({ client, miners, head, actors }) {
  const { minerId } = useParams()
  const [actorType, setActorType] = useState()

  useEffect(() => {
    if (!client || !head) {
      return
    }
    client
      .fetchActor(minerId, head.Cids)
      .then(d => {
        console.log(d)
        setActorType(d.type)
      })
      .catch(e => {
        console.error('actor type not supported')
        setActorType('NotSupported')
      })
  }, [client, head])

  return (
    <>
      {actorType === 'storageMinerActorV2' && (
        <Redirect to={`/miners/${minerId}`} />
      )}
      {/* {actorType === 'accountActor' && <Redirect to={`/accounts/${minerId}`} />} */}
      {actorType === 'NotSupported' && <>Actor type not supported</>}
    </>
  )
}

export default withRouter(AddressInfo)
