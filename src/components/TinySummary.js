import React, {useState, useEffect, useContext} from 'react'
import Drand from '../services/drand'
import {DatastoreContext} from "../contexts/api";

const d3 = require('d3')
const f = d3.format(',')

function getFilecoinExpectedHeight () {
  const filGenesis = new Date('2020-08-24 22:00:00Z').getTime()
  return Math.floor((Date.now() - filGenesis) / 1000 / 30)
}

export default function TinySummary () {
  const [expected, setFilExpectedHeight] = useState(getFilecoinExpectedHeight())
  const [round, setRound] = useState()
  const {data} = useContext(DatastoreContext)

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
      <div className='tiny-grid'>
        <div>
          Filecoin Status{' '}
          <span>
            {data && data.height < expected
              ? expected - data.height === 1
                ? 'behind'
                : 'receiving'
              : 'ok'}
          </span>
        </div>

        <div className='tiny'>
          Current Tipset{' '}
          {data && data.head ? (
            <a href={`https://filfox.info/en/tipset/${data.head.Height}`}>
              {f(data.head.Height)}
            </a>
          ) : (
            <p>loading</p>
          )}
        </div>

        <div className='tiny'>
          Expected Tipset{' '}
          <a href={`https://filfox.info/en/tipset/${expected}`}>
            {f(expected)}
          </a>
        </div>

        <div className='tiny'>
          Drand Status{' '}
          <span>
            {round && round.current < round.expected ? 'catching up' : 'ok'}
          </span>
        </div>
        <div className='tiny'>
          Current Drand{' '}
          <a href={`https://api.drand.sh/public/${round && round.current}`}>
            {f(round && round.current)}
          </a>
        </div>
        <div className='tiny'>
          Expected Drand{' '}
          <a href={`https://api.drand.sh/public/${round && round.expected}`}>
            {f(round && round.expected)}
          </a>
        </div>
      </div>
    </div>
  )
}
