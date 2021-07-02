import React, {useState, useEffect, useContext} from 'react'
import { Link } from 'react-router-dom'
import asyncPool from 'tiny-async-pool'

import WindowPoSt from '../components/WindowPoSt'
import {DatastoreContext} from "../contexts/api";

export default function Full () {
  const { data } = useContext(DatastoreContext);

  if (!data) {
    return <section id='LookUp' className='container'>
      loading
    </section>
  }

  const { miners, head } = data;

  return (
    <section id='LookUp' className='container'>
      Listing WindowPoSt duties of the top 50 miners.
      {miners &&
        Object.keys(miners)
          .slice(0, 50)
          .map((d, i) => (
            <div key={i}>
              <Link to={`/miners/${miners[d].address}`}>
                {miners[d].address}
              </Link>
              <WindowPoSt
                minerId={miners[d].address}
                deadlines={miners[d].deadlines.nextDeadlines || []}
                head={head}
              />
            </div>
          ))}
    </section>
  )
}
