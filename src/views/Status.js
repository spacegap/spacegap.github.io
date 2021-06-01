import React, {useContext} from 'react'
import { Link } from 'react-router-dom'
import WindowPoStStatus from '../components/WindowPoStStatus'
import {DatastoreContext} from "../contexts/api";

export default function Status () {
  const { data } = useContext(DatastoreContext)

  if (!data || !data.miners) {
    return null;
  }

  const { miners, head } = data;

  return (
    <section className='container'>
      Listing WindowPoSt duties of the top 50 miners.
      {miners &&
        Object.keys(miners)
          .slice(0, 40)
          .map((address, i) => (
            <div className='flex' key={i}>
              <Link to={`/miners/${miners[address].address}`}>
                {miners[address].address}
              </Link>
              {miners[address].deadlines && (
                <WindowPoStStatus
                  head={head}
                  deadline={
                    miners[address].deadlines.nextDeadlines[47]
                  }
                />
              )}
              {miners[address].prevDeadlines && (
                <WindowPoStStatus
                  head={head}
                  deadline={
                    miners[address].prevDeadlines.nextDeadlines[47]
                  }
                />
              )}
            </div>
          ))}
    </section>
  )
}
