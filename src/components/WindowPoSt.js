import React from 'react'
import { Link } from 'react-router-dom'

export default function WindowPoSt ({ minerId, deadlines, head, link, out }) {
  if (!link) {
    link = d => `/miners/${minerId}/deadlines/${d.Index}`
  }
  if (!out) {
    out = ({ d, head, i }) => `In ${d.Close - head.Height}`
  }
  if (!head || !deadlines) {
    return <></>
  }
  return (
    <div className='deadlines windowpost'>
      {deadlines &&
        deadlines.map((d, i) => (
          <div
            key={i}
            className={d.TotalSectors === 0 ? 'deadline opacity5' : 'deadline'}
          >
            <Link to={link(d)}>
              <div className='out'>
                {out({ d, head, i })}
                {/* <span className="epochs">epochs</span> */}
              </div>
              <div className='hddWrapper'>
                <div className='in'>
                  {Math.round((d.TotalSectors * 32) / 1024)} TiB
                </div>
                <div className='hdds'>
                  {[
                    ...Array(
                      Math.ceil(
                        Math.round(
                          (d.TotalSectors * 32) / 1024 -
                            +d.FaultyPower.Raw / (1024 * 1024 * 1024 * 1024)
                        ) / 8
                      )
                    )
                  ].map((v, i) => (
                    <div key={i} className='hdd'>
                      {' '}
                    </div>
                  ))}
                  {/* {Math.round(+d.FaultyPower.Raw / (1024 * 1024 * 1024 * 1024))} */}
                  {[
                    ...Array(
                      Math.ceil(
                        Math.round(
                          +d.FaultyPower.Raw / (1024 * 1024 * 1024 * 1024)
                        ) / 8
                      )
                    )
                  ].map((v, i) => (
                    <div key={i} className='hdd faulty'>
                      {' '}
                    </div>
                  ))}
                </div>
              </div>
              {/* <div className="partitions">
                            {
                            [...Array(Math.ceil(d.TotalSectors/2349))].map(v =>
                            <div className='partition'></div>
                            )
                            }
                            </div> */}
            </Link>
          </div>
        ))}
    </div>
  )
}
