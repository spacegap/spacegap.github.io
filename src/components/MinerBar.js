import React from 'react'
import { Link } from 'react-router-dom'
import {emoji} from "../emoji";

export default function MinerBar (
  {
    minerId,
    deadlineId,
    sectorId,
    type,
    miner,
    sector
  }) {
  return (
    <div className='section minerbar'>
      <div className='minerId'>
        {!type && (
          <>
            <Link to={`/address/${minerId}`}>{minerId}</Link>
            <span className='tinyarrow'>
              <a href={`https://filfox.info/en/address/${minerId}`}>↗</a>
            </span>
            <span className='rekt rekt-miner'>MINER</span>
            {miner && miner.deposits && +miner.deposits.feeDebt !== 0 && (
              <span className='rekt'>DEBT</span>
            )}
          </>
        )}
        {type === 'sector' && (
          <>
            <Link to={`/miners/${minerId}/sectors/${sectorId}`}>
              Sector {sectorId}
            </Link>
            {sector === 'faulty' && <span className='rekt'>FAULTY</span>}
            {sector === 'recovering' && (
              <span className='rekt rekt-green'>RECOVERING</span>
            )}
            {sector === 'terminated' && (
              <span className='rekt rekt-black'>TERMINATED</span>
            )}
          </>
        )}
        {type === 'deadline' && (
          <>
            <Link to={`/miners/${minerId}/deadlines/${deadlineId}`}>
              Deadline {deadlineId}
            </Link>
          </>
        )}
      </div>
      {type && (
        <>
          <div className='backto'>
            <Link to={`/miners/${minerId}`}>
              See address
              <span className='bolder'> {minerId}</span>
            </Link>
            {type === 'sector' && deadlineId !== undefined && (
              <Link to={`/miners/${minerId}/deadlines/${deadlineId}`}>
                See deadline
                <span className='bolder'> {deadlineId}</span>
              </Link>
            )}
          </div>
        </>
      )}
      {!type && (
        <div>
          {miner && (miner.tag?.name || miner.country) && (
            <span className='miner-name'>
              {miner.tag.name}
              {miner && miner.country && `  ${emoji[miner.country].emoji}`}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
