import React from 'react'
import { Link } from 'react-router-dom'

export default function Home ({ miners }) {
  return (
    <section id='home' className='container'>
      <div className='spacerace'>
        Top miners:
        {miners &&
          Object.keys(miners)
            .slice(0, 15)
            .map((d, i) => (
              <div key={i}>
                {i + 1}.{' '}
                <Link to={`/miners/${miners[d].address}`}>
                  {miners[d].address}
                </Link>
              </div>
            ))}
      </div>
      <div>
        See deadlines of <Link to='/full'>top 50 miners</Link> or click on
        individual miners or the <Link to='/status'>network status</Link>.
      </div>
      <div className="row">
        See <Link to='/gas'> here </Link> for a detailed gas analysis.
      </div>
    </section>
  )
}
