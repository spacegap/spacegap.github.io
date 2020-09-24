import React from 'react'
import { Link } from 'react-router-dom'

export default function MinerBar ({ client, miners, minerId, deadlineId }) {
  return (
    <div className='section minerbar'>
      <div class='minerId'>
        {!deadlineId && (
          <>
            <Link to={`/miners/${minerId}`}>{minerId}</Link>
            <span className='tinyarrow'>
              <a href={`https://filfox.info/en/address/${minerId}`}>↗</a>
            </span>
          </>
        )}
        {deadlineId && (
          <>
            <Link to={`/miners/${minerId}/deadlines/${deadlineId}`}>
              Deadline {deadlineId}
            </Link>
          </>
        )}
      </div>
      {deadlineId && (
        <>
          <div class='backto'>
            <Link to={`/miners/${minerId}`}>
              See miner
              <span class='bolder'> {minerId}</span>
            </Link>
          </div>
        </>
      )}
      {!deadlineId && (
        <div>
          {miners && miners[minerId] && miners[minerId].tag && (
            <span className='miner-name'>
              {miners[minerId].tag.en}

              {miners && miners[minerId].location && (
                <span> {miners[minerId].location.flagEmoji}</span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
