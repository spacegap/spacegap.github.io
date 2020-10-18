import React, { useRef, useEffect, useState } from 'react'
import { Runtime, Inspector } from '@observablehq/runtime'
import define from '../observable/index'

function Spacegap () {
  const ref = useRef()
  const [obs, setObs] = useState()

  const phi = 1.6
  const t = 3

  useEffect(() => {
    const main = new Runtime().module(define, name => {
      if (name === 'viewof regl')
        return Inspector.into(ref.current.querySelector('.viewof-regl'))()
      return ['drawMesh', 'setUniforms', 'buffers', 'camera'].includes(name)
    })
    main.redefine('phi', phi)
    main.redefine('time', t)
    setObs(main)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY > 100 ? 1 : window.scrollY / 100

      // const a = 0.2 + 0.13 * scrollY
      const a = 1.6 - 1.21 * scrollY
      const b = 3 - (3 - 0.43) * scrollY
      obs.redefine('phi', a)
      obs.redefine('time', b)
    }
    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [obs])

  return (
    <div className='FakeTransparencyForDSurfaces' ref={ref}>
      <div className='viewof-regl'></div>
    </div>
  )
}

export default Spacegap
