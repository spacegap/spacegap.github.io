import React, { useState, useEffect } from 'react'
import { useParams, withRouter } from 'react-router-dom'
import ReactTooltip from 'react-tooltip'
import WindowPoSt from '../components/WindowPoSt'
import Summary from '../components/Summary'
import asyncPool from 'tiny-async-pool'
import MinerBar from '../components/MinerBar'
const d3 = require('d3')
const f = d3.format(',')
const f2 = d3.format(',.1f')

function Deadline ({ miners, client, head }) {
  const { minerId, deadlineId } = useParams()
  // const [miner, setMiner] = useState({ id: minerId })
  const [minerDeadlines, setMinerDeadlines] = useState({})

  const deadlinesArray = () => {
    return Object.keys(minerDeadlines)
      .sort((a, b) => a - b)
      .map(k => [k, minerDeadlines[k]])
  }

  const deadlineArray = i => {
    return deadlinesArray()
      .map(([epoch, deadlines]) => {
        return deadlines.deadlines[i]
      })
      .flat()
  }

  useEffect(() => {
    if (!minerId || !head || !deadlineId) {
      return
    }

    let mounted = true

    const epochs = [...Array(28)].map((_, i) => ({
      height: head.Height - i * 2880,
      day: i
    }))

    try {
      asyncPool(10, epochs, async ({ day, height }) => {
        try {
          const prevHead = await client.fetchTipsetHead(height)
          if (!mounted) return
          const deadlines = await client.fetchDeadlines(minerId, prevHead)
          if (!mounted) return
          minerDeadlines[day] = deadlines
          return setMinerDeadlines({ ...minerDeadlines })
        } catch (e) {
          console.log('could not find', day, height)
          console.log(e)
        }
      })
    } catch (e) {
      console.log('trouble with ', e)
    }

    return () => {
      mounted = false
    }
  }, [client, head, minerId, deadlineId])

  return (
    <section className='container'>
      <MinerBar
        client={client}
        miners={miners}
        minerId={minerId}
        deadlineId={deadlineId}
      />
      <div className='section wpost'>
        <div className='grid'>
          {minerDeadlines && minerDeadlines[0] && (
            <Summary
              title={`${f2(
                (+minerDeadlines[0].deadlines[deadlineId].LiveSectors * 32) /
                  1024
              )} TiB`}
              desc={`${f(
                minerDeadlines[0].deadlines[deadlineId].LiveSectors
              )} Live Sectors`}
            />
          )}
          {minerDeadlines && minerDeadlines[0] && (
            <Summary
              title={`${f2(
                (+minerDeadlines[0].deadlines[deadlineId].TotalSectors * 32) /
                  1024
              )} TiB`}
              desc={`${f(
                minerDeadlines[0].deadlines[deadlineId].TotalSectors
              )} Total Sectors`}
            />
          )}
        </div>
      </div>
      <div className='section wpost'>
        <div className='row'>
          <div className='col section-title'>
            <h3>History</h3>
            <a data-tip data-for='wpost-desc'>
              (what is this?)
            </a>
            <ReactTooltip id='wpost-desc' effect='solid' place='top'>
              <span>
                List of 48 WindowPoSt submission deadlines ordered by due time
                (in epochs).
                <br />
                Bars represent ~8TB disks to be proven, white are healthy disks,
                red are faulty.
              </span>
            </ReactTooltip>
          </div>
        </div>
        <WindowPoSt
          link={d => `/miners/${minerId}/deadlines/${deadlineId}`}
          deadlines={deadlineArray(deadlineId)}
          head={head}
          out={({ d, head, i }) => (i === 0 ? `Today` : `${i}d ago`)}
        />
      </div>
    </section>
  )
}

export default withRouter(Deadline)
