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
    <>
      <div class='countdown'>
        {expected && expected <= 148888 && (
          <div>{148888 - expected} blocks to mainnet</div>
        )}
        {expected && expected > 148888 && <div>We are LIVE!</div>}
      </div>
      <div className='tiny-grid'>
        {head && expected && (
          <div>
            Filecoin Status{' '}
            <span>
              {head.Height < expected
                ? expected - head.Height === 1
                  ? 'gathering blocks'
                  : 'catching up'
                : 'ok'}
            </span>
          </div>
        )}
        {head && (
          <div className='tiny'>
            Current Tipset{' '}
            <a href={`https://filfox.info/en/tipset/${head.Height}`}>
              {f(head.Height)}
            </a>
          </div>
        )}
        {expected && (
          <div className='tiny'>
            Expected Tipset{' '}
            <a href={`https://filfox.info/en/tipset/${expected}`}>
              {f(expected)}
            </a>
          </div>
        )}
        {round && (
          <>
            <div className='tiny'>
              Drand Status{' '}
              <span>
                {round.current < round.expected ? 'catching up' : 'ok'}
              </span>
            </div>
            <div className='tiny'>
              Current Drand{' '}
              <a href={`https://api.drand.sh/public/${round.current}`}>
                {f(round.current)}
              </a>
            </div>
            <div className='tiny'>
              Expected Drand{' '}
              <a href={`https://api.drand.sh/public/${round.expected}`}>
                {f(round.expected)}
              </a>
            </div>
          </>
        )}
      </div>
    </>
  )
}
