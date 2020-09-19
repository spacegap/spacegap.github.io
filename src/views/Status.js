import React, { useState, useEffect } from 'react'
import asyncPool from 'tiny-async-pool'
import { Link } from 'react-router-dom'
import Summary from '../components/Summary'
import WindowPoStStatus from '../components/WindowPoStStatus'

const d3 = require('d3')
const f2 = d3.format(',.2f')
const bytesToPiB = 1024 * 1024 * 1024 * 1024 * 1024

export default function Status ({ client, spa, head, miners }) {
  const [minersDeadlines, setMinersDeadlines] = useState({})
  const [minersDeadlines2880, setMinersDeadlines2880] = useState({})
  const [prev60, setPrev60] = useState()
  const [prev120, setPrev120] = useState()

  useEffect(() => {
    if (!head) return

    const fetchingPrevious = async () => {
      const getPrev = async diff => {
        const prevHead = await client.fetchTipsetHead(head.Height - diff)
        const prevSpa = await client.fetchPower(prevHead)
        return prevSpa
      }

      const [prev60, prev120] = await Promise.all([getPrev(60), getPrev(120)])

      await setPrev60(prev60)
      await setPrev120(prev120)
    }
    fetchingPrevious()
  }, [head])

  useEffect(() => {
    let mounted = true
    if (!head) return

    const minersList = Object.keys(miners)
      .slice(0, 40)
      .map(d => miners[d].address)
    asyncPool(5, minersList, async minerId => {
      if (!mounted) return
      const deadlines = await client.fetchDeadlines(minerId, head)
      if (!mounted) return
      const prevHead = await client.fetchTipsetHead(head.Height - 2880)
      if (!mounted) return
      const deadlines2880 = await client.fetchDeadlines(minerId, prevHead)
      if (!mounted) return
      minersDeadlines[minerId] = deadlines
      minersDeadlines2880[minerId] = deadlines2880
      await setMinersDeadlines({ ...minersDeadlines })
      return await setMinersDeadlines2880({ ...minersDeadlines2880 })
    })

    return () => {
      mounted = false
    }
  }, [client, head, miners])

  return (
    <section className='container'>
      <div id='deposits' className='section'>
        <div className='grid'>
          {spa && (
            <>
              <Summary
                title={f2(parseInt(spa.TotalQualityAdjPower) / bytesToPiB)}
                desc='Total QA Power'
              />
            </>
          )}
          {prev60 && spa && (
            <>
              <Summary
                title={f2(
                  parseInt(
                    spa.TotalQualityAdjPower - prev60.TotalQualityAdjPower
                  ) / bytesToPiB
                )}
                desc='60 Epochs delta'
              />
            </>
          )}
          {prev120 && spa && (
            <>
              <Summary
                title={f2(
                  parseInt(
                    spa.TotalQualityAdjPower - prev120.TotalQualityAdjPower
                  ) / bytesToPiB
                )}
                desc='120 Epochs delta'
              />
            </>
          )}
        </div>
      </div>
      Listing WindowPoSt duties of the top 50 miners.
      {miners &&
        Object.keys(miners)
          .slice(0, 40)
          .map((d, i) => (
            <div className='flex' key={i}>
              <Link to={`/miners/${miners[d].address}`}>
                {miners[d].address}
              </Link>
              {minersDeadlines && minersDeadlines[miners[d].address] && (
                <WindowPoStStatus
                  head={head}
                  deadline={
                    minersDeadlines[miners[d].address].nextDeadlines[47]
                  }
                />
              )}
              {minersDeadlines2880 &&
                minersDeadlines2880[miners[d].address] && (
                  <WindowPoStStatus
                    head={head}
                    deadline={
                      minersDeadlines2880[miners[d].address].nextDeadlines[47]
                    }
                  />
                )}
            </div>
          ))}
    </section>
  )
}
