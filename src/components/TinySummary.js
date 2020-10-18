import React, { useState, useEffect } from 'react'
import Drand from '../services/drand'

const d3 = require('d3')
const f = d3.format(',')

function getFilecoinExpectedHeight () {
  const filGenesis = new Date('2020-08-24 22:00:00Z').getTime()
  return Math.floor((Date.now() - filGenesis) / 1000 / 30)
}

export default function TinySummary ({ client, head }) {
  const [expected, setFilExpectedHeight] = useState(getFilecoinExpectedHeight())
  const [round, setRound] = useState()

  useEffect(() => {
    let mounted = true

    const fetchingHead = async () => {
      Drand().then(fetched => {
        if (!mounted) return
        if (round && fetched.current === round.current) {
          console.log('   repeated drand, skip')
          return
        }
        console.log('   new drand', fetched)
        setRound(fetched)
      })

      if (getFilecoinExpectedHeight() !== expected) {
        setFilExpectedHeight(getFilecoinExpectedHeight())
      }
    }

    fetchingHead()

    const interval = setInterval(() => {
      if (mounted) {
        fetchingHead()
      }
    }, 5000)

    return () => {
      mounted = false
      clearInterval(interval)
      console.log('removing interval')
    }
  }, [client, head, round])

  return (
    <div className='d-none d-md-block'>
      <div className='tiny-grid'>
        <div>
          Filecoin Status{' '}
          <span>
            {head && expected && head.Height < expected
              ? expected - head.Height === 1
                ? 'behind'
                : 'receiving'
              : 'ok'}
          </span>
        </div>

        <div className='tiny'>
          Current Tipset{' '}
          <a href={`https://filfox.info/en/tipset/${head && head.Height}`}>
            {head && f(head.Height)}
          </a>
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
