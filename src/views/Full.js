import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import asyncPool from 'tiny-async-pool'

import WindowPoSt from '../components/WindowPoSt'

export default function Full ({ miners, client }) {
  const [minersDeadlines, setMinersDeadlines] = useState({})
  const [head, setHead] = useState()

  useEffect(() => {
    const fetchingHead = async () => {
      const fetched = await client.fetchHead()
      setHead(fetched)
    }
    fetchingHead()
  }, [client])

  useEffect(() => {
    let mounted = true
    if (!head) return

    const minersList = Object.keys(miners)
      .slice(0, 50)
      .map(d => miners[d].address)
    asyncPool(5, minersList, async minerId => {
      if (!mounted) return
      const deadlines = await client.fetchDeadlines(minerId, head)
      if (!mounted) return
      minersDeadlines[minerId] = deadlines
      return await setMinersDeadlines({ ...minersDeadlines })
    })

    return () => {
      mounted = false
    }
  }, [client, head, miners])

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
                deadlines={minersDeadlines[miners[d].address]}
                head={head}
              />
            </div>
          ))}
    </section>
  )
}
