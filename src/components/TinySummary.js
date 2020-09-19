import React from 'react'

const d3 = require('d3')
const f = d3.format(',')

export default function TinySummary ({ head, expected, round }) {
  return (
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
        <div>
          Expected Tipset{' '}
          <a href={`https://filfox.info/en/tipset/${expected}`}>
            {f(expected)}
          </a>
        </div>
      )}
      {round && (
        <>
          <div>
            Drand Status{' '}
            <span>{round.current < round.expected ? 'catching up' : 'ok'}</span>
          </div>
          <div>
            Current Drand{' '}
            <a href={`https://api.drand.sh/public/${round.current}`}>
              {f(round.current)}
            </a>
          </div>
          <div>
            Expected Drand{' '}
            <a href={`https://api.drand.sh/public/${round.expected}`}>
              {f(round.expected)}
            </a>
          </div>
        </>
      )}
    </div>
  )
}
