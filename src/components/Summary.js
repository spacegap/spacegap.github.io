import React from 'react'

export default function Summary ({ title, url, desc }) {
  return (
    <div className='summary col-sm'>
      <div className='summary-title'>
        {url ? <a href={url}>{title}</a> : <>{title}</>}
      </div>
      <div className='summary-desc'>{desc}</div>
    </div>
  )
}
