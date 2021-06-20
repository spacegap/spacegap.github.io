import React, {useState, useEffect, useContext} from 'react'
import { useParams, withRouter, Redirect } from 'react-router-dom'
import {DatastoreContext} from "../contexts/api";

function AddressInfo ({ client }) {
  const { minerId } = useParams()
  const [actorType, setActorType] = useState()
  const { data } = useContext(DatastoreContext);
  const { head } = data;

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
      {actorType?.includes("storageMinerActor") && (
        <Redirect to={`/miners/${minerId}`} />
      )}
      {actorType === 'NotSupported' && <>Actor type not supported</>}
    </>
  )
}

export default withRouter(AddressInfo)
