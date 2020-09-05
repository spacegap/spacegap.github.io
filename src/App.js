import React, { useState, useEffect } from 'react'
import {
    BrowserRouter as Router,
    Switch,
    Route,
    Link,
    useRouteMatch,
    useParams
} from "react-router-dom";
import {
    fetchHead,
    fetchSectors,
    fetchDeadlines,
    fetchPreCommittedSectors,
    fetchDeposits
} from './services/filecoin'
import Blockies from 'blockies-identicon'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.scss'

function getJSONFromHistory (name) {
    const prev = window.localStorage.getItem(name)
    return prev && JSON.parse(prev)
}

function App () {
    const [miner, setMiner] = useState(getJSONFromHistory('miner'))
    const [hash, setHash] = useState(window.localStorage.getItem('hash'))
    const [hashInput, setHashInput] = useState(window.localStorage.getItem('hash') || '')
    const [head, setHead] = useState(getJSONFromHistory('head'))

    // Fetch head
    useEffect(() => {
        const fetchingHead = async () => {
            const fetched = await fetchHead()
            window.localStorage.setItem('head', JSON.stringify(fetched))
            setHead(fetched)
        }
        fetchingHead()
        setInterval(() => fetchingHead(), 30000)
    }, [])

    // On new (hash or head): fetch miner
    useEffect(() => {
        if (!hash || !head) return;

        let mounted = true
        setMiner({...miner})

        fetchDeadlines(hash, head).then(deadlines => {
            if (mounted) {
                miner.deadlines = deadlines
                setMiner({...miner})
                window.localStorage.setItem('miner', JSON.stringify(miner))
            }
        })

        fetchDeposits(hash, head).then(deposits => {
            if (mounted) {
                miner.deposits = deposits
                setMiner({...miner})
                window.localStorage.setItem('miner', JSON.stringify(miner))
            }
        })

        fetchPreCommittedSectors(hash, head).then(preCommitDeadlines => {
            if (mounted) {
                miner.preCommitDeadlines = preCommitDeadlines
                setMiner({...miner})
                window.localStorage.setItem('miner', JSON.stringify(miner))
            }
        })

        fetchSectors(hash, head).then(sectors => {
            if (mounted) {
                miner.sectors = sectors
                setMiner({...miner})
                window.localStorage.setItem('miner', JSON.stringify(miner))
            }
        })

        return () => { mounted = false }
    }, [head, hash])

    useEffect(() => {
        console.log('spacegap', 'miner has changed', miner)
    }, [miner])

    useEffect(() => {
        console.log('spacegap', 'hash has changed', hash)
    }, [hash])

    const handleLookup = (e) => {
        e.preventDefault()
        setHash(hashInput)
        window.localStorage.setItem('hash', hashInput)
        setMiner({id: hashInput})
    }


    return (
        <Router>
            <div className='App'>
                <header className='container-fluid'>
                    <h1>spacegap</h1>
                </header>
                <Switch>
                    <Route path='/'>
                        <section id='LookUp' className='container'>
                            <form onSubmit={handleLookup}>
                                <input
                                    type='text'
                                    value={hashInput}
                                    onChange={e => setHashInput(e.target.value)}
                                />
                                <input type="submit" value="Look"/>
                            </form>
                        </section>
                    </Route>
                    <Route path='/miners/:minerId'>
                        <section className='container'>
                            <Miner miner={miner} head={head} />
                        </section>
                    </Route>
                </Switch>
            </div>
        </Router>
    )
}

function MinerSection () {

}

const PoSt = ({ epoch, posted, skipped }) => {
    return (
        <div>
            Epoch {epoch}: {posted ? 'posted' : 'missed'}
        </div>
    )
}

const Circle = ({ state }) => {
    return <div className={`circle ${state}`}>{state}</div>
}

const Miner = ({ miner, head }) => {
    const canvasRef = React.useRef(null)
    const [context, setContext] = React.useState(null)

    useEffect(() => {
        if (canvasRef.current) {
            Blockies.render({seed: miner.id}, canvasRef.current)

            const renderCtx = canvasRef.current.getContext('2d');

            if (renderCtx) {
                setContext(renderCtx);
            }
        }
    }, [context, miner]);

    if (!miner) {
        return <></>
    }

    return (
        <div>
            <span><canvas ref={canvasRef}></canvas></span>
            <h1>{miner.id}</h1>

            <div>
                <div className='grid'>
                    {
                        miner.deposits &&
                        <div className="summary col-sm">
                            <div className="summary-title">
                                {miner.deposits.collateral || 0} FIL
                            </div>
                            <div className="summary-desc">
                                Collateral
                            </div>
                        </div>
                    }
                    {
                        miner.deposits &&
                        <div className="summary col-sm">
                            <div className="summary-title">
                                {miner.deposits.available || 0} FIL
                            </div>
                            <div className="summary-desc">
                                Available
                            </div>
                        </div>
                    }
                    {
                        miner.deposits &&
                        <div className="summary col-sm">
                            <div className="summary-title">
                                {miner.deposits.locked || 0} FIL
                            </div>
                            <div className="summary-desc">
                                Locked
                            </div>
                        </div>
                    }
                </div>
            </div>

            <div>
                <div className='row'>
                    <div className='col'>
                        <h3>Sectors</h3>
                    </div>
                </div>
                <div className='row'>
                    {
                        miner.sectors &&
                        <div className='col'>
                            <h2>{miner.sectors.sectorsCount}</h2>
                            Sectors
                        </div>
                    }
                </div>
            </div>

            <div>
                <div className='row'>
                    <div className='col'>
                        <h3>Upcoming duties</h3>
                    </div>
                </div>
                <div className="row deadlines">
                    {
                        miner.deadlines && miner.deadlines.nextDeadlines.map(d =>
                            <div className='deadline col-3'>
                                {d.TotalSectors} sectors ({Math.round(d.TotalSectors * 32 /1024)}TiB) in {d.Close - head.Height}
                                {
                                    [...Array(Math.ceil(d.TotalSectors/2349))].map(v =>
                                        <div className='partition'></div>
                                    )
                                }</div>
                        )
                    }

                </div>
                <div className='row'>
                    <div className='col'>
                        {
                            miner.deadlines &&
                            <div className='row'>
                                {
                                    miner.deadlines.nextDeadlines.slice(0,10).map(d =>
                                        <div className='container'>
                                            <div className='row'>
                                                <div className='col-2'>
                                                    In {(d.Close - head.Height)} epochs
                                                </div>
                                                <div className='col'>
                                                    WindowPoSt in  epochs {(d.Close - head.Height)*30/60/60}h
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                            </div>
                        }
                    </div>
                    <div className='col'>
                        {
                            miner.preCommitDeadlines &&
                            <div className='row'>
                                {
                                    miner.preCommitDeadlines.slice(0,10).map(d =>
                                        <div className='container'>
                                            <div className='row'>
                                                <div className='col-2'>
                                                    in {(d.Expiry - head.Height)} epochs
                                                </div>
                                                <div className='col'>
                                                    {d.Sectors.length} Prove Commits  {(d.Expiry - head.Height)*30/60/60}h
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                            </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
