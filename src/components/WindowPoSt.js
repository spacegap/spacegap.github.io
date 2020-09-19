import React from 'react'

export default function WindowPoSt ({ deadlines, head }) {
  return (
    <div className='deadlines windowpost'>
      {deadlines &&
        deadlines.nextDeadlines.map((d, i) => (
          <div
            key={i}
            className={d.TotalSectors === 0 ? 'deadline opacity5' : 'deadline'}
          >
            <div className='out'>
              In {d.Close - head.Height}
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
          </div>
        ))}
    </div>
  )
}
