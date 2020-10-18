import React, { useState, useEffect } from 'react'
import { HashRouter as Router, Switch, Route, Link } from 'react-router-dom'

import Filecoin from './services/filecoin'

import Home from './views/Home'
import Market from './views/Market'
import Status from './views/Status'
import Full from './views/Full'
import Deadline from './views/Deadline'
import MinerInfo from './views/MinerInfo'
import AccountInfo from './views/AccountInfo'
import AddressInfo from './views/AddressInfo'
import TinySummary from './components/TinySummary'
import Gas from './views/Gas'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min'
import './App.scss'

function App () {
  console.log('reloaded')
  const [miners, setMiners] = useState()
  const [head, setHead] = useState()
  const [node, setNode] = useState('wss://node.glif.io/space07/lotus/rpc/v0')
  const [client, setFilClient] = useState(new Filecoin(node))
  const [spa, setSpa] = useState()
  const [actors, setActors] = useState()

  useEffect(() => {
    const reload = async () => {
      await setHead()
      await setFilClient(new Filecoin(node))
    }

    reload()
  }, [node])

  useEffect(() => {
    if (!head) return
    const fetchingEcon = async () => {
      const actors = await client.fetchGenesisActors(head)
      setActors(actors)
    }

    fetchingEcon()
  }, [client, head])

  // useEffect(() => {
  //   if (!head) return

  //   client.fetchPower(head).then(power => {
  //     setSpa(power)
  //   })
  // }, [head, client])

  useEffect(() => {
    let mounted = true

    client.getMiners().then(res => {
      if (!mounted) return
      setMiners(res)
    })

    const fetchingHead = async () => {
      client.fetchHead().then(fetched => {
        if (!mounted) return
        if (head && fetched.Height === head.Height) {
          console.log('   repeated block, skip')
          return
        }
        console.log('   new block', fetched.Height, head && head.Height)
        setHead(fetched)
      })
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
  }, [client, head])

  return (
    <Router>
      <div className='App'>
        <div className='container'>
          {/* <div className='row'>
            <div className='col'>
              Connected to Filecoin Network via&nbsp;
              <select onChange={e => setNode(e.target.value)} value={node}>
                <option value='wss://lotus.jimpick.com/spacerace_api/0/node/rpc/v0'>
                  Jim's node 0
                </option>
                <option value='wss://lotus.jimpick.com/spacerace_api/1/node/rpc/v0'>
                  Jim's node 1
                </option>
                <option value='ws://www.border.ninja:12342/node/rpc/v0'>
                  Border's node
                </option>
                <option value='wss://node.glif.io/space07/lotus/rpc/v0'>
                  Glif's node
                </option>
              </select>
            </div>
          </div> */}
          <TinySummary client={client} head={head} />
        </div>
        <header className='container-fluid'>
          <Link to='/'>
            <h1 id='logo' className='logo'>
              <span>spacegap</span>
            </h1>
          </Link>
        </header>
        <div className='container'>
          <Switch>
            <Route path='/miners/:minerId/deadlines/:deadlineId'>
              <Deadline client={client} miners={miners} head={head} />
            </Route>
            <Route path='/miners/:minerId'>
              <MinerInfo
                actors={actors}
                client={client}
                miners={miners}
                head={head}
              />
            </Route>
            <Route path='/address/:minerId'>
              <AddressInfo
                actors={actors}
                client={client}
                miners={miners}
                head={head}
              />
            </Route>
            <Route path='/accounts/:minerId'>
              <AccountInfo
                actors={actors}
                client={client}
                miners={miners}
                head={head}
              />
            </Route>
            <Route path='/full'>
              <Full client={client} miners={miners} />
            </Route>
            <Route path='/status'>
              <Status head={head} spa={spa} client={client} miners={miners} />
            </Route>
            <Route path='/gas'>
              <Gas client={client} head={head} />
            </Route>
            <Route path='/market'>
              <Market
                actors={actors}
                client={client}
                head={head}
                miners={miners}
              />
            </Route>
            <Route path='/'>
              <Home
                actors={actors}
                client={client}
                head={head}
                miners={miners}
              />
            </Route>
          </Switch>
        </div>
      </div>
    </Router>
  )
}

export default App
