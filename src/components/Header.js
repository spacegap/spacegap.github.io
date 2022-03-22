import React from 'react'
import { Link } from 'react-router-dom'

export function Header() {
  return (
    <header>
      <div className='navigation-container'>
        <div className='container'>
          <div className='navigation-links'>
          <Link to='/' className='navigation-link'>Home</Link>
            <Link to='/gas' className='navigation-link'>Gas</Link>
            <Link to='/market' className='navigation-link'>Market</Link>
            <Link to='/about' className='navigation-link'>About</Link>
          </div>
        </div>
      </div>
      <Link to='/'>
        <h1 id='logo' className='logo'>
          <span>spacegap</span>
        </h1>
      </Link>
    </header>
  )
}