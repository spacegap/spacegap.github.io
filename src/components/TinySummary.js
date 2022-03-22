import React, { useState, useEffect, useContext, useMemo } from 'react'
import Drand from '../services/drand'
import { DatastoreContext } from "../contexts/api";

const d3 = require('d3')
const f = d3.format(',')

function getFilecoinExpectedHeight() {
  const filGenesis = new Date('2020-08-24 22:00:00Z').getTime()
  return Math.floor((Date.now() - filGenesis) / 1000 / 30)
}

export default function TinySummary() {
  const [expected, setFilExpectedHeight] = useState(getFilecoinExpectedHeight())
  const [round, setRound] = useState()
  const { data } = useContext(DatastoreContext)
  const { head } = data;
  const status = useMemo(() => {
    if (head && head.Height < expected) {
      return (expected - head.Height === 1) ? 'behind' : 'receiving';
    } else {
      return 'ok';
    }
  }, [expected, head])

  useEffect(() => {
    const fetchingHead = async () => {
      Drand().then(fetched => {
        if (round && fetched.current === round.current) {
          return
        }
        setRound(fetched)
      })

      if (getFilecoinExpectedHeight() !== expected) {
        setFilExpectedHeight(getFilecoinExpectedHeight())
      }
    }

    fetchingHead()

    const interval = setInterval(() => {
      fetchingHead()
    }, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <div className='d-none d-md-block'>
      <div className='status-container'>
        <div className=' status-items'>
          <div className='tiny'>
            <span>Filecoin Status</span>
            <span>{status}</span>
          </div>

          <div className='tiny'>
            <span>Current Tipset</span>
            {head ? (
              <a href={`https://filfox.info/en/tipset/${head.Height}`}>{f(head.Height)}</a>
            ) : (
              'loading'
            )}
          </div>

          <div className='tiny'>
            <span>Expected Tipset</span>
            <a href={`https://filfox.info/en/tipset/${expected}`}>
              {f(expected)}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
