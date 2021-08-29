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
import { About } from './views/About'
import Sector from './views/Sector'
import Spacegap from './components/Spacegap'
import { Header } from './components/Header'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min'
import './App.scss'
import {DatastoreProvider} from "./contexts/api";

function App () {
  const [client, setFilClient] = useState()

  useEffect(() => {
    const reload = async () => {
      await setFilClient(new Filecoin('wss://node.glif.io/space07/lotus/rpc/v0'))
    }

    reload()
  }, [])

  return (
    <DatastoreProvider>
      <Router>
        <div className='App'>
          <div>
            <TinySummary client={client} />
          </div>
          <Header />
          <div className='container'>
            <Spacegap />
            <Switch>
              <Route path='/about'>
                <About />
              </Route>
              <Route path='/miners/:minerId/deadlines/:deadlineId'>
                <Deadline client={client} />
              </Route>
              {/*<Route path='/miners/:minerId/sectors/:sectorId'>*/}
              {/*  <Sector*/}
              {/*    actors={actors}*/}
              {/*    client={client}*/}
              {/*    miners={miners}*/}
              {/*    head={head}*/}
              {/*  />*/}
              {/*</Route>*/}
              <Route path='/miners/:minerId'>
                <MinerInfo />
              </Route>
              <Route path='/address/:minerId'>
                <AddressInfo client={client} />
              </Route>
              <Route path='/accounts/:minerId'>
                <AccountInfo />
              </Route>
              <Route path='/full'>
                <Full />
              </Route>
              <Route path='/status'>
                <Status />
              </Route>
              <Route path='/gas'>
                <Gas />
              </Route>
              <Route path='/market'>
                <Market />
              </Route>
              <Route path='/'>
                <Home />
              </Route>
            </Switch>
          </div>
        </div>
      </Router>
    </DatastoreProvider>
  )
}

export default App
